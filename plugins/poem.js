// plugins/poem.js — SHAVIYA-XMD V2
// .poem — AI Poem Generator (Sinhala + English)

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: 'poem',
    alias: ['kaviya', 'sinhalapoem', 'kavi'],
    desc: 'AI Poem generator (Sinhala/English)',
    category: 'ai',
    react: '📜',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `📜 *POEM GENERATOR*\n\n` +
            `Usage: .poem <topic>\n\n` +
            `Examples:\n` +
            `• .poem love\n` +
            `• .poem ආදරය\n` +
            `• .poem nature\n` +
            `• .poem මව\n\n` +
            `> 🌸 *SHAVIYA-XMD V2 · AI Poems*`
        );

        await conn.sendPresenceUpdate('composing', from);

        // Detect Sinhala using Unicode range
        const hasSinhala = /[\u0D80-\u0DFF]/.test(q);
        const lang = hasSinhala ? 'Sinhala' : 'English';

        const prompt = hasSinhala
            ? `Write a beautiful, emotional ${lang} poem about "${q}". Use 3-4 stanzas with poetic language. Only reply with the poem itself, no explanation.`
            : `Write a beautiful, emotional ${lang} poem about "${q}". Use 3-4 stanzas with rhyme if possible. Only reply with the poem itself, no explanation.`;

        // Try Gemini API first
        let poemText = null;
        try {
            const res = await axios.get(`https://gemini-ai-gold-eta.vercel.app/ai?q=${encodeURIComponent(prompt)}`, { timeout: 15000 });
            if (res.data?.status === true && res.data?.result) {
                poemText = res.data.result;
            }
        } catch (_) {}

        // Fallback API
        if (!poemText) {
            try {
                const res2 = await axios.get(`https://malvin-api.vercel.app/ai/copilot?text=${encodeURIComponent(prompt)}`, { timeout: 15000 });
                if (res2.data?.status && res2.data?.result) {
                    poemText = res2.data.result;
                }
            } catch (_) {}
        }

        if (!poemText) return reply('❌ AI is not responding. Please try again later.');

        const output =
            `📜 *AI POEM* — _${q}_\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${poemText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> 🌸 *SHAVIYA-XMD V2 · AI Poems*`;

        await conn.sendMessage(from, { text: output }, { quoted: mek });

    } catch (e) {
        console.error('[poem] error:', e.message);
        reply('❌ Poem generation failed. Please try again.');
    }
});
