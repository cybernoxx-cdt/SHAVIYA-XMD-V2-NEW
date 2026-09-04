// plugins/sudu.js — SHAVIYA-XMD V2
// .sudu — AI Chat plugin (Zanta AI "Wife" API)
// Everything is hardcoded below — no .env setup needed.

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

// ===================== HARDCODED CONFIG =====================
const AI_API_URL = 'https://api.zanta-mini.store/api/wife';
const AI_API_KEY = 'zan_vWpU1lkr_g6wwxdlvyv';
// ==============================================================

// Simple in-memory per-user conversation memory (resets on bot restart)
const chatMemory = new Map();
const MAX_HISTORY = 6;

function getHistory(userId) {
    if (!chatMemory.has(userId)) chatMemory.set(userId, []);
    return chatMemory.get(userId);
}

async function callAiApi(userText) {
    const res = await axios.get(AI_API_URL, {
        params: { apiKey: AI_API_KEY, text: userText },
        timeout: 25000
    });

    const data = res.data;

    if (!data || data.success !== true || !data.result || !data.result.reply) {
        throw new Error('Unexpected API response: ' + JSON.stringify(data).slice(0, 300));
    }

    return data.result.reply;
}

cmd({
    pattern: 'sudu',
    alias: ['sudumd', 'wife', 'ai', 'chat'],
    desc: 'Chat with AI (Zanta AI Wife)',
    category: 'ai',
    react: '🤖',
    filename: __filename
},
async (conn, mek, m, { from, q, sender, reply }) => {
    try {
        if (!q) {
            return reply(
                `🤖 *SUDU AI CHAT*\n\n` +
                `Usage: .sudu <your message>\n\n` +
                `Example:\n` +
                `• .sudu hello, how are you?\n` +
                `• .sudu මට Java code එකක් ලියලා දෙන්න\n\n` +
                `> 💎 SHAVIYA-XMD V2 · AI Chat`
            );
        }

        await conn.sendPresenceUpdate('composing', from);

        const userId = sender || from;
        const history = getHistory(userId);

        const replyText = await callAiApi(q);

        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: replyText });
        while (history.length > MAX_HISTORY * 2) history.shift();

        await reply(replyText);

    } catch (err) {
        console.error('[sudu.js] Error:', err?.message || err);
        await reply(
            `❌ AI is not responding right now.\n` +
            `Reason: ${err?.message || 'Unknown error'}`
        );
    }
});

// .suduclear — reset a user's conversation memory
cmd({
    pattern: 'suduclear',
    alias: ['clearsudu', 'resetsudu'],
    desc: 'Clear your AI chat memory',
    category: 'ai',
    react: '🧹',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    const userId = sender || from;
    chatMemory.delete(userId);
    await reply('🧹 Your AI chat memory has been cleared.');
});
