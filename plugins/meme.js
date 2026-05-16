// ============================================================
//  meme.js — SHAVIYA-XMD V2
//  Reddit Meme Plugin  (meme-api.com wrapper — Heroku safe)
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// meme-api.com — public Reddit wrapper, no auth needed, Heroku safe
const MEME_API = 'https://meme-api.com/gimme';

// Popular safe subreddits
const MEME_SUBS = [
    'memes',
    'dankmemes',
    'me_irl',
    'funny',
    'wholesomememes',
    'ProgrammerHumor',
    'AdviceAnimals',
    'terriblefacebookmemes',
    'surrealmemes',
    'ComedyCemetery'
];

// ── Fetch meme from meme-api.com ─────────────────────────────
async function fetchMeme(subreddit = null) {
    const url = subreddit
        ? `${MEME_API}/${encodeURIComponent(subreddit)}`
        : MEME_API;

    const res = await axios.get(url, {
        timeout: 12000,
        headers: { 'User-Agent': 'SHAVIYA-XMD-V2/2.0' }
    });

    const data = res.data;
    if (!data || !data.url) throw new Error('API response invalid');

    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(data.url);
    if (!isImage) throw new Error('Not an image post');

    return {
        title:    data.title    || '😂 Meme',
        upvotes:  data.ups      || 0,
        subreddit:`r/${data.subreddit || 'memes'}`,
        postLink: data.postLink || '',
        url:      data.url
    };
}

// ── Retry helper ─────────────────────────────────────────────
async function getRandomMeme(tries = 4) {
    try { return await fetchMeme(null); } catch (_) {}

    const shuffled = [...MEME_SUBS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < tries; i++) {
        try { return await fetchMeme(shuffled[i]); } catch (_) {}
    }
    throw new Error('Reddit eken meme ekak ganna bari una. Kalina try karanna!');
}

// ── Helpers ──────────────────────────────────────────────────
async function downloadImage(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'SHAVIYA-XMD-V2/2.0' }
    });
    return Buffer.from(res.data);
}

function getMime(url) {
    const u = url.toLowerCase();
    if (u.includes('.png'))  return 'image/png';
    if (u.includes('.gif'))  return 'image/gif';
    if (u.includes('.webp')) return 'image/webp';
    return 'image/jpeg';
}

// ─────────────────────────────────────────────────────────────
//  .rmeme — Random meme
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'rmeme',
    alias:    ['meme', 'randommeme', 'redditmeme'],
    react:    '😂',
    desc:     'Reddit eken random meme ekak gena dena',
    category: 'fun',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        const meme   = await getRandomMeme();
        const buffer = await downloadImage(meme.url);

        const caption =
`😂 *Random Reddit Meme*

📝 *Title:*    ${meme.title}
⬆️ *Upvotes:* ${meme.upvotes.toLocaleString()}
📌 *Source:*  ${meme.subreddit}
${meme.postLink ? `\n🔗 ${meme.postLink}` : ''}
> ✦ *SHAVIYA-XMD V2* · © Savendra Dampriya`;

        await conn.sendMessage(from, {
            image:    buffer,
            mimetype: getMime(meme.url),
            caption:  caption
        }, { quoted: mek });

    } catch (err) {
        console.error('[meme.js] rmeme error:', err.message);
        await reply(`❌ *Meme ganna bari una!*\n\n⚠️ ${err.message}\n\nKalina try karanna 🙏`);
    }
});

// ─────────────────────────────────────────────────────────────
//  .subreddit <name> — Specific subreddit eken meme
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'subreddit',
    alias:    ['subr', 'rsub'],
    react:    '🎯',
    desc:     'Specific subreddit ekaken meme gena dena',
    category: 'fun',
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    const sub = (args[0] || '').trim().replace(/^r\//i, '');

    if (!sub) {
        return reply(
`⚠️ *Subreddit name ekak danna!*

📌 *Usage:* .subreddit <name>

*Examples:*
  ▸ \`.subreddit memes\`
  ▸ \`.subreddit wholesomememes\`
  ▸ \`.subreddit dankmemes\`
  ▸ \`.subreddit funny\``
        );
    }

    try {
        await conn.sendPresenceUpdate('composing', from);

        const meme   = await fetchMeme(sub);
        const buffer = await downloadImage(meme.url);

        const caption =
`😂 *Reddit Meme — r/${sub}*

📝 *Title:*    ${meme.title}
⬆️ *Upvotes:* ${meme.upvotes.toLocaleString()}
📌 *Source:*  ${meme.subreddit}
${meme.postLink ? `\n🔗 ${meme.postLink}` : ''}
> ✦ *SHAVIYA-XMD V2* · © Savendra Dampriya`;

        await conn.sendMessage(from, {
            image:    buffer,
            mimetype: getMime(meme.url),
            caption:  caption
        }, { quoted: mek });

    } catch (err) {
        console.error('[meme.js] subreddit error:', err.message);

        const msg = err.message?.includes('404') || err.message?.includes('invalid')
            ? `❌ *r/${sub}* subreddit eka neme, private, wattasara nsfw. Venath ekak try karanna!`
            : `❌ *Error!* ${err.message}\n\nKalina try karanna 🙏`;

        await reply(msg);
    }
});
