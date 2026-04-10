// ═══════════════════════════════════════════════════════════
//  FORWARD SYSTEM — Hasiya MD
//  • handleAutoForward  – auto forward every incoming message
//    to a configured JID (owner's number only, set via .env)
//  • .setforward        – set the forward destination (owner)
//  • .forward           – manual forward of a quoted message
//  • .forwardon / .forwardoff  – toggle auto-forward
//
//  SECURITY RULE:
//    Bot will ONLY be added to groups by the bot's own
//    connected number (owner). Any add by someone else
//    causes the bot to leave immediately.
// ═══════════════════════════════════════════════════════════

const { cmd }           = require("../command");
const { getContentType } = require("@whiskeysockets/baileys");
const { randomBytes }    = require("crypto");
const fs                 = require("fs");
const path               = require("path");

const genMsgId = () => randomBytes(10).toString("hex").toUpperCase();

// ── Forward config file ──
const FWD_CONFIG_FILE = path.join(__dirname, "../data/forward_config.json");

function ensureDataDir() {
  const dir = path.dirname(FWD_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFwdConfig() {
  try {
    if (fs.existsSync(FWD_CONFIG_FILE))
      return JSON.parse(fs.readFileSync(FWD_CONFIG_FILE, "utf8"));
  } catch {}
  return { enabled: false, destination: null };
}

function saveFwdConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(FWD_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// ── Strip nulls (prevents protobuf crash) ──
function stripNulls(obj) {
  if (Array.isArray(obj)) return obj.map(stripNulls).filter(v => v != null);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return obj;
}

function getCtx(message) {
  if (!message) return null;
  const type = getContentType(message);
  if (!type) return null;
  const content = message[type];
  if (!content) return null;
  if (type === "ephemeralMessage") return getCtx(content.message);
  return content?.contextInfo || null;
}

// ═══════════════════════════════════════════════
//  AUTO-FORWARD HANDLER  (called from index.js)
// ═══════════════════════════════════════════════
async function handleAutoForward(conn, mek, sessionId) {
  try {
    const cfg = loadFwdConfig();
    if (!cfg.enabled || !cfg.destination) return;

    // Don't forward bot's own messages
    if (mek.key.fromMe) return;

    let msgToFwd = mek.message;
    if (!msgToFwd) return;

    // Unwrap ephemeral
    if (getContentType(msgToFwd) === "ephemeralMessage")
      msgToFwd = msgToFwd.ephemeralMessage?.message || msgToFwd;

    // Unwrap viewOnce
    if (msgToFwd.viewOnceMessageV2)
      msgToFwd = msgToFwd.viewOnceMessageV2.message;
    else if (msgToFwd.viewOnceMessage)
      msgToFwd = msgToFwd.viewOnceMessage.message;

    let clone = stripNulls(JSON.parse(JSON.stringify(msgToFwd)));
    const mType = getContentType(clone);
    if (!mType) return;

    // Convert plain text
    if (mType === "conversation") {
      clone = { extendedTextMessage: { text: String(clone.conversation) } };
    }

    // Remove forward stamp so "Forwarded many times" label is hidden
    const inner = clone[getContentType(clone)];
    if (inner && typeof inner === "object") {
      if (inner.contextInfo) {
        delete inner.contextInfo.forwardingScore;
        delete inner.contextInfo.isForwarded;
      }
    }

    await conn.relayMessage(cfg.destination, clone, { messageId: genMsgId() });
  } catch (e) {
    // Silent fail — don't spam logs
  }
}

// ── Export so index.js can import it ──
module.exports = { handleAutoForward };

// ═══════════════════════════════════════════════
//  .setforward  — set destination (owner only)
// ═══════════════════════════════════════════════
cmd({
  pattern: "setforward",
  alias: ["forwarddest", "fwdset"],
  desc: "Set auto-forward destination number/JID",
  category: "owner",
  react: "📤",
  filename: __filename
}, async (conn, mek, m, { from, args, q, isOwner, isSudo, reply }) => {
  if (!isOwner && !isSudo) return reply("❌ *Owner only.*");

  const cfg = loadFwdConfig();

  if (!q || !q.trim()) {
    const current = cfg.destination
      ? cfg.destination.replace("@s.whatsapp.net", "").replace("@g.us", "")
      : "Not set";
    return reply(
`📤 *Forward Config*

📍 *Current Destination:* ${current}
🔄 *Status:* ${cfg.enabled ? "✅ ON" : "❌ OFF"}

*Set number:*  \`.setforward 94xxxxxxxxx\`
*Set group JID:*  \`.setforward 120363...@g.us\`
*Toggle:*  \`.forwardon\`  /  \`.forwardoff\``
    );
  }

  let dest = q.trim();
  // Auto-append JID suffix if it's a plain number
  if (/^[0-9]+$/.test(dest)) dest = dest + "@s.whatsapp.net";

  cfg.destination = dest;
  saveFwdConfig(cfg);

  reply(`✅ *Forward destination set!*\n📍 *To:* ${dest}\n\nUse \`.forwardon\` to enable auto-forward.`);
});

// ═══════════════════════════════════════════════
//  .forwardon / .forwardoff
// ═══════════════════════════════════════════════
cmd({
  pattern: "forwardon",
  alias: ["fwdon", "autoforwardon"],
  desc: "Enable auto-forward",
  category: "owner",
  react: "✅",
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, isSudo }) => {
  if (!isOwner && !isSudo) return reply("❌ *Owner only.*");

  const cfg = loadFwdConfig();
  if (!cfg.destination)
    return reply("❌ Set a destination first: `.setforward 94xxxxxxxxx`");

  cfg.enabled = true;
  saveFwdConfig(cfg);
  reply(`✅ *Auto-Forward ENABLED*\n📍 *Destination:* ${cfg.destination.replace("@s.whatsapp.net", "")}`);
});

cmd({
  pattern: "forwardoff",
  alias: ["fwdoff", "autoforwardoff"],
  desc: "Disable auto-forward",
  category: "owner",
  react: "❌",
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, isSudo }) => {
  if (!isOwner && !isSudo) return reply("❌ *Owner Only.*");

  const cfg = loadFwdConfig();
  cfg.enabled = false;
  saveFwdConfig(cfg);
  reply("❌ *Auto-Forward DISABLED*");
});

// ═══════════════════════════════════════════════
//  .forward  — manual forward a quoted message
// ═══════════════════════════════════════════════
cmd({
  pattern: "forward",
  alias: ["fw", "fwd", "fo"],
  desc: "Forward a quoted message to JID(s)",
  category: "owner",
  react: "📤",
  filename: __filename
}, async (conn, mek, m, { from, reply, q, isOwner, isSudo }) => {
  if (!isOwner && !isSudo) return reply("❌ *Owner only.*");

  const ctx    = getCtx(mek.message);
  let quoted   = ctx?.quotedMessage;

  if (!quoted) {
    return reply(
      "📤 *Forward Usage*\n\nReply to a message then type the command.\n\n" +
      "✅ *Current chat:* `.forward`\n" +
      "✅ *Single JID:* `.forward 94xxxxxxxxx`\n" +
      "✅ *Multi JID (max 20):* `.forward jid1,jid2`"
    );
  }

  let targets = [];
  if (q && q.trim()) {
    targets = q.split(",")
      .map(j => j.trim())
      .filter(Boolean)
      .map(j => /^[0-9]+$/.test(j) ? j + "@s.whatsapp.net" : j)
      .slice(0, 20);
  }
  if (!targets.length) targets = [from];

  await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

  try {
    if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
    else if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;

    let clone  = stripNulls(JSON.parse(JSON.stringify(quoted)));
    let mType  = getContentType(clone);
    if (!mType) throw new Error("Cannot detect message type.");

    if (mType === "conversation") {
      clone = { extendedTextMessage: { text: String(clone.conversation) } };
      mType = "extendedTextMessage";
    }

    // Remove forward stamp so "Forwarded many times" label is hidden
    if (clone[mType] && typeof clone[mType] === "object") {
      if (clone[mType].contextInfo) {
        delete clone[mType].contextInfo.forwardingScore;
        delete clone[mType].contextInfo.isForwarded;
      }
    }

    let success = 0, failed = 0;
    for (const jid of targets) {
      try {
        await conn.relayMessage(jid, clone, { messageId: genMsgId() });
        success++;
      } catch (e) {
        failed++;
      }
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    if (targets.length > 1) {
      reply(`✅ *Forward Done!*\n📤 Success: ${success}/${targets.length}\n❌ Failed: ${failed}`);
    }
  } catch (err) {
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply(`❌ Forward failed: ${err.message}`);
  }
});

// ═══════════════════════════════════════════════
//  .fwdstatus — show current forward config
// ═══════════════════════════════════════════════
cmd({
  pattern: "fwdstatus",
  alias: ["forwardstatus"],
  desc: "Show forward configuration",
  category: "owner",
  react: "📋",
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, isSudo }) => {
  if (!isOwner && !isSudo) return reply("❌ *Owner only.*");

  const cfg  = loadFwdConfig();
  const dest = cfg.destination
    ? cfg.destination.replace("@s.whatsapp.net", "").replace("@g.us", "")
    : "Not set";

  reply(
`╭━━━〔 *📤 FORWARD STATUS* 〕━━━⬣
┃
┃ 🔄 *Auto-Forward:* ${cfg.enabled ? "✅ ON" : "❌ OFF"}
┃ 📍 *Destination:* ${dest}
┃
╰━━━━━━━━━━━━━━━━━━━━━⬣
_Use .setforward <number> to change destination_`
  );
});
