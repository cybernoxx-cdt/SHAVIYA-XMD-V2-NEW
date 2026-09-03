"use strict";

// SHAVIYA-XMD V2 — Sinhala Cartoon Search & Downloader
// NO-DOT reply menu system: reply directly to the bot's menu with 1, 2, 3...

const { cmd } = require("../command");
const axios = require("axios");

const SEARCH_API = "https://api.zanta-mini.store/api/slcartoons/search";
const DOWNLOAD_API = "https://api.zanta-mini.store/api/slcartoons/dl";
const API_KEY = process.env.SLCARTOON_API_KEY || "";
const MAX_SEARCH_RESULTS = 10;
const LISTEN_TIMEOUT = 10 * 60 * 1000;
const API_TIMEOUT = 30_000;

function textOf(msg) {
  const m = msg?.message;
  if (!m) return "";
  return String(
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.viewOnceMessage?.message?.conversation ||
    m.viewOnceMessage?.message?.extendedTextMessage?.text ||
    ""
  ).trim();
}

function quotedContext(msg) {
  const m = msg?.message;
  if (!m) return null;
  const types = [
    m.extendedTextMessage,
    m.imageMessage,
    m.videoMessage,
    m.audioMessage,
    m.documentMessage,
    m.stickerMessage,
    m.ephemeralMessage?.message?.extendedTextMessage,
    m.viewOnceMessage?.message?.extendedTextMessage,
    m.viewOnceMessageV2?.message?.extendedTextMessage,
  ];
  for (const t of types) if (t?.contextInfo) return t.contextInfo;
  return null;
}

function senderOf(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || "";
}

// WhatsApp may identify a user with a normal JID, device JID, or @lid.
// For @lid we validate the quoted message's participant when available;
// otherwise the chat-level reply context is enough for this menu flow.
function sameSender(expected, msg) {
  if (!expected) return true;
  const actual = senderOf(msg);
  if (!actual) return false;
  if (actual === expected) return true;

  const norm = v => String(v).split(":")[0].split("@")[0].replace(/[^0-9]/g, "");
  const a = norm(expected), b = norm(actual);
  if (a && b && a === b) return true;

  // @lid JIDs do not expose the user's phone number. In groups WhatsApp
  // supplies participant in the reply message; accept @lid here because the
  // reply is already bound to the bot's exact menu message below.
  if (String(actual).endsWith("@lid")) return true;
  return false;
}

function isNumberReply(msg, targetId) {
  const ctx = quotedContext(msg);
  return !!(ctx?.stanzaId && ctx.stanzaId === targetId && /^\d+$/.test(textOf(msg)));
}

async function react(conn, from, key, emoji) {
  try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

async function apiGet(url, params) {
  const { data, status } = await axios.get(url, {
    params,
    timeout: API_TIMEOUT,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: "application/json", "User-Agent": "SHAVIYA-XMD-V2" }
  });
  if (status >= 400) throw new Error(`HTTP ${status}`);
  return data;
}

function safe(v, fallback = "Sinhala Cartoon") {
  return String(v || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim().slice(0, 100) || fallback;
}

async function sendSearchMenu(conn, from, quoted, query, results) {
  let out = `╭━━━〔 🎬 *SINHALA CARTOONS* 〕━━━╮\n`;
  out += `┃ 🔎 *Search:* ${query}\n┃ 📚 *Results:* ${results.length}\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  results.forEach((x, i) => {
    out += `*${i + 1}.* 🎞️ ${x.title || x.name || "Unknown"}`;
    if (x.quality) out += ` • ${x.quality}`;
    if (x.type) out += ` • ${x.type}`;
    if (x.rating) out += `\n   ⭐ ${x.rating}`;
    out += "\n\n";
  });
  out += `📌 *මේ message එකට reply කරලා number එක යවන්න*\n`;
  out += `උදා: *1*\n\n> ⚡ SHAVIYA-XMD V2`;
  return conn.sendMessage(from, { text: out }, { quoted });
}

async function sendEpisodeMenu(conn, from, quoted, title, episodes) {
  let out = `╭━━━〔 📺 *CARTOON EPISODES* 〕━━━╮\n`;
  out += `┃ 🎬 *${title}*\n┃ 📦 *Episodes:* ${episodes.length}\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  episodes.forEach((ep, i) => {
    const no = ep.episode || String(i + 1).padStart(2, "0");
    out += `*${i + 1}.* 📺 ${ep.title || `Episode ${no}`} _(EP ${no})_\n`;
  });
  out += `\n📥 *මේ message එකට reply කරලා episode number එක යවන්න*\n`;
  out += `උදා: *1*\n\n> ⚡ SHAVIYA-XMD V2`;
  return conn.sendMessage(from, { text: out }, { quoted });
}

async function sendEpisode(conn, from, quoted, seriesTitle, episode) {
  const url = episode?.stream_url || episode?.url || episode?.download_url || episode?.downloadUrl;
  if (!url) throw new Error("Episode stream URL not found");

  const epNo = episode?.episode || "01";
  const epTitle = episode?.title || `Episode ${epNo}`;
  const fileName = `${safe(seriesTitle)} - EP ${safe(epNo)}.mp4`;
  const caption = `╭━━〔 🎬 *SINHALA CARTOON* 〕━━╮\n┃ 🎞️ *${seriesTitle}*\n┃ 📺 *${epTitle}*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n> ⚡ SHAVIYA-XMD V2`;

  await conn.sendMessage(from, {
    video: { url },
    mimetype: "video/mp4",
    fileName,
    caption
  }, { quoted });
}

// IMPORTANT: listener is attached using the SAME conn instance that handled
// the command. This fixes the old global.conn timing problem.
function listenForNumberReply(conn, from, sender, targetMsgId, callback) {
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { conn.ev.off("messages.upsert", handler); } catch {}
  };

  const handler = async ({ messages }) => {
    try {
      const msg = messages?.[0];
      if (!msg?.message || msg.key?.fromMe) return;
      if (msg.key?.remoteJid !== from) return;
      if (!isNumberReply(msg, targetMsgId)) return;
      if (!sameSender(sender, msg)) return;
      const n = Number(textOf(msg));
      cleanup();
      await callback(n, msg);
    } catch (e) {
      console.error("[SLCARTOON] reply listener:", e?.stack || e);
    }
  };

  const timer = setTimeout(cleanup, LISTEN_TIMEOUT);
  conn.ev.on("messages.upsert", handler);
}

cmd({
  pattern: "slcartoon",
  alias: ["slcartoons", "sc", "cartoon"],
  react: "🎬",
  desc: "Search and download Sinhala cartoons",
  category: "download",
  fromMe: false,
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
  const query = typeof q === "string" ? q.trim() : Array.isArray(q) ? q.join(" ").trim() : "";

  if (!API_KEY) return reply("❌ SLCARTOON_API_KEY is missing in .env");
  if (!query) return reply("🎬 *Sinhala Cartoon Search*\n\nUsage: .sc <cartoon name>\nExample: .sc Ben 10");
  if (/^\d+$/.test(query)) return reply("❌ මුලින් cartoon එක search කරන්න. උදා: *.sc Ben 10*");

  await react(conn, from, mek.key, "🔎");
  try {
    const data = await apiGet(SEARCH_API, { apiKey: API_KEY, text: query });
    const raw = Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];
    if (!data?.success || !raw.length) {
      await react(conn, from, mek.key, "❌");
      return reply(`❌ *${query}* සඳහා cartoons හමු වුණේ නැහැ.`);
    }

    const results = raw.slice(0, MAX_SEARCH_RESULTS);
    const menu = await sendSearchMenu(conn, from, mek, query, results);
    await react(conn, from, mek.key, "✅");

    listenForNumberReply(conn, from, sender, menu.key.id, async (n, replyMsg) => {
      if (n < 1 || n > results.length) {
        await react(conn, from, replyMsg.key, "❌");
        return conn.sendMessage(from, { text: `❌ *1 - ${results.length}* අතර number එකක් reply කරන්න.` }, { quoted: replyMsg });
      }

      const selected = results[n - 1];
      const selectedUrl = selected.url || selected.link || selected.href;
      if (!selectedUrl) return conn.sendMessage(from, { text: "❌ මේ result එකට valid cartoon URL එකක් නැහැ." }, { quoted: replyMsg });

      await react(conn, from, replyMsg.key, "⏳");
      await conn.sendMessage(from, { text: `⏳ *Episodes load කරනවා...*\n🎬 ${selected.title || "Sinhala Cartoon"}` }, { quoted: replyMsg });

      try {
        const dl = await apiGet(DOWNLOAD_API, { apiKey: API_KEY, text: selectedUrl });
        const result = dl?.results || dl?.result || dl?.data;
        const episodes = Array.isArray(result?.episodes) ? result.episodes : Array.isArray(dl?.episodes) ? dl.episodes : [];
        if (!dl?.success || !episodes.length) throw new Error(dl?.message || "No episodes found");

        const epMenu = await sendEpisodeMenu(conn, from, replyMsg, result?.title || selected.title || "Sinhala Cartoon", episodes);
        await react(conn, from, replyMsg.key, "✅");

        listenForNumberReply(conn, from, sender, epMenu.key.id, async (epN, epReplyMsg) => {
          if (epN < 1 || epN > episodes.length) {
            await react(conn, from, epReplyMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ *1 - ${episodes.length}* අතර episode number එකක් reply කරන්න.` }, { quoted: epReplyMsg });
          }

          const episode = episodes[epN - 1];
          await react(conn, from, epReplyMsg.key, "📥");
          await conn.sendMessage(from, { text: `⏬ *Downloading...*\n🎬 ${result?.title || selected.title}\n📺 ${episode.title || `Episode ${epN}`}` }, { quoted: epReplyMsg });
          try {
            await sendEpisode(conn, from, epReplyMsg, result?.title || selected.title || "Sinhala Cartoon", episode);
            await react(conn, from, epReplyMsg.key, "✅");
          } catch (e) {
            console.error("[SLCARTOON] episode send:", e?.stack || e);
            await react(conn, from, epReplyMsg.key, "❌");
            await conn.sendMessage(from, { text: `❌ *Download failed.*\n${e?.message || "Try again."}` }, { quoted: epReplyMsg });
          }
        });
      } catch (e) {
        console.error("[SLCARTOON] episode API:", e?.stack || e);
        await react(conn, from, replyMsg.key, "❌");
        await conn.sendMessage(from, { text: `❌ *Episodes load failed.*\n${e?.message || "Try again later."}` }, { quoted: replyMsg });
      }
    });
  } catch (e) {
    console.error("[SLCARTOON] search:", e?.stack || e);
    await react(conn, from, mek.key, "❌");
    return reply(`❌ *Search failed.*\n${e?.message || "Try again later."}`);
  }
});

module.exports = { SEARCH_API, DOWNLOAD_API };
