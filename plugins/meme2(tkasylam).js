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

        // Memegen API (free, no key needed)
        const memeTemplates = ['doge', 'drake', 'distracted', 'two-buttons', 'change-my-mind', 'gru-plan', 'uno-reverse', 'this-is-fine'];
        const randomTemplate = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];

        try {
            const top = encodeURIComponent(topText || '_');
            const bottom = encodeURIComponent(bottomText || '_');
            const apiUrl = `https://api.memegen.link/images/${randomTemplate}/${top}/${bottom}.png`;
            const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 20000 });
            if (res.data) imageBuffer = Buffer.from(res.data);
        } catch (_) {}

        // Fallback: random meme from reddit
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

// .rmeme — Random meme/video from r/TKASYLUM (Hot + New mix)
cmd({
    pattern: 'rmeme',
    alias: ['tkmeme', 'tkasylum'],
    desc: 'Get a random meme or video from r/TKASYLUM',
    category: 'fun',
    react: '🔥',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);
        await reply('🔥 Fetching from r/TKASYLUM...');

        // Randomly pick hot or new for variety
        const sorts = ['hot', 'new', 'top'];
        const sort = sorts[Math.floor(Math.random() * sorts.length)];
        const timeParam = sort === 'top' ? '?t=week&limit=50' : '?limit=50';

        const headers = {
            'User-Agent': 'SHAVIYA-XMD-Bot/2.0 (by /u/shaviyabot)'
        };

        const url = `https://www.reddit.com/r/TKASYLUM/${sort}.json${timeParam}`;
        const res = await axios.get(url, { headers, timeout: 15000 });

        const posts = res.data?.data?.children;
        if (!posts || posts.length === 0) return reply('❌ No posts found. Try again.');

        // Filter only image and video posts (no text posts)
        const mediaPosts = posts.filter(p => {
            const post = p.data;
            if (post.stickied || post.is_self) return false;

            const url = post.url || '';
            const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
            const isRedditVideo = post.is_video && post.media?.reddit_video?.fallback_url;
            const isGifVideo = post.url?.includes('v.redd.it');
            const isImgur = url.includes('imgur.com');
            const isRedditGallery = post.is_gallery;

            return isImage || isRedditVideo || isGifVideo || isImgur || isRedditGallery;
        });

        if (mediaPosts.length === 0) return reply('❌ No media posts found right now. Try again!');

        // Pick a random post from filtered list
        const picked = mediaPosts[Math.floor(Math.random() * mediaPosts.length)].data;
        const title = picked.title || 'TKASYLUM Meme';
        const ups = picked.ups || 0;
        const comments = picked.num_comments || 0;

        // Check if video
        const isVideo = picked.is_video && picked.media?.reddit_video?.fallback_url;

        if (isVideo) {
            // Send as video
            const videoUrl = picked.media.reddit_video.fallback_url;

            try {
                const vidRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 });
                const videoBuffer = Buffer.from(vidRes.data);

                await conn.sendMessage(from, {
                    video: videoBuffer,
                    caption: `🔥 *${title}*\n\n` +
                        `👍 ${ups.toLocaleString()} upvotes  💬 ${comments} comments\n` +
                        `📌 r/TKASYLUM\n\n` +
                        `> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`,
                    mimetype: 'video/mp4'
                }, { quoted: mek });
            } catch (_) {
                // Video download failed, send link
                await reply(
                    `🔥 *${title}*\n\n` +
                    `🎬 Video: ${videoUrl}\n\n` +
                    `👍 ${ups.toLocaleString()} upvotes  💬 ${comments} comments\n` +
                    `📌 r/TKASYLUM\n\n` +
                    `> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`
                );
            }

        } else {
            // Send as image
            let imageUrl = picked.url;

            // Fix imgur links
            if (imageUrl.includes('imgur.com') && !imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                imageUrl = imageUrl + '.jpg';
            }

            try {
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 20000,
                    headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/2.0' }
                });
                const imageBuffer = Buffer.from(imgRes.data);

                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: `🔥 *${title}*\n\n` +
                        `👍 ${ups.toLocaleString()} upvotes  💬 ${comments} comments\n` +
                        `📌 r/TKASYLUM\n\n` +
                        `> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`
                }, { quoted: mek });
            } catch (_) {
                await reply(
                    `🔥 *${title}*\n\n` +
                    `🖼️ ${imageUrl}\n\n` +
                    `👍 ${ups.toLocaleString()} upvotes  💬 ${comments} comments\n` +
                    `📌 r/TKASYLUM\n\n` +
                    `> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`
                );
            }
        }

    } catch (e) {
        console.error('[rmeme] error:', e.message);
        reply('❌ Failed to fetch from r/TKASYLUM. Try again!');
    }
});
