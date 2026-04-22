// plugins/ai.js — SHAVIYA-XMD V2
// .ai / .ask — Fixed AI with multi-API fallback

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

// Shared AI fetch function with 3 fallbacks
async function fetchAI(prompt) {
    // API 1: Gemini via vercel proxy
    try {
        const r = await axios.get(
            `https://gemini-ai-gold-eta.vercel.app/ai?q=${encodeURIComponent(prompt)}`,
            { timeout: 15000 }
        );
        if (r.data?.status === true && r.data?.result) return r.data.result;
    } catch (_) {}

    // API 2: Copilot via malvin proxy
    try {
        const r2 = await axios.get(
            `https://malvin-api.vercel.app/ai/copilot?text=${encodeURIComponent(prompt)}`,
            { timeout: 15000 }
        );
        if (r2.data?.status && r2.data?.result) return r2.data.result;
    } catch (_) {}

    // API 3: dark-yasiya free
    try {
        const r3 = await axios.get(
            `https://api.dark-yasiya-api.site/ai/gpt4?text=${encodeURIComponent(prompt)}`,
            { timeout: 15000 }
        );
        if (r3.data?.result?.reply || r3.data?.result) {
            return r3.data.result?.reply || r3.data.result;
        }
    } catch (_) {}

    return null;
}

// ── .ai — Main AI command ──
cmd({
    pattern: 'ai',
    alias: ['ask', 'gpt', 'chatgpt', 'gemini'],
    desc: 'AI Assistant (multi-API fallback)',
    category: 'ai',
    react: '🤖',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        let userText = q?.trim();

        // Support reply-to-message
        if (!userText && m?.quoted) {
            userText =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text ||
                m.quoted.text;
        }

        if (!userText) return reply(
            `🤖 *AI ASSISTANT*\n\n` +
            `Usage: .ai <your question>\n\n` +
            `Examples:\n` +
            `• .ai What is the speed of light?\n` +
            `• .ai Write a Python hello world\n` +
            `• .ai කොළඹ ගැන කියන්න\n\n` +
            `> 🤖 *SHAVIYA-XMD V2 · AI*`
        );

        await conn.sendPresenceUpdate('composing', from);

        const answer = await fetchAI(userText);
        if (!answer) return reply('❌ AI is not responding right now. Please try again later.');

        await conn.sendMessage(from, {
            text: `🤖 *AI RESPONSE*\n━━━━━━━━━━━━━━━\n\n${answer}\n\n> 🤖 *SHAVIYA-XMD V2 · AI*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[ai] error:', e.message);
        reply('❌ AI error: ' + e.message);
    }
});

// ── .copilot — Microsoft Copilot style ──
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© SHAVIYA TECH (Copilot AI) 🔖',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=18772241042:+18772241042\nEND:VCARD`
        }
    }
};

cmd({
    pattern: 'copilot',
    alias: ['cop', 'microsoft', 'ai2'],
    desc: 'Chat with Microsoft Copilot AI',
    category: 'ai',
    react: '🧠',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        let userText = q?.trim();

        if (!userText && m?.quoted) {
            userText =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text ||
                m.quoted.text;
        }

        if (!userText) return reply(
            `🧠 *COPILOT AI*\n\n` +
            `Usage: .copilot <question>\n` +
            `Or reply to any message with .copilot\n\n` +
            `> 🧠 *SHAVIYA-XMD V2 · Copilot*`
        );

        await conn.sendPresenceUpdate('composing', from);

        // Try copilot API first
        let answer = null;
        try {
            const r = await axios.get(
                `https://malvin-api.vercel.app/ai/copilot?text=${encodeURIComponent(userText)}`,
                { timeout: 15000 }
            );
            if (r.data?.status && r.data?.result) answer = r.data.result;
        } catch (_) {}

        if (!answer) answer = await fetchAI(userText);
        if (!answer) return reply('❌ Copilot not responding. Please try again.');

        const responseMsg =
            `🧠 *Microsoft Copilot AI*\n` +
            `━━━━━━━━━━━━━━━\n\n` +
            `${answer}\n\n` +
            `> 🤖 *SHAVIYA-XMD V2 · Copilot*`;

        await conn.sendMessage(from, { text: responseMsg }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[copilot] error:', e.message);
        reply('❌ Copilot error: ' + e.message);
    }
});
