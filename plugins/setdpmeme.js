// plugins/setdpmeme.js — SHAVIYA-XMD V2
// Set bot DP from random meme
// Coded by CDT | Crash Delta Team

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');
const Config  = require('../config');

cmd({
  pattern:  'setdpmeme',
  desc:     'Set bot profile picture from a random meme',
  category: 'owner',
  fromMe:   true,
  filename: __filename,
}, async (conn, m, mek, { reply }) => {
  try {
    // ── Owner check ──────────────────────────────────
    const sender   = (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
    const ownerNum = (Config.OWNER_NUMBER || '').toString().replace(/[^0-9]/g, '');

    if (!ownerNum || sender !== ownerNum) {
      return reply('❌ Only the bot owner can use this command.');
    }

    await reply('⏳ Fetching meme...');

    // ── Fetch meme from API ──────────────────────────
    const { data: json } = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
    if (!json?.url) return reply('❌ Failed to get meme URL.');

    // ── Download image ───────────────────────────────
    const { data: imgData } = await axios.get(json.url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    // ── Set profile picture ──────────────────────────
    await conn.updateProfilePicture(conn.user.id, Buffer.from(imgData));

    return reply(
      `✅ *Meme DP set!*\n` +
      `📌 *${json.title || 'Meme'}*\n` +
      `🔗 r/${json.subreddit || 'memes'}`
    );

  } catch (err) {
    console.error('[setdpmeme]', err.message);
    if (err.message?.includes('not-authorized')) {
      return reply('❌ Bot not authorized to change DP.\nWhatsApp privacy settings check කරන්න.');
    }
    return reply('❌ Failed to set meme DP. Try again.');
  }
});
