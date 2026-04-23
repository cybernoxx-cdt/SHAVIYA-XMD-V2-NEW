// plugins/meme.js — SHAVIYA-XMD V2
// .meme — Meme Generator

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: 'meme',
    alias: ['makememe', 'memegen', 'mm'],
    desc: 'Generate meme with custom text',
    category: 'ai',
    react: '😂',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `😂 *MEME GENERATOR*\n\n` +
            `Usage: .meme <top text> | <bottom text>\n\n` +
            `Examples:\n` +
            `• .meme When bot works | First time!\n` +
            `• .meme Me at 3AM | Coding bots\n` +
            `• .meme Meka hari | Nemeyi\n\n` +
            `> 😂 *SHAVIYA-XMD V2 · Meme Gen*`
        );

        const parts = q.split('|');
        const topText = parts[0]?.trim() || '';
        const bottomText = parts[1]?.trim() || '';

        await conn.sendPresenceUpdate('composing', from);
        await reply('⏳ Generating meme...');

        let imageBuffer = null;

        const memeTemplates = ['doge', 'drake', 'distracted', 'two-buttons', 'change-my-mind', 'gru-plan', 'uno-reverse', 'this-is-fine'];
        const randomTemplate = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];

        try {
            const top = encodeURIComponent(topText || '_');
            const bottom = encodeURIComponent(bottomText || '_');
            const apiUrl = `https://api.memegen.link/images/${randomTemplate}/${top}/${bottom}.png`;
            const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 20000 });
            if (res.data) imageBuffer = Buffer.from(res.data);
        } catch (_) {}

        if (!imageBuffer) {
            try {
                const redditRes = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
                if (redditRes.data?.url) {
                    const imgRes = await axios.get(redditRes.data.url, { responseType: 'arraybuffer', timeout: 15000 });
                    if (imgRes.data) imageBuffer = Buffer.from(imgRes.data);
                }
            } catch (_) {}
        }

        if (!imageBuffer) return reply('❌ Meme generation failed. Please try again.');

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `😂 *Meme Generated!*\n\n` +
                `📝 Top: ${topText || '(none)'}\n` +
                `📝 Bottom: ${bottomText || '(none)'}\n\n` +
                `> 😂 *SHAVIYA-XMD V2 · Meme Gen*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[meme] error:', e.message);
        reply('❌ Meme generation failed. Please try again.');
    }
});

// .randmeme — Random meme from Reddit
cmd({
    pattern: 'randmeme',
    alias: ['randomememe'],
    desc: 'Get a random meme from Reddit',
    category: 'ai',
    react: '🎲',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        const res = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
        if (!res.data?.url) return reply('❌ Could not fetch meme. Try again.');

        const imgRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 15000 });
        const imageBuffer = Buffer.from(imgRes.data);

        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `😂 *${res.data.title || 'Random Meme'}*\n📌 r/${res.data.subreddit || 'memes'}\n\n> 😂 *SHAVIYA-XMD V2 · Meme Gen*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[randmeme] error:', e.message);
        reply('❌ Failed to fetch random meme.');
    }
});

// .rmeme — Random meme/video from multiple subreddits (photos + videos)
cmd({
    pattern: 'rmeme',
    alias: ['tkmeme', 'tkasylum'],
    desc: 'Get a random meme or video from multiple subreddits',
    category: 'fun',
    react: '🔥',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);
        await reply('🔥 Fetching random meme...');

        const imageSubs = ['TKASYLUM', 'memes', 'dankmemes', 'me_irl', 'funny'];
        const videoSubs = ['TKASYLUM', 'memes', 'funny', 'animememes'];

        // 60% image, 40% video
        const doVideo = Math.random() < 0.4;

        if (!doVideo) {
            // IMAGE PATH via meme-api.com
            const sub = imageSubs[Math.floor(Math.random() * imageSubs.length)];

            const res = await axios.get(`https://meme-api.com/gimme/${sub}/5`, { timeout: 15000 });
            const posts = res.data?.memes;
            if (!posts || posts.length === 0) return reply('❌ No posts found. Try again!');

            const safe = posts.filter(p => !p.nsfw);
            if (safe.length === 0) return reply('❌ No safe posts found. Try again!');

            const data = safe[Math.floor(Math.random() * safe.length)];
            const title     = data.title || 'Random Meme';
            const ups       = data.ups || 0;
            const postUrl   = data.postLink || '';
            const mediaUrl  = data.url;
            const subreddit = data.subreddit || sub;

            const caption = `🔥 *${title}*\n\n` +
                `👍 ${ups.toLocaleString()} upvotes\n` +
                `📌 r/${subreddit}\n` +
                `🔗 ${postUrl}\n\n` +
                `> 🎲 *SHAVIYA-XMD V2 · Random Meme*`;

            try {
                const imgRes = await axios.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    timeout: 20000,
                    headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/2.0' }
                });
                await conn.sendMessage(from, {
                    image: Buffer.from(imgRes.data), caption
                }, { quoted: mek });
            } catch (_) {
                await reply(`🔥 *${title}*\n\n🖼️ ${mediaUrl}\n\n👍 ${ups} upvotes\n📌 r/${subreddit}\n\n> 🎲 *SHAVIYA-XMD V2 · Random Meme*`);
            }

        } else {
            // VIDEO PATH via Reddit JSON with browser User-Agent
            const sub  = videoSubs[Math.floor(Math.random() * videoSubs.length)];
            const sort = Math.random() < 0.5 ? 'hot' : 'top';
            const time = sort === 'top' ? '?t=week&limit=50' : '?limit=50';

            const redditRes = await axios.get(
                `https://www.reddit.com/r/${sub}/${sort}.json${time}`,
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            );

            const posts = redditRes.data?.data?.children || [];
            const videoPosts = posts.filter(p => {
                const d = p.data;
                return !d.stickied && !d.is_self && !d.over_18 &&
                    d.is_video && d.media?.reddit_video?.fallback_url;
            });

            if (videoPosts.length === 0) {
                // Fallback to image
                const sub2 = imageSubs[Math.floor(Math.random() * imageSubs.length)];
                const res2 = await axios.get(`https://meme-api.com/gimme/${sub2}`, { timeout: 15000 });
                const data2 = res2.data;
                if (!data2?.url) return reply('❌ No posts found. Try again!');

                const imgRes = await axios.get(data2.url, {
                    responseType: 'arraybuffer', timeout: 20000,
                    headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/2.0' }
                });
                const cap2 = `🔥 *${data2.title || 'Random Meme'}*\n\n👍 ${(data2.ups||0).toLocaleString()} upvotes\n📌 r/${data2.subreddit || sub2}\n\n> 🎲 *SHAVIYA-XMD V2 · Random Meme*`;
                return await conn.sendMessage(from, {
                    image: Buffer.from(imgRes.data), caption: cap2
                }, { quoted: mek });
            }

            const picked   = videoPosts[Math.floor(Math.random() * videoPosts.length)].data;
            const videoUrl = picked.media.reddit_video.fallback_url;
            const title    = picked.title || 'Random Video Meme';
            const ups      = picked.ups || 0;
            const postUrl  = `https://reddit.com${picked.permalink}`;

            const caption = `🎬 *${title}*\n\n` +
                `👍 ${ups.toLocaleString()} upvotes\n` +
                `📌 r/${picked.subreddit || sub}\n` +
                `🔗 ${postUrl}\n\n` +
                `> 🎲 *SHAVIYA-XMD V2 · Random Meme*`;

            try {
                const vidRes = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                await conn.sendMessage(from, {
                    video: Buffer.from(vidRes.data), caption, mimetype: 'video/mp4'
                }, { quoted: mek });
            } catch (_) {
                await reply(`🎬 *${title}*\n\n🔗 ${videoUrl}\n\n👍 ${ups} upvotes\n📌 r/${picked.subreddit || sub}\n\n> 🎲 *SHAVIYA-XMD V2 · Random Meme*`);
            }
        }

    } catch (e) {
        console.error('[rmeme] error:', e.message);
        reply('❌ Failed to fetch meme. Try again!');
    }
});
