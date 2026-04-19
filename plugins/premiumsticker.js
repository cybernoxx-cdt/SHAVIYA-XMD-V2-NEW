// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SHAVIYA-XMD | PREMIUM ANIMATED STICKER PLUGIN
//   Coded by CDT | Crash Delta Team
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BUILT-IN PREMIUM STICKER PACK CATALOG
//  (Real Sticker.ly public pack IDs - no login needed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PREMIUM_PACKS = [
  {
    id: 1,
    name: "☁️ Cloudy Vibes",
    desc: "Animated clouds & loading - like screenshot",
    tags: ["cloud", "loading", "cute", "animated"],
    giphyTag: "cloud animated cute",
    tenorTag: "cloud animation sticker",
  },
  {
    id: 2,
    name: "🦕 Dino Memes",
    desc: "Funny dino reading stickers",
    tags: ["dino", "funny", "meme", "animated"],
    giphyTag: "dinosaur funny animated",
    tenorTag: "funny dinosaur sticker",
  },
  {
    id: 3,
    name: "😂 Ultra Funny",
    desc: "Premium funny animated stickers",
    tags: ["funny", "laugh", "meme"],
    giphyTag: "funny meme sticker animated",
    tenorTag: "funny sticker pack",
  },
  {
    id: 4,
    name: "🌸 Anime Cute",
    desc: "Kawaii anime animated stickers",
    tags: ["anime", "cute", "kawaii"],
    giphyTag: "anime cute kawaii sticker",
    tenorTag: "anime cute sticker",
  },
  {
    id: 5,
    name: "🔥 Savage Mode",
    desc: "Savage reaction stickers",
    tags: ["savage", "reaction", "attitude"],
    giphyTag: "savage reaction sticker",
    tenorTag: "savage attitude sticker",
  },
  {
    id: 6,
    name: "🎉 Celebration",
    desc: "Party & celebration animated",
    tags: ["party", "celebration", "happy"],
    giphyTag: "celebration party confetti sticker",
    tenorTag: "celebration sticker animated",
  },
  {
    id: 7,
    name: "💀 Dark Humor",
    desc: "Dark funny skeleton stickers",
    tags: ["dark", "skull", "funny"],
    giphyTag: "skull dark humor sticker",
    tenorTag: "skull funny sticker",
  },
  {
    id: 8,
    name: "🐱 Cat Vibes",
    desc: "Premium animated cat stickers",
    tags: ["cat", "neko", "cute"],
    giphyTag: "cat funny animated sticker",
    tenorTag: "cat sticker animated",
  },
  {
    id: 9,
    name: "💬 Mood Texts",
    desc: "Animated text mood stickers",
    tags: ["text", "mood", "vibe"],
    giphyTag: "mood text sticker animated",
    tenorTag: "mood text sticker",
  },
  {
    id: 10,
    name: "⚡ Action Pack",
    desc: "Action & energy animated stickers",
    tags: ["action", "energy", "power"],
    giphyTag: "action energy power sticker",
    tenorTag: "action sticker animated",
  },
];

const GIPHY_KEY = "dc6zaTOxFJmzC";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONVERTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gifToAnimatedWebp(inputPath, outputPath) {
  // Animated WebP - preserves animation!
  await execPromise(
    `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 70 -loop 0 -preset default -an "${outputPath}"`
  );
}

async function imageToStaticWebp(inputPath, outputPath) {
  await execPromise(
    `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -lossless 0 -q:v 70 -an "${outputPath}"`
  );
}

async function convertAndSend(url, sock, jid, packName, author) {
  const ts = Date.now() + Math.random().toString(36).slice(2, 6);
  const isGif = url.includes(".gif") || url.includes("giphy") || url.includes("tenor");
  const ext = isGif ? "gif" : "png";
  const tmpIn = `/tmp/stk_${ts}.${ext}`;
  const tmpOut = `/tmp/stk_${ts}.webp`;

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    fs.writeFileSync(tmpIn, Buffer.from(res.data));

    if (isGif) {
      await gifToAnimatedWebp(tmpIn, tmpOut);
    } else {
      await imageToStaticWebp(tmpIn, tmpOut);
    }

    const webpBuf = fs.readFileSync(tmpOut);
    await sock.sendMessage(jid, {
      sticker: webpBuf,
      stickerMetadata: {
        pack: packName || "SHAVIYA Premium",
        author: author || "CDT",
      },
    });
    return true;
  } catch (e) {
    console.error("[premium-sticker] convert fail:", e.message);
    return false;
  } finally {
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GIPHY FETCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchGiphy(tag, limit = 8) {
  try {
    const res = await axios.get("https://api.giphy.com/v1/stickers/search", {
      params: { api_key: GIPHY_KEY, q: tag, limit, rating: "g" },
      timeout: 10000,
    });
    return (res.data?.data || [])
      .map((g) => g.images?.fixed_width?.url || g.images?.downsized?.url)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGiphyRandom(tag) {
  try {
    const res = await axios.get("https://api.giphy.com/v1/stickers/random", {
      params: { api_key: GIPHY_KEY, tag, rating: "g" },
      timeout: 10000,
    });
    return res.data?.data?.images?.original?.url || null;
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TENOR FETCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchTenor(query, limit = 5) {
  try {
    const res = await axios.get("https://tenor.googleapis.com/v2/search", {
      params: {
        q: query,
        key: "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk",
        limit,
        media_filter: "gif",
      },
      timeout: 10000,
    });
    return (res.data?.results || [])
      .map((r) => r.media_formats?.gif?.url || r.media_formats?.tinygif?.url)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SESSION STORE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const sessions = new Map();

function setSession(jid, data) {
  sessions.set(jid, { ...data, ts: Date.now() });
  setTimeout(() => sessions.delete(jid), 5 * 60 * 1000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MENU TEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildMenu() {
  let txt = `╭━━━「 🎴 *PREMIUM STICKER PACKS* 」━━━╮\n`;
  txt += `┃  *Animated & HD Sticker Collections*\n`;
  txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  PREMIUM_PACKS.forEach((p) => {
    txt += `  *${p.id}.* ${p.name}\n`;
    txt += `      └ _${p.desc}_\n\n`;
  });
  txt += `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
  txt += `┃ Reply with *number* to download\n`;
  txt += `┃ Example: reply *1* for Cloud pack\n`;
  txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
  return txt;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handler = async (m, { sock, text, command }) => {
  const jid = m.key.remoteJid;
  const reply = (msg) => sock.sendMessage(jid, { text: msg }, { quoted: m });

  // ── .premium / .packsticker (show menu) ──────────
  if (["premium", "packsticker", "premiumsticker"].includes(command)) {
    if (!text) {
      setSession(jid, { type: "menu" });
      return reply(buildMenu());
    }

    // .premium random
    if (text.toLowerCase() === "random") {
      const randomPack = PREMIUM_PACKS[Math.floor(Math.random() * PREMIUM_PACKS.length)];
      await reply(`🎲 *Random Pack:* ${randomPack.name}\n⏳ Fetching animated sticker...`);

      const url = await fetchGiphyRandom(randomPack.giphyTag);
      if (url) {
        const ok = await convertAndSend(url, sock, jid, randomPack.name, "CDT Premium");
        if (ok) return reply(`✅ *${randomPack.name}* sticker sent!`);
      }

      // Tenor fallback
      const tenorUrls = await fetchTenor(randomPack.tenorTag, 3);
      if (tenorUrls.length) {
        const ok = await convertAndSend(tenorUrls[0], sock, jid, randomPack.name, "CDT Premium");
        if (ok) return reply(`✅ *${randomPack.name}* sticker sent!`);
      }

      return reply("❌ Failed. Try again.");
    }

    // .premium search <keyword>
    if (text.toLowerCase().startsWith("search ")) {
      const kw = text.slice(7).trim();
      await reply(`🔍 *Searching:* _${kw}_`);
      const urls = await fetchGiphy(kw, 6);
      if (!urls.length) {
        const tUrls = await fetchTenor(kw, 4);
        if (!tUrls.length) return reply(`❌ No stickers found for "${kw}"`);
        urls.push(...tUrls);
      }
      await reply(`✅ Found *${urls.length}* stickers. Sending...`);
      let sent = 0;
      for (const u of urls.slice(0, 6)) {
        const ok = await convertAndSend(u, sock, jid, kw, "CDT Search");
        if (ok) sent++;
        await new Promise((r) => setTimeout(r, 800));
      }
      return reply(`🎴 Sent *${sent}* animated stickers for _"${kw}"_`);
    }
  }

  // ── Reply number selection ────────────────────────
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    const session = sessions.get(jid);
    if (!session || session.type !== "menu") return;

    const num = parseInt(text?.trim());
    if (isNaN(num) || num < 1 || num > PREMIUM_PACKS.length) return;

    const pack = PREMIUM_PACKS[num - 1];
    sessions.delete(jid);

    await reply(
      `╭─「 🎴 *${pack.name}* 」\n` +
      `│ _${pack.desc}_\n` +
      `│ ⏳ Fetching animated stickers...\n` +
      `╰──────────────────`
    );

    // Fetch from GIPHY
    let urls = await fetchGiphy(pack.giphyTag, 8);

    // Tenor fallback
    if (urls.length < 3) {
      const tUrls = await fetchTenor(pack.tenorTag, 5);
      urls = [...urls, ...tUrls];
    }

    if (!urls.length) {
      return reply(`❌ Could not fetch stickers for *${pack.name}*. Try again.`);
    }

    const limit = Math.min(urls.length, 8);
    await reply(`✅ *${pack.name}*\nSending *${limit}* animated stickers...`);

    let sent = 0;
    for (let i = 0; i < limit; i++) {
      const ok = await convertAndSend(urls[i], sock, jid, pack.name, "CDT Premium");
      if (ok) sent++;
      await new Promise((r) => setTimeout(r, 900));
    }

    return reply(
      `╭─「 ✅ *DONE* 」\n` +
      `│ Pack: *${pack.name}*\n` +
      `│ Sent: *${sent}/${limit}* stickers\n` +
      `│ Type *.premium* for more packs!\n` +
      `╰──────────────────`
    );
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
handler.command = ["premium", "packsticker", "premiumsticker"];
handler.help = [
  "premium          → show pack menu",
  "premium random   → random animated sticker",
  "premium search <keyword>",
];
handler.tags = ["sticker", "media"];
handler.description = "Premium animated sticker pack downloader";

module.exports = handler;
