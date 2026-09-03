'use strict';

/**
 * SHAVIYA-XMD V2 — Sinhala Cartoons Search & Downloader
 * API: ZANTA-MD / slcartoons
 *
 * Commands:
 *   .sc <cartoon name>       Search
 *   .sc <number>             Select search result
 *   .sc <episode number>     Download episode after selection
 *
 * Aliases: slcartoon, slcartoons, cartoon
 *
 * IMPORTANT:
 * Put the API key in .env:
 *   SLCARTOON_API_KEY=YOUR_API_KEY
 */

const { cmd } = require('../command');
const axios = require('axios');

const SEARCH_API = 'https://api.zanta-mini.store/api/slcartoons/search';
const DOWNLOAD_API = 'https://api.zanta-mini.store/api/slcartoons/dl';
const API_KEY = process.env.SLCARTOON_API_KEY || '';

const MAX_SEARCH_RESULTS = 10;
const SESSION_TTL = 10 * 60 * 1000;
const API_TIMEOUT = 30_000;

// Per-chat state. Nothing is persisted to disk.
const sessions = new Map();

function getText(msg) {
  const message = msg?.message;
  if (!message) return '';

  const unwrap = (obj) => {
    if (!obj) return '';
    return (
      obj.conversation ||
      obj.extendedTextMessage?.text ||
      obj.imageMessage?.caption ||
      obj.videoMessage?.caption ||
      obj.documentMessage?.caption ||
      ''
    );
  };

  let text = unwrap(message);
  if (text) return text.trim();

  const wrapped =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message;

  text = unwrap(wrapped);
  return String(text || '').trim();
}

function getSender(msg) {
  return String(msg?.key?.participant || msg?.key?.remoteJid || '');
}

function sameUser(a, b) {
  if (!a || !b) return false;
  const clean = (v) => String(v).split(':')[0].split('@')[0].replace(/\D/g, '');
  const aa = clean(a);
  const bb = clean(b);
  return aa && bb && (aa === bb || String(a) === String(b));
}

function isReplyTo(msg, targetId) {
  if (!msg?.message || !targetId) return false;

  const check = (obj) => obj?.contextInfo?.stanzaId === targetId;
  const message = msg.message;

  if (check(message.extendedTextMessage)) return true;
  if (check(message.imageMessage)) return true;
  if (check(message.videoMessage)) return true;
  if (check(message.audioMessage)) return true;
  if (check(message.documentMessage)) return true;
  if (check(message.stickerMessage)) return true;

  const wrapped =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message;

  if (wrapped) {
    for (const key of Object.keys(wrapped)) {
      if (check(wrapped[key])) return true;
    }
  }

  return false;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [chatId, session] of sessions) {
    if (!session || now - session.updatedAt > SESSION_TTL) {
      sessions.delete(chatId);
    }
  }
}

function saveSession(chatId, data) {
  cleanupSessions();
  sessions.set(chatId, { ...data, updatedAt: Date.now() });
}

function getSession(chatId) {
  cleanupSessions();
  const session = sessions.get(chatId);
  if (session) session.updatedAt = Date.now();
  return session;
}

function deleteSession(chatId) {
  sessions.delete(chatId);
}

function safeTitle(value, fallback = 'Sinhala Cartoon') {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .slice(0, 100) || fallback;
}

async function apiGet(url, params) {
  const response = await axios.get(url, {
    params,
    timeout: API_TIMEOUT,
    validateStatus: (status) => status >= 200 && status < 500,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SHAVIYA-XMD-V2',
    },
  });

  if (response.status >= 400) {
    throw new Error(`API HTTP ${response.status}`);
  }

  return response.data;
}

async function react(conn, jid, key, emoji) {
  try {
    await conn.sendMessage(jid, { react: { text: emoji, key } });
  } catch (_) {}
}

async function sendSearchResults(conn, from, mek, query, results) {
  let text =
    `╭━━━〔 🎬 *SINHALA CARTOONS* 〕━━━╮\n` +
    `┃ 🔎 *Search:* ${query}\n` +
    `┃ 📚 *Results:* ${results.length}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

  results.forEach((item, i) => {
    const title = item.title || item.name || 'Unknown';
    const quality = item.quality ? ` • ${item.quality}` : '';
    const type = item.type ? ` • ${item.type}` : '';
    text += `*${i + 1}.* 🎞️ ${title}${quality}${type}\n`;
    if (item.rating) text += `   ⭐ ${item.rating}`;
    text += `\n\n`;
  });

  text +=
    `📌 *Reply to this message with a number*\n` +
    `Example: *1*\n\n` +
    `> ⚡ SHAVIYA-XMD V2`;

  return conn.sendMessage(from, { text }, { quoted: mek });
}

async function sendEpisodeList(conn, from, quoted, selected, episodes) {
  let text =
    `╭━━━〔 📺 *CARTOON EPISODES* 〕━━━╮\n` +
    `┃ 🎬 *${selected.title || 'Sinhala Cartoon'}*\n` +
    `┃ 📦 *Episodes:* ${episodes.length}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

  episodes.forEach((ep, i) => {
    const number = ep.episode || String(i + 1).padStart(2, '0');
    const title = ep.title || `Episode ${number}`;
    text += `*${i + 1}.* 📺 ${title}  _(EP ${number})_\n`;
  });

  text +=
    `\n📥 *Reply with the episode number*\n` +
    `Example: *1*\n\n` +
    `> ⚡ SHAVIYA-XMD V2`;

  return conn.sendMessage(from, { text }, { quoted });
}

async function sendEpisode(conn, from, quoted, seriesTitle, episode) {
  const streamUrl = episode?.stream_url || episode?.url || episode?.download_url;
  if (!streamUrl) throw new Error('Episode stream URL not found');

  const epNo = episode?.episode || '';
  const epTitle = episode?.title || `Episode ${epNo}`;
  const fileName = `${safeTitle(seriesTitle)} - EP ${safeTitle(epNo || '01')}.mp4`;

  const caption =
    `╭━━〔 🎬 *SINHALA CARTOON* 〕━━╮\n` +
    `┃ 🎞️ *${seriesTitle}*\n` +
    `┃ 📺 *${epTitle}*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `> ⚡ SHAVIYA-XMD V2`;

  // The API returns direct MP4 CDN URLs. Baileys can fetch the URL directly,
  // avoiding an unnecessary full-file buffer in the bot process.
  try {
    await conn.sendMessage(
      from,
      {
        video: { url: streamUrl },
        mimetype: 'video/mp4',
        fileName,
        caption,
      },
      { quoted }
    );
    return;
  } catch (videoError) {
    console.error('[SLCARTOON] video send failed:', videoError?.message || videoError);
  }

  // Fallback: send the same direct file as a document.
  try {
    await conn.sendMessage(
      from,
      {
        document: { url: streamUrl },
        mimetype: 'video/mp4',
        fileName,
        caption,
      },
      { quoted }
    );
  } catch (docError) {
    console.error('[SLCARTOON] document send failed:', docError?.message || docError);
    throw new Error('WhatsApp could not fetch/send this episode. The direct CDN link may be unavailable or the file may be too large.');
  }
}

cmd(
  {
    pattern: 'slcartoon',
    alias: ['slcartoons', 'sc', 'cartoon'],
    react: '🎬',
    desc: 'Search and download Sinhala cartoons',
    category: 'download',
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply, sender }) => {
    const chatId = from || m?.chat;
    const query = typeof q === 'string' ? q.trim() : '';

    try {
      if (!API_KEY) {
        return reply(
          '❌ *SLCARTOON API key is not configured.*\n\n' +
          'Add this to your .env:\n' +
          '`SLCARTOON_API_KEY=YOUR_API_KEY`\n\n' +
          'Then restart the bot.'
        );
      }

      if (!query) {
        return reply(
          `╭━━━〔 🎬 *SINHALA CARTOON DOWNLOADER* 〕━━━╮\n` +
          `┃\n` +
          `┃ 🔎 *Search:* .sc <cartoon name>\n` +
          `┃ 📥 *Select:* Reply with result number\n` +
          `┃ 📺 *Download:* Reply with episode number\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
          `📝 *Examples:*\n` +
          `• .sc Ben 10\n` +
          `• .sc Doraemon\n` +
          `• .sc Shinchan\n\n` +
          `> ⚡ SHAVIYA-XMD V2`
        );
      }

      // If a numeric query is received, first check whether this chat has a
      // pending search or episode menu. This makes `.sc 1` work naturally.
      if (/^\d+$/.test(query)) {
        const number = Number(query);
        const session = getSession(chatId);

        if (!session) {
          return reply('❌ *No active selection found.*\nUse `.sc <cartoon name>` first.');
        }

        if (session.stage === 'search') {
          const selected = session.results[number - 1];
          if (!selected) {
            return reply(`❌ Invalid result number. Reply with *1 - ${session.results.length}*.`);
          }

          const selectedUrl = selected.url || selected.link || selected.href;
          if (!selectedUrl) {
            return reply('❌ This result does not contain a valid cartoon URL.');
          }

          await react(conn, chatId, mek.key, '⏳');
          await reply(`⏳ *Loading episodes...*\n🎬 ${selected.title || 'Sinhala Cartoon'}`);

          let data;
          try {
            data = await apiGet(DOWNLOAD_API, {
              apiKey: API_KEY,
              text: selectedUrl,
            });
          } catch (e) {
            console.error('[SLCARTOON] download API:', e?.message || e);
            return reply('❌ *Download API error.* Please try again later.');
          }

          if (!data?.success) {
            return reply(`❌ *API error:* ${data?.message || 'Unable to fetch episodes.'}`);
          }

          const result = data.results || data.result || data.data;
          const episodes = Array.isArray(result?.episodes) ? result.episodes : [];

          if (!episodes.length) {
            return reply('❌ No episodes were returned for this cartoon.');
          }

          saveSession(chatId, {
            stage: 'episodes',
            sender,
            selected,
            title: result.title || selected.title || 'Sinhala Cartoon',
            episodes,
          });

          const episodeMsg = await sendEpisodeList(
            conn,
            chatId,
            mek,
            selected,
            episodes
          );

          const session2 = getSession(chatId);
          if (session2) {
            session2.episodeMessageId = episodeMsg?.key?.id;
            session2.updatedAt = Date.now();
          }

          return;
        }

        if (session.stage === 'episodes') {
          if (session.sender && !sameUser(session.sender, sender)) {
            return reply('❌ Only the user who started this download can select the episode.');
          }

          const episode = session.episodes[number - 1];
          if (!episode) {
            return reply(`❌ Invalid episode number. Reply with *1 - ${session.episodes.length}*.`);
          }

          await react(conn, chatId, mek.key, '📥');
          await conn.sendMessage(
            chatId,
            { text: `⏬ *Downloading:* ${session.title}\n📺 *${episode.title || `Episode ${number}`}*\n\nPlease wait...` },
            { quoted: mek }
          );

          try {
            await sendEpisode(conn, chatId, mek, session.title, episode);
            deleteSession(chatId);
            await react(conn, chatId, mek.key, '✅');
          } catch (e) {
            console.error('[SLCARTOON] episode send:', e?.stack || e);
            return reply(`❌ *Download failed.*\n${e?.message || 'Please try again.'}`);
          }

          return;
        }
      }

      // Normal search
      await react(conn, chatId, mek.key, '🔎');

      let data;
      try {
        data = await apiGet(SEARCH_API, {
          apiKey: API_KEY,
          text: query,
        });
      } catch (e) {
        console.error('[SLCARTOON] search API:', e?.message || e);
        return reply('❌ *Search API error.* Please try again later.');
      }

      if (!data?.success) {
        return reply(`❌ *Search failed:* ${data?.message || 'No results found.'}`);
      }

      const rawResults = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
          ? data.data
          : [];

      if (!rawResults.length) {
        return reply(`❌ No cartoons found for *${query}*.`);
      }

      const results = rawResults.slice(0, MAX_SEARCH_RESULTS);
      saveSession(chatId, {
        stage: 'search',
        sender,
        query,
        results,
      });

      const resultMsg = await sendSearchResults(conn, chatId, mek, query, results);
      const session = getSession(chatId);
      if (session) {
        session.searchMessageId = resultMsg?.key?.id;
        session.updatedAt = Date.now();
      }
    } catch (error) {
      console.error('[SLCARTOON] fatal:', error?.stack || error);
      return reply('❌ *Unexpected error occurred.* Please try again.');
    }
  }
);

// Optional free-text reply support:
// If the user replies directly to the search/episode message with a number,
// the command prefix is not required. This listener is installed by the
// plugin once and is compatible with Baileys' messages.upsert event.
function installReplyHandler() {
  if (global.__SHAVIYA_SLCARTOON_REPLY_HANDLER__) return;
  global.__SHAVIYA_SLCARTOON_REPLY_HANDLER__ = true;

  const install = () => {
    const conn = global.conn || global.sock || global.client;
    if (!conn?.ev?.on) return false;

    conn.ev.on('messages.upsert', async (update) => {
      try {
        if (update?.type === 'append') return;
        const msg = update?.messages?.[0];
        if (!msg?.message || msg.key?.fromMe) return;

        const chatId = msg.key.remoteJid;
        const text = getText(msg);
        if (!/^\d+$/.test(text)) return;

        const session = getSession(chatId);
        if (!session) return;

        const targetId = session.stage === 'search'
          ? session.searchMessageId
          : session.episodeMessageId;

        if (!targetId || !isReplyTo(msg, targetId)) return;
        if (session.sender && !sameUser(session.sender, getSender(msg))) return;

        const n = Number(text);
        if (session.stage === 'search') {
          const selected = session.results[n - 1];
          if (!selected) return;

          // Avoid dispatching duplicate processing if the user sends the same
          // reply multiple times while the API is still loading.
          if (session.processing) return;
          session.processing = true;

          const selectedUrl = selected.url || selected.link || selected.href;
          if (!selectedUrl) {
            session.processing = false;
            return;
          }

          await react(conn, chatId, msg.key, '⏳');
          await conn.sendMessage(chatId, { text: `⏳ *Loading episodes...*\n🎬 ${selected.title || 'Sinhala Cartoon'}` }, { quoted: msg });

          let data;
          try {
            data = await apiGet(DOWNLOAD_API, { apiKey: API_KEY, text: selectedUrl });
          } catch (e) {
            session.processing = false;
            return conn.sendMessage(chatId, { text: '❌ *Download API error.* Please try again.' }, { quoted: msg });
          }

          const result = data?.results || data?.result || data?.data;
          const episodes = Array.isArray(result?.episodes) ? result.episodes : [];
          if (!data?.success || !episodes.length) {
            session.processing = false;
            return conn.sendMessage(chatId, { text: `❌ ${data?.message || 'No episodes found.'}` }, { quoted: msg });
          }

          saveSession(chatId, {
            stage: 'episodes',
            sender: session.sender,
            selected,
            title: result.title || selected.title || 'Sinhala Cartoon',
            episodes,
          });

          const sent = await sendEpisodeList(conn, chatId, msg, selected, episodes);
          const newSession = getSession(chatId);
          if (newSession) newSession.episodeMessageId = sent?.key?.id;
          return;
        }

        if (session.stage === 'episodes') {
          const episode = session.episodes[n - 1];
          if (!episode || session.processing) return;
          session.processing = true;

          await react(conn, chatId, msg.key, '📥');
          await conn.sendMessage(chatId, { text: `⏬ *Downloading:* ${session.title}\n📺 *${episode.title || `Episode ${n}`}*\n\nPlease wait...` }, { quoted: msg });

          try {
            await sendEpisode(conn, chatId, msg, session.title, episode);
            deleteSession(chatId);
            await react(conn, chatId, msg.key, '✅');
          } catch (e) {
            session.processing = false;
            await conn.sendMessage(chatId, { text: `❌ *Download failed.*\n${e?.message || 'Please try again.'}` }, { quoted: msg });
          }
        }
      } catch (e) {
        console.error('[SLCARTOON] reply handler:', e?.message || e);
      }
    });

    return true;
  };

  if (!install()) {
    const timer = setInterval(() => {
      if (install()) clearInterval(timer);
    }, 2000);
    setTimeout(() => clearInterval(timer), 60_000);
  }
}

installReplyHandler();

module.exports = {
  SEARCH_API,
  DOWNLOAD_API,
};
