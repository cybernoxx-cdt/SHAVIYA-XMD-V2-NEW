// ============================================================
//  ai.js — SHAVIYA-XMD V2
//  DeepSeek AI Assistant — FIXED: timeout + response parsing
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');
const axios   = require('axios');

cmd({
    pattern:  'ds',
    react:    '🧠',
    desc:     'DeepSeek AI Assistant',
    category: 'ai',
    filename: __filename
},
async (conn, mek, m, { q, reply }) => {
    try {
        if (!q) return reply(
            `╔══════════════════════╗\n` +
            `║  🧠 *DeepSeek AI*  🧠  ║\n` +
            `╚══════════════════════╝\n\n` +
            `*Usage:* .ds <your question>\n` +
            `*Example:* .ds What is Node.js?\n\n` +
            `> ⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ`
        );

        await conn.sendPresenceUpdate('composing', m.chat);

        const api = `https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4?q=${encodeURIComponent(q)}&apitoken=e76n2P`;

        let res;
        try {
            const response = await axios.get(api, { timeout: 30000 });
            res = response.data;
        } catch (fetchErr) {
            if (fetchErr.code === 'ECONNABORTED' || fetchErr.message.includes('timeout')) {
                return reply('⏱️ *DeepSeek AI is taking too long to respond. Please try again!*');
            }
            return reply(`❌ *API connection failed:* ${fetchErr.message}`);
        }

        if (!res) return reply('❌ *No response from AI. Please try again!*');

        // Extract answer — handle all common response shapes
        const answer =
            res.result     ||
            res.response   ||
            res.answer     ||
            res.message    ||
            res.reply      ||
            res.output     ||
            res.text       ||
            (typeof res === 'string' ? res : null) ||
            JSON.stringify(res);

        if (!answer || answer === '{}' || answer === 'null') {
            return reply('❌ *AI returned an empty response. Try again!*');
        }

        const modelInfo = res.model ? `📌 *Model:* ${res.model}\n\n` : '';
        const footer    = '\n\n> ⚡ _Sʜᴀᴠɪʏᴀ Xᴍᴅ · DeepSeek AI_';

        return reply(modelInfo + answer + footer);

    } catch (e) {
        console.error('[DS AI ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});
