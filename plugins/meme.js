// ============================================================
//  meme.js — SHAVIYA-XMD V2
//  Reddit Random Meme Plugin
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

'use strict';

const { cmd }  = require('../command');
const axios    = require('axios');

// ── Reddit subreddits list (meme categories) ──────────────────
const MEME_SUBS = [
    'memes',
    'dankmemes',
    'me_irl',
    'AdviceAnimals',
    'funny',
    'terriblefacebookmemes',
    'ComedyCemetery',
    'surrealmemes',
    'wholesomememes',
    'ProgrammerHumor'
];

// ── Fetch one random meme from a subreddit ────────────────────
async function fetchRedditMeme(subreddit) {
    const url = `https://www.reddit.com/r/${subreddit}/random.json?limit=1`;
    const res = await axios.get(url, {
        headers: { 'User-Agent': 'SHAVIYA-XMD-V2/2.0 (by u/ShaviyaBot)' },
        timeout: 10000
    });

    // Reddit random endpoint returns [[post], [comments]]
    const data = res.data;
    let post = null;

    if (Array.isArray(data) && data[0]?.data?.children?.length > 0) {
        post = data[0].data.children[0].data;
    } else if (data?.data?.children?.length > 0) {
        // Fallback: .json endpoint
        post = data.data.children[0].data;
    }

    if (!post) throw new Error('Post data not found');

    // Only image posts (jpg/png/gif/webp)
    const url_lower = (post.url || '').toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/.test(url_lower);
    if (!isImage || post.over_18) throw new Error('Not a valid image post');

    return {
        title:     post.title || '😂 Meme',
        upvotes:   post.ups   || 0,
        subreddit: post.subreddit_name_prefixed || `r/${subreddit}`,
        url:       post.url,
        permalink: `https://reddit.com${post.permalink}`
    };
}

// ── Main helper: try up to `tries` times across random subs ──
async function getRandomMeme(tries = 5) {
    const shuffled = [...MEME_SUBS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < tries; i++) {
        const sub = shuffled[i % shuffled.length];
        try {
            return await fetchRedditMeme(sub);
        } catch (_) {
            // Try next subreddit
        }
    }
    throw new Error('Reddit meke labena post ekak ganna bari una. Pawichchi karanna!')
}

// ─────────────────────────────────────────────────────────────
//  .rmeme  — Random meme from Reddit
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'rmeme',
    alias:    ['meme', 'redditm', 'reddit_meme'],
    react:    '😂',
    desc:     'Reddit eken random meme ekak gena dena',
    category: 'fun',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        const meme = await getRandomMeme();

        // Download image as buffer
        const imgRes = await axios.get(meme.url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'SHAVIYA-XMD-V2/2.0' },
            timeout: 15000
        });

        const imgBuffer = Buffer.from(imgRes.data);

        // Detect mime type from URL
        const urlLower = meme.url.toLowerCase();
        let mimetype = 'image/jpeg';
        if (urlLower.includes('.png'))  mimetype = 'image/png';
        if (urlLower.includes('.gif'))  mimetype = 'image/gif';
        if (urlLower.includes('.webp')) mimetype = 'image/webp';

        const caption =
`😂 *Random Reddit Meme*

📝 *Title:*  ${meme.title}

⬆️ *Upvotes:* ${meme.upvotes.toLocaleString()}
📌 *Source:*  ${meme.subreddit}

> 🔗 ${meme.permalink}
> ✦ *SHAVIYA-XMD V2* · © Savendra Dampriya`;

        await conn.sendMessage(from, {
            image:    imgBuffer,
            mimetype: mimetype,
            caption:  caption
        }, { quoted: mek });

    } catch (err) {
        console.error('[meme.js] Error:', err.message);
        await reply(`❌ *Meme ganna bari una!*\n\n⚠️ ${err.message || 'Reddit API error'}\n\nKalina kiyanna!`);
    }
});

// ─────────────────────────────────────────────────────────────
//  .rmeme <subreddit>  — Specific subreddit eken meme ganna
//  e.g.  .rmeme wholesomememes
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'subreddit',
    alias:    ['subr', 'rsub'],
    react:    '🎯',
    desc:     'Specific subreddit ekaken meme ekak gena dena',
    category: 'fun',
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const sub = (args[0] || '').trim().replace(/^r\//i, '');
        if (!sub) {
            return reply(
`⚠️ *Subreddit ekak danna!*

📌 *Usage:* .subreddit <name>

*Examples:*
  ▸ \`.subreddit memes\`
  ▸ \`.subreddit wholesomememes\`
  ▸ \`.subreddit dankmemes\`
  ▸ \`.subreddit funny\``
            );
        }

        await conn.sendPresenceUpdate('composing', from);
        await reply(`🔍 *r/${sub}* eken meme ekak hathanawa...`);

        const meme = await fetchRedditMeme(sub);

        const imgRes = await axios.get(meme.url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'SHAVIYA-XMD-V2/2.0' },
            timeout: 15000
        });
        const imgBuffer = Buffer.from(imgRes.data);

        const urlLower = meme.url.toLowerCase();
        let mimetype = 'image/jpeg';
        if (urlLower.includes('.png'))  mimetype = 'image/png';
        if (urlLower.includes('.gif'))  mimetype = 'image/gif';
        if (urlLower.includes('.webp')) mimetype = 'image/webp';

        const caption =
`😂 *Reddit Meme — r/${sub}*

📝 *Title:*  ${meme.title}

⬆️ *Upvotes:* ${meme.upvotes.toLocaleString()}
📌 *Source:*  ${meme.subreddit}

> 🔗 ${meme.permalink}
> ✦ *SHAVIYA-XMD V2* · © Savendra Dampriya`;

        await conn.sendMessage(from, {
            image:    imgBuffer,
            mimetype: mimetype,
            caption:  caption
        }, { quoted: mek });

    } catch (err) {
        console.error('[meme.js] Subreddit Error:', err.message);

        const notFound = err.message?.includes('Not a valid') ||
                         err.message?.includes('Post data');

        await reply(
            notFound
            ? `❌ *r/${args[0]}* eken image meme ekak labuna na!\n\n💡 Meka private/NSFW/invalid subreddit ekak wenna puluwan. Venath ekak try karanna.`
            : `❌ *Error!* ${err.message}\n\nKalina kiyanna!`
        );
    }
});
