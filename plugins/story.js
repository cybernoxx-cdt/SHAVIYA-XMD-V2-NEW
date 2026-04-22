// plugins/story.js — SHAVIYA-XMD V2
// .story — AI Short Story Generator

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: 'story',
    alias: ['aistory', 'kathandara', 'tale'],
    desc: 'AI Short Story Generator',
    category: 'ai',
    react: '📖',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `📖 *STORY GENERATOR*\n\n` +
            `Usage: .story <topic or genre>\n\n` +
            `Examples:\n` +
            `• .story horror\n` +
            `• .story ආදර කතා\n` +
            `• .story adventure in jungle\n` +
            `• .story mystery\n\n` +
            `> 📚 *SHAVIYA-XMD V2 · AI Stories*`
        );

        await conn.sendPresenceUpdate('composing', from);

        const hasSinhala = /[\u0D80-\u0DFF]/.test(q);
        const lang = hasSinhala ? 'Sinhala' : 'English';

        const prompt = `Write a short, engaging ${lang} story about "${q}". Keep it under 200 words. Make it creative with a beginning, middle and ending. Only reply with the story itself.`;

        let storyText = null;

        try {
            const res = await axios.get(`https://gemini-ai-gold-eta.vercel.app/ai?q=${encodeURIComponent(prompt)}`, { timeout: 20000 });
            if (res.data?.status === true && res.data?.result) storyText = res.data.result;
        } catch (_) {}

        if (!storyText) {
            try {
                const res2 = await axios.get(`https://malvin-api.vercel.app/ai/copilot?text=${encodeURIComponent(prompt)}`, { timeout: 20000 });
                if (res2.data?.status && res2.data?.result) storyText = res2.data.result;
            } catch (_) {}
        }

        if (!storyText) return reply('❌ AI is not responding. Please try again later.');

        const output =
            `📖 *AI STORY* — _${q}_\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${storyText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> 📚 *SHAVIYA-XMD V2 · AI Stories*`;

        await conn.sendMessage(from, { text: output }, { quoted: mek });

    } catch (e) {
        console.error('[story] error:', e.message);
        reply('❌ Story generation failed. Please try again.');
    }
});
