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

// .rmeme — Random meme/video from r/TKASYLUM via meme-api.com
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

        const res = await axios.get('https://meme-api.com/gimme/TKASYLUM', { timeout: 15000 });
        const data = res.data;

        if (!data || !data.url) return reply('❌ No post found. Try again!');

        const title = data.title || 'TKASYLUM Meme';
        const ups = data.ups || 0;
        const postUrl = data.postLink || '';
        const mediaUrl = data.url;

        const isVideo = /\.(mp4|gifv|webm)(\?.*)?$/i.test(mediaUrl) || mediaUrl.includes('v.redd.it');

        const caption = `🔥 *${title}*\n\n` +
            `👍 ${ups.toLocaleString()} upvotes\n` +
            `📌 r/TKASYLUM\n` +
            `🔗 ${postUrl}\n\n` +
            `> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`;

        if (isVideo) {
            try {
                const vidRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
                const videoBuffer = Buffer.from(vidRes.data);
                await conn.sendMessage(from, {
                    video: videoBuffer,
                    caption,
                    mimetype: 'video/mp4'
                }, { quoted: mek });
            } catch (_) {
                await reply(`🔥 *${title}*\n\n🎬 ${mediaUrl}\n\n👍 ${ups} upvotes\n📌 r/TKASYLUM\n\n> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`);
            }
        } else {
            try {
                const imgRes = await axios.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    timeout: 20000,
                    headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/2.0' }
                });
                const imageBuffer = Buffer.from(imgRes.data);
                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption
                }, { quoted: mek });
            } catch (_) {
                await reply(`🔥 *${title}*\n\n🖼️ ${mediaUrl}\n\n👍 ${ups} upvotes\n📌 r/TKASYLUM\n\n> 🎲 *SHAVIYA-XMD V2 · TKASYLUM*`);
            }
        }

    } catch (e) {
        console.error('[rmeme] error:', e.message);
        reply('❌ Failed to fetch from r/TKASYLUM. Try again!');
    }
});
