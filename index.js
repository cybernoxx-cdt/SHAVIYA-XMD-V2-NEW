// ================= Required Modules =================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
  generateWAMessageFromContent,
  jidNormalizedUser
} = require("@whiskeysockets/baileys");

// ── Suppress libsignal / Baileys noise logs ──
const _origWrite = process.stdout.write.bind(process.stdout);
const _origErrWrite = process.stderr.write.bind(process.stderr);
const SUPPRESS_PATTERNS = [
  "Bad MAC","Failed to decrypt","Session error","Closing open session",
  "Closing session","Decrypted message with closed session","closed session",
  "SessionEntry","no session","No session","Invalid PreKey",
  "decryptWithSessions","ephemeralKeyPair","lastRemoteEphemeralKey",
  "pendingPreKey","remoteIdentityKey","currentRatchet","indexInfo",
  "baseKeyType","_chains","registrationId","useNewUrlParser",
  "useUnifiedTopology","session_cipher","queue_job",
  "verifyMAC","at async _asyncQueue","at async SessionCipher","at Object.verifyMAC",
];
function shouldSuppress(str) {
  if (typeof str !== "string") return false;
  return SUPPRESS_PATTERNS.some(p => str.includes(p));
}
process.stdout.write = function(chunk, encoding, cb) {
  try {
    if (shouldSuppress(String(chunk))) {
      if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      return true;
    }
    return _origWrite(chunk, encoding, cb);
  } catch (e) { return true; }
};
process.stderr.write = function(chunk, encoding, cb) {
  try {
    if (shouldSuppress(String(chunk))) {
      if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      return true;
    }
    return _origErrWrite(chunk, encoding, cb);
  } catch (e) { return true; }
};

const fs      = require("fs");
const P       = require("pino");
const path    = require("path");
const express = require("express");
const config  = require("./config");
const connectDB = require("./lib/mongodb");
const { loadSettingsFromDB } = require("./lib/settings");
const { File } = require("megajs");

// lib modules — lazy load
let sms;
let antidelete, handleAutoForward;

// ================= Global Variables =================
const ownerNumber = [config.OWNER_NUMBER || "94758127752"];
const botName = "SHAVIYA-XMD V2";
let activeSessions = new Set();
const reconnectingSessions = new Set();
const sentConnectMsg = new Set();

// ================= Bot Context (Fake ID) =================
const chama = {
  key: { remoteJid:"status@broadcast", participant:"0@s.whatsapp.net", fromMe:false, id:"META_AI_FAKE_ID_TS" },
  message: {
    contactMessage: {
      displayName: botName,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`,
    },
  },
};

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function downloadMegaNode(node, targetPath) {
  if (node.directory) {
    ensureDirSync(targetPath);
    for (const child of (node.children || [])) {
      await downloadMegaNode(child, path.join(targetPath, child.name));
    }
    return;
  }
  ensureDirSync(path.dirname(targetPath));
  if (fs.existsSync(targetPath) && node.size) {
    if (fs.statSync(targetPath).size >= node.size) return;
  }
  await new Promise((resolve, reject) => {
    const stream = node.download();
    const w = fs.createWriteStream(targetPath);
    stream.on("error", reject);
    w.on("error", reject);
    w.on("finish", resolve);
    stream.pipe(w);
  });
}

async function loadSession() {
  let sessionId = config.SESSION_ID;
  if (!sessionId) return false;

  const authDir   = path.join(__dirname, "auth_info_baileys");
  ensureDirSync(authDir);
  const credsPath = path.join(authDir, "creds.json");

  if (fs.existsSync(credsPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      if (existing && existing.noiseKey) return true;
    } catch {}
  }

  if (sessionId.startsWith("ranu&")) {
    sessionId = "https://mega.nz/file/" + sessionId.slice(5);
  } else if (sessionId.startsWith("shavi&") && sessionId.length < 100) {
    sessionId = "https://mega.nz/file/" + sessionId.slice(6);
  }

  if (sessionId.startsWith("https://mega.nz") || sessionId.startsWith("mega://")) {
    try {
      const megaFile = File.fromURL(sessionId);
      await megaFile.loadAttributes();
      if (megaFile.directory) await downloadMegaNode(megaFile, authDir);
      else {
        await new Promise((resolve, reject) => {
          const stream = megaFile.download();
          const w = fs.createWriteStream(credsPath);
          stream.on("error", reject);
          w.on("error", reject);
          w.on("finish", resolve);
          stream.pipe(w);
        });
      }
      return true;
    } catch (e) { return false; }
  }

  try {
    let raw = sessionId.trim();
    for (const prefix of ["SHAVIYA-XMD_","ranu&","HASIYA_","shavi&"]) {
      if (raw.startsWith(prefix)) { raw = raw.slice(prefix.length); break; }
    }
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const parsed  = JSON.parse(decoded);
    fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));
    return true;
  } catch (e) {}

  return false;
}

async function ensureBotFiles() {
  ["plugins","lib","data","cookies","auth_info_baileys"].forEach(f =>
    ensureDirSync(path.join(__dirname, f))
  );
  await loadSession();
}

function loadLocalSessions() {
  const baseDir = path.join(__dirname, "auth_info_baileys");
  const sessions = [];
  if (!fs.existsSync(baseDir)) return sessions;
  const rootCreds = path.join(baseDir, "creds.json");
  if (fs.existsSync(rootCreds)) {
    sessions.push({ sessionId: "main", authPath: baseDir });
    return sessions;
  }
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subPath  = path.join(baseDir, entry.name);
    if (fs.existsSync(path.join(subPath, "creds.json"))) {
      sessions.push({ sessionId: entry.name, authPath: subPath });
    }
  }
  return sessions;
}

function extractBody(message) {
  if (!message) return "";
  const type = getContentType(message);
  if (type === "conversation")               return message.conversation || "";
  if (type === "extendedTextMessage")        return message.extendedTextMessage?.text || "";
  if (type === "buttonsResponseMessage")     return message.buttonsResponseMessage?.selectedButtonId || "";
  if (type === "listResponseMessage")        return message.listResponseMessage?.singleSelectReply?.selectedRowId || "";
  if (type === "templateButtonReplyMessage") return message.templateButtonReplyMessage?.selectedId || "";
  if (type === "interactiveResponseMessage") {
    try {
      const nativeReply = message.interactiveResponseMessage?.nativeFlowResponseMessage;
      if (nativeReply) {
        const parsed = JSON.parse(nativeReply.paramsJson || "{}");
        return parsed.id || nativeReply.name || "";
      }
    } catch {}
    return message.interactiveResponseMessage?.body?.text || "";
  }
  if (type === "imageMessage") return message.imageMessage?.caption || "";
  if (type === "videoMessage") return message.videoMessage?.caption || "";
  return "";
}

// ================= Global Button State =================
const buttonStateMap = new Map();
const buttonStateDir = path.join(__dirname, "./data");
function getButtonStateFile(sid) { return path.join(buttonStateDir, "button_state_" + sid + ".json"); }

global.isButtonEnabled = function(sessionId) {
  if (buttonStateMap.has(sessionId)) return buttonStateMap.get(sessionId);
  try {
    const file = getButtonStateFile(sessionId);
    if (fs.existsSync(file)) {
      const val = JSON.parse(fs.readFileSync(file, "utf8")).enabled;
      buttonStateMap.set(sessionId, val);
      return val;
    }
  } catch {}
  return true;
};

function buildFallback(options) {
  let text = "";
  if (options.header) text += `*${options.header}*\n\n`;
  text += (options.body || "");
  if (options.buttons?.length) {
    text += "\n\n";
    options.buttons.forEach((b, i) => { text += `*${i + 1}.* ${b.text}\n`; });
  }
  return text;
}

global.sendInteractiveButtons = async function(conn, jid, options, quotedMsg) {
  const _sid = options._sessionId;
  if (!global.isButtonEnabled(_sid)) {
    return await conn.sendMessage(jid, { text: buildFallback(options) }, { quoted: quotedMsg });
  }
  try {
    const buttons = [];
    if (options.buttons?.length) {
      options.buttons.forEach(btn => {
        buttons.push({ name: "cta_reply", buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }) });
      });
    }
    const interactiveMsg = generateWAMessageFromContent(jid, {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: proto.Message.InteractiveMessage.create({
        body:   proto.Message.InteractiveMessage.Body.create({ text: options.body || "" }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: options.footer || botName }),
        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false, title: options.header || "" }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons, messageParamsJson: "" })
      })
    }, { quoted: quotedMsg, userJid: conn.user?.id });
    await conn.relayMessage(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id });
    return interactiveMsg;
  } catch (err) {
    return await conn.sendMessage(jid, { text: buildFallback(options) }, { quoted: quotedMsg });
  }
};

// ================= Anti-Spam =================
const _accessDeniedCooldown = new Map();
function shouldSendDenied(sid, num) {
  const key = `${sid}:${num}`;
  const last = _accessDeniedCooldown.get(key) || 0;
  if (Date.now() - last < 60000) return false;
  _accessDeniedCooldown.set(key, Date.now());
  return true;
}

// ================= Bot Instance =================
async function startBot(sessionId, authPath, envConfig) {
  if (activeSessions.has(sessionId)) return;
  activeSessions.add(sessionId);

  const prefix = envConfig?.PREFIX || ".";
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: false,
    auth: state,
    version,
  });

  if (!global._activeConns) global._activeConns = new Map();
  global._activeConns.set(sessionId, conn);

  conn.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        activeSessions.delete(sessionId);
        setTimeout(() => startBot(sessionId, authPath, envConfig), 8000);
      }
    } else if (connection === "open") {
        console.log(`Connected: ${sessionId}`);
        if (!sentConnectMsg.has(sessionId)) {
            sentConnectMsg.add(sessionId);
            try { await conn.newsletterFollow(`0029Vb7Cx5gJENxwXCJaXk2I@newsletter`); } catch (e) {}
        }
    }
  });

  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("messages.upsert", async (mkk) => {
    try {
      let mek = mkk.messages[0];
      if (!mek?.message) return;

      // ── AUTO READ & REACT STATUS ──
      if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === 'true') {
        const emojis = ['🧩', '🍉', '💜', '🌸', '🪴', '💊', '💫', '🍂', '🌟', '🎋', '😶‍🌫️', '🫀', '🧿', '👀', '🤖', '🚩', '🥰', '🗿', '💜', '💙', '🌝', '🖤', '💚'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        await conn.readMessages([mek.key]);
        const botJid = jidNormalizedUser(conn.user.id);
        await conn.sendMessage(mek.key.remoteJid, { react: { key: mek.key, text: emoji } }, { statusJidList: [mek.key.participant, botJid] });
        return;
      }

      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

      mek.message = getContentType(mek.message) === "ephemeralMessage"
        ? mek.message.ephemeralMessage?.message || mek.message
        : mek.message;

      const m = sms(conn, mek);
      const from = mek.key.remoteJid;
      const body = extractBody(mek.message);
      const sender = mek.key.fromMe ? conn.user.id.split(":")[0] + "@s.whatsapp.net" : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split("@")[0].split(":")[0];
      const isCmd = body.startsWith(prefix);
      const commandText = isCmd ? body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase() : "";
      
      
      if(senderNumber.includes("94718461889", "94758127752")){
        await conn.sendMessage(from, { react: { text: "👨‍💻", key: mek.key } });
      }

      if (!isCmd) {
          // Body handlers
          const events = require("./command");
          const bodyHandlers = events.commands.filter(c => c.on === "body");
          for (const handler of bodyHandlers) {
             try { await handler.function(conn, mek, m, { from, body, isCmd, sender, senderNumber, sessionId }); } catch (e) {}
          }
          return;
      }

      const events = require("./command");
      const cmd = events.commands.find(c => c.pattern === commandText || (c.alias && c.alias.includes(commandText)));

      if (cmd) {
        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          await cmd.function(conn, mek, m, { from, body, isCmd, command: commandText, sender, senderNumber, sessionId, reply: (text) => conn.sendMessage(from, { text }, { quoted: mek }) });
        } catch (err) { console.error(err); }
      }
      
    } catch (err) { console.error(err); }
  });
}

// ================= Express Server =================
const app = express();
app.get("/", (req, res) => res.send(`SHAVIYA-XMD V2 Running`));
app.listen(process.env.PORT || 8000);

// ================= START =================
setTimeout(async () => {
  await ensureBotFiles();
  try {
    sms = require("./lib/msg").sms;
    antidelete = require("./plugins/antidelete");
    handleAutoForward = require("./plugins/forward").handleAutoForward;
  } catch (e) {}
  await connectDB();
  await loadSettingsFromDB();
  
  const sessions = loadLocalSessions();
  for(const s of sessions) {
      await startBot(s.sessionId, s.authPath, config);
  }
  
  // Load Plugins
  setTimeout(() => {
      const pluginFolder = "./plugins/";
      fs.readdirSync(pluginFolder).forEach(plugin => {
          if (path.extname(plugin).toLowerCase() === ".js") {
              try { require(pluginFolder + plugin); } catch (e) {}
          }
      });
      console.log("✅ Plugins Loaded");
  }, 5000);
  
}, 4000);
