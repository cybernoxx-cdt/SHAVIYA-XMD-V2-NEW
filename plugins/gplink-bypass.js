// plugins/gplink-bypass.js
// ✅ GPLink / Shortlink Bypass — uses bypass.vip API with fallback
// Usage: .gplink <url>

'use strict';

const axios   = require('axios');
const { cmd } = require('../command');

// ── Supported shortlink domains ──────────────────────────────────
const SHORTLINK_DOMAINS = [
  'gplinks.co', 'gplinks.in', 'gplink.in',
  'mdisklink.link', 'mdisk.me', 'mdiskplay.com',
  'linkvertise.com', 'link-to.net', 'direct-link.net',
  'workupload.com', 'shrinkme.io', 'shorte.st',
  'ouo.io', 'bc.vc', 'adf.ly',
  'shrinkforearn.in', 'earnl.ink', 'indianshortner.com',
  'bitly.com', 'bit.ly', 'tinyurl.com',
];

function isShortlink(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return SHORTLINK_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

// ── API list with response field extractors ───────────────────────
const APIS = [
  {
    name: 'bypass.vip',
    build: (url) => `https://api.bypass.vip/?url=${encodeURIComponent(url)}`,
    extract: (data) => data?.result || data?.destination || null,
  },
  {
    name: 'bypass.bot.nu',
    build: (url) => `https://bypass.bot.nu/bypass?url=${encodeURIComponent(url)}`,
    extract: (data) => data?.result || data?.destination || data?.url || null,
  },
  {
    name: 'techzbots API',
    build: (url) => `https://techzbots1-bypass-api-v1.p.rapidapi.com/blink?link=${encodeURIComponent(url)}`,
    extract: (data) => data?.result || data?.link || null,
    headers: { 'x-rapidapi-host': 'techzbots1-bypass-api-v1.p.rapidapi.com' },
  },
];

async function bypassLink(url) {
  for (const api of APIS) {
    try {
      const res = await axios.get(api.build(url), {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...(api.headers || {}),
        },
      });
      const result = api.extract(res.data);
      if (result && result.startsWith('http')) {
        return { link: result, source: api.name };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Main command ─────────────────────────────────────────────────
cmd({
  pattern: 'gplink',
  alias: ['bypass', 'unshorten', 'bl'],
  desc: 'Bypass GPLink / shortlinks and get direct URL',
  category: 'tools',
  react: '🔗',
  use: '.gplink <url>',
  filename: __filename,
},
async (conn, mek, m, { from, args, q, reply }) => {
  try {
    const url = q?.trim() || args[0];

    // ── No URL given ──
    if (!url) {
      return reply(
        `❌ *URL එකක් දෙන්න!*\n\n` +
        `📌 *Usage:*\n` +
        `  *.gplink <url>*\n\n` +
        `📋 *Supported:*\n` +
        `  gplinks.co, mdisk.me, linkvertise\n` +
        `  ouo.io, shrinkme.io, bit.ly + more\n\n` +
        `> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`
      );
    }

    // ── Validate URL format ──
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return reply(`❌ *Invalid URL!*\n\nValid URL එකක් දෙන්න.\n> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`);
    }

    // ── Warn if not a known shortlink but try anyway ──
    const known = isShortlink(url);

    // ── Processing message ──
    await reply(
      `⏳ *Bypassing link...*\n\n` +
      `🔗 *URL:* ${url}\n` +
      `${known ? '✅ Recognized shortlink' : '⚠️ Unknown shortlink domain — trying anyway'}\n\n` +
      `> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`
    );

    // ── Attempt bypass ──
    const start = Date.now();
    const result = await bypassLink(url);
    const elapsed = Date.now() - start;

    if (!result) {
      return reply(
        `❌ *Bypass Failed!*\n\n` +
        `සියලු APIs fail වුණා. පස්සේ try කරන්න.\n\n` +
        `> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`
      );
    }

    // ── Success ──
    return reply(
      `✅ *Bypass Successful!*\n\n` +
      `🔗 *Direct Link:*\n${result.link}\n\n` +
      `⚡ *Time:* ${elapsed}ms\n` +
      `🛰️ *API:* ${result.source}\n\n` +
      `> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`
    );

  } catch (err) {
    console.error('[GPLINK BYPASS]:', err.message);
    return reply(`❌ *Error:* ${err.message}\n\n> 𝑺𝑯𝑨𝑽𝑰𝒀𝑨-𝑿𝑴𝑫 𝑽𝟮 ⚡`);
  }
});
