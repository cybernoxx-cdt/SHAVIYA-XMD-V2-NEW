// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   SHAVIYA-XMD | STICKER PACK PLUGIN
//   Coded by CDT | Crash Delta Team
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// ── Helpers ─────────────────────────────────────────

async function downloadFile(url, dest) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0 Safari/537.36",
    },
    timeout: 20000,
  });
  fs.writeFileSync(dest, res.data);
}

async function toWebp(inputPath, outputPath) {
  // Try ffmpeg first, fallback to imagemagick
  try {
    await execPromise(
      `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset picture -an -vsync 0 "${outputPath}"`
    );
  } catch {
    await execPromise(
      `convert "${inputPath}" -resize 512x512 "${outputPath}"`
    );
  }
}

async function imageToSticker(buffer, sock, jid, packname, author) {
  const tmpIn = `/tmp/stk_in_${Date.now()}.png`;
  const tmpOut = `/tmp/stk_out_${Date.now()}.webp`;
  try {
    fs.writeFileSync(tmpIn, buffer);
    await toWebp(tmpIn, tmpOut);
    const webpBuffer = fs.readFileSync(tmpOut);
    await sock.sendMessage(jid, {
      sticker: webpBuffer,
      ...(packname ? { stickerMetadata: { pack: packname, author } } : {}),
    });
  } finally {
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}

// ── Source 1: Sticker.ly ─────────────────────────────

async function searchStickerLy(query) {
  try {
    const res = await axios.get(
      `https://sticker.ly/api/v3/sticker-pack/search`,
      {
        params: { keyword: query, pageSize: 5, pageNo: 0 },
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "StickerLy/4.0 (Android)",
        },
        timeout: 10000,
      }
    );
    const packs = res.data?.data?.content || [];
    return packs.map((p) => ({
      id: p.packageId || p.id,
      name: p.name,
      author: p.creatorName || "Unknown",
      thumbnail: p.coverUrl || p.thumbnailUrl,
      stickers: (p.stickers || []).map((s) => s.imageUrl || s.url).filter(Boolean),
      source: "stickerLy",
    }));
  } catch {
    return [];
  }
}

async function getStickerLyPack(packId) {
  try {
    const res = await axios.get(
      `https://sticker.ly/api/v3/sticker-pack/${packId}`,
      {
        headers: { "User-Agent": "StickerLy/4.0 (Android)" },
        timeout: 10000,
      }
    );
    const pack = res.data?.data;
    if (!pack) return null;
    return {
      name: pack.name,
      author: pack.creatorName || "Unknown",
      stickers: (pack.stickers || []).map((s) => s.imageUrl || s.url).filter(Boolean),
    };
  } catch {
    return null;
  }
}

// ── Source 2: GIPHY ───────────────────────────────────

const GIPHY_KEY = "dc6zaTOxFJmzC"; // public beta key

async function searchGiphy(query, limit = 8) {
  try {
    const res = await axios.get("https://api.giphy.com/v1/stickers/search", {
      params: { api_key: GIPHY_KEY, q: query, limit, rating: "g" },
      timeout: 10000,
    });
    return (res.data?.data || []).map((g) => ({
      url: g.images?.fixed_width?.url || g.images?.original?.url,
      title: g.title,
    }));
  } catch {
    return [];
  }
}

async function randomGiphy(tag = "cute") {
  try {
    const res = await axios.get("https://api.giphy.com/v1/stickers/random", {
      params: { api_key: GIPHY_KEY, tag, rating: "g" },
      timeout: 10000,
    });
    return res.data?.data?.images?.fixed_width?.url || null;
  } catch {
    return null;
  }
}

// ── Source 3: Tenor ───────────────────────────────────

async function searchTenor(query, limit = 5) {
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
    return (res.data?.results || []).map((r) => ({
      url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
      title: r.title || r.content_description,
    }));
  } catch {
    return [];
  }
}

// ── Format reply ─────────────────────────────────────

function formatPackList(packs) {
  if (!packs.length) return null;
  let txt = `╭─「 🎴 *STICKER PACKS* 」\n`;
  packs.forEach((p, i) => {
    txt += `│ *${i + 1}.* ${p.name}\n`;
    txt += `│ 👤 ${p.author} | 🔢 ${p.stickers?.length || "?"} stickers\n`;
    if (i < packs.length - 1) txt += `│\n`;
  });
  txt += `╰──────────────────\n`;
  txt += `\n📌 Reply with number to download\n`;
  txt += `_Example: reply *1* to get pack 1_`;
  return txt;
}

// ── Sessions (for reply-based selection) ─────────────

const sessions = new Map(); // jid → { packs, timestamp }

function setSession(jid, data) {
  sessions.set(jid, { ...data, timestamp: Date.now() });
  // auto-expire after 3 min
  setTimeout(() => sessions.delete(jid), 3 * 60 * 1000);
}

function getSession(jid) {
  return sessions.get(jid) || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   PLUGIN EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handler = async (m, { sock, text, command }) => {
  const jid = m.key.remoteJid;
  const reply = (msg) =>
    sock.sendMessage(jid, { text: msg }, { quoted: m });

  // ── .sticker random ──────────────────────────────
  if (command === "sticker" && text?.toLowerCase() === "random") {
    await reply("🎲 *Random premium sticker sending...*");

    // Try GIPHY random
    const tags = ["cute", "funny", "anime", "meme", "celebration"];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    const url = await randomGiphy(tag);

    if (url) {
      try {
        const buf = Buffer.from(
          (await axios.get(url, { responseType: "arraybuffer", timeout: 15000 })).data
        );
        await imageToSticker(buf, sock, jid, "SHAVIYA Premium", "CDT");
        return;
      } catch (e) {
        console.error("[stickerpack] GIPHY random fail:", e.message);
      }
    }

    // Tenor fallback
    const tenorResults = await searchTenor("funny sticker", 5);
    if (tenorResults.length) {
      const pick = tenorResults[Math.floor(Math.random() * tenorResults.length)];
      try {
        const buf = Buffer.from(
          (await axios.get(pick.url, { responseType: "arraybuffer", timeout: 15000 })).data
        );
        await imageToSticker(buf, sock, jid, "SHAVIYA Premium", "CDT");
        return;
      } catch (e) {
        console.error("[stickerpack] Tenor fallback fail:", e.message);
      }
    }

    return reply("❌ *Random sticker load failed. Try again.*");
  }

  // ── .stickerpack <query> ─────────────────────────
  if (command === "stickerpack") {
    if (!text) {
      return reply(
        `╭─「 🎴 *STICKERPACK* 」\n` +
        `│\n` +
        `│ Usage:\n` +
        `│ *.stickerpack <name>* - Search packs\n` +
        `│ *.sticker random* - Random premium sticker\n` +
        `│\n` +
        `│ Examples:\n` +
        `│ .stickerpack cute cat\n` +
        `│ .stickerpack anime\n` +
        `│ .stickerpack funny meme\n` +
        `╰──────────────────`
      );
    }

    await reply(`🔍 *Searching:* _${text}_`);

    // Try Sticker.ly first
    let packs = await searchStickerLy(text);

    if (packs.length) {
      setSession(jid, { type: "stickerLy", packs });
      return reply(formatPackList(packs));
    }

    // GIPHY fallback - show stickers directly
    await reply(`📡 *Sticker.ly no results, trying GIPHY...*`);
    const giphyResults = await searchGiphy(text, 6);

    if (giphyResults.length) {
      await reply(`✅ *Found ${giphyResults.length} stickers for "${text}"\nSending now...*`);
      let sent = 0;
      for (const g of giphyResults) {
        try {
          const buf = Buffer.from(
            (await axios.get(g.url, { responseType: "arraybuffer", timeout: 15000 })).data
          );
          await imageToSticker(buf, sock, jid, text, "GIPHY");
          sent++;
          await new Promise((r) => setTimeout(r, 800)); // small delay
        } catch (e) {
          console.error("[stickerpack] GIPHY sticker fail:", e.message);
        }
      }
      if (sent === 0) return reply("❌ *Failed to convert stickers. Try different keywords.*");
      return reply(`✅ *Sent ${sent}/${giphyResults.length} stickers!*`);
    }

    // Tenor last fallback
    await reply(`📡 *Trying Tenor...*`);
    const tenorResults = await searchTenor(text, 5);

    if (tenorResults.length) {
      await reply(`✅ *Found ${tenorResults.length} results. Sending...*`);
      let sent = 0;
      for (const t of tenorResults) {
        try {
          const buf = Buffer.from(
            (await axios.get(t.url, { responseType: "arraybuffer", timeout: 15000 })).data
          );
          await imageToSticker(buf, sock, jid, text, "Tenor");
          sent++;
          await new Promise((r) => setTimeout(r, 800));
        } catch (e) {
          console.error("[stickerpack] Tenor sticker fail:", e.message);
        }
      }
      if (sent === 0) return reply("❌ *Failed to send stickers.*");
      return reply(`✅ *Sent ${sent} stickers!*`);
    }

    return reply(`❌ *No sticker packs found for "${text}"*\nTry different keywords.`);
  }

  // ── Reply handler (pack selection) ───────────────
  if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const session = getSession(jid);
    if (!session || session.type !== "stickerLy") return;

    const num = parseInt(text?.trim());
    if (isNaN(num) || num < 1 || num > session.packs.length) return;

    const selected = session.packs[num - 1];
    await reply(`📦 *Downloading:* _${selected.name}_\n⏳ Please wait...`);

    // Get full pack
    let stickers = selected.stickers;
    if (!stickers?.length && selected.id) {
      const fullPack = await getStickerLyPack(selected.id);
      stickers = fullPack?.stickers || [];
    }

    if (!stickers.length) {
      return reply("❌ *Could not fetch stickers from this pack.*");
    }

    const limit = Math.min(stickers.length, 10); // max 10 per pack
    await reply(`✅ *Pack: ${selected.name}*\nSending ${limit} stickers...`);

    let sent = 0;
    for (let i = 0; i < limit; i++) {
      try {
        const buf = Buffer.from(
          (
            await axios.get(stickers[i], {
              responseType: "arraybuffer",
              timeout: 15000,
            })
          ).data
        );
        await imageToSticker(buf, sock, jid, selected.name, selected.author);
        sent++;
        await new Promise((r) => setTimeout(r, 700));
      } catch (e) {
        console.error("[stickerpack] sticker send fail:", e.message);
      }
    }

    sessions.delete(jid);
    return reply(
      `✅ *Done!* Sent ${sent}/${limit} stickers from *${selected.name}*`
    );
  }
};

// ── Register commands ─────────────────────────────────

handler.command = ["stickerpack", "sticker"];
handler.help = ["stickerpack <query>", "sticker random"];
handler.tags = ["sticker", "media"];
handler.description = "Premium sticker pack search & download";

module.exports = handler;
