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
    alias: ['randomememe', 'rm'],
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
