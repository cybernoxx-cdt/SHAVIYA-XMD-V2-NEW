// plugins/deepseek.js — SHAVIYA-XMD V2 | DeepSeek AI Chat Plugin
// API: https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4
// Usage: .deepseek <your question>

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// ── Config ────────────────────────────────────────────────────
const DEEPSEEK_API_TOKEN = 'e76n2P';
const DEEPSEEK_API_URL   = 'https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4';

// ── React helper ──────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Main handler ──────────────────────────────────────────────
async function deepseekHandler(conn, mek, m, { from, q, reply }) {

    // Get question — from args or quoted text
    let question = '';
    if (Array.isArray(q)) question = q.join(' ').trim();
    else if (typeof q === 'string') question = q.trim();

    // Also check quoted message text if no args given
    if (!question && m.quoted?.text) question = m.quoted.text.trim();
    if (!question && m.quoted?.body) question = m.quoted.body.trim();

    if (!question) {
        await react(conn, from, mek.key, '❌');
        return reply(
            '🤖 *DeepSeek AI*\n\n' +
            '❓ Question එකක් දෙන්න!\n\n' +
            '▸ Usage: *.deepseek* <question>\n' +
            '▸ Example: *.deepseek* What is NodeJS?\n\n' +
            '_Powered by DeepSeek V4_'
        );
    }

    await react(conn, from, mek.key, '🤔');

    try {
        // Call the DeepSeek API
        const res = await axios.get(DEEPSEEK_API_URL, {
            params: {
                q: question,
                apitoken: DEEPSEEK_API_TOKEN
            },
            timeout: 60000
        });

        // Extract answer from response
        const data = res.data;
        let answer = '';

        if (typeof data === 'string') {
            answer = data.trim();
        } else if (data?.result) {
            answer = String(data.result).trim();
        } else if (data?.answer) {
            answer = String(data.answer).trim();
        } else if (data?.response) {
            answer = String(data.response).trim();
        } else if (data?.message) {
            answer = String(data.message).trim();
        } else if (data?.text) {
            answer = String(data.text).trim();
        } else {
            answer = JSON.stringify(data);
        }

        if (!answer) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ DeepSeek AI වලින් valid response එකක් ලැබුණේ නැහැ. නැවත try කරන්න.');
        }

        // Send the AI response
        const replyText =
            `🤖 *DeepSeek AI*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `❓ *Question:*\n${question}\n\n` +
            `💡 *Answer:*\n${answer}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `_Powered by DeepSeek V4 | SHAVIYA-XMD_`;

        await reply(replyText);
        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[deepseek] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        let errMsg = '❌ DeepSeek AI connect කරන්න බැරි වුණා.';
        if (err?.response?.status === 429) {
            errMsg += '\n\n⚠️ API limit exceeded. ටිකක් ඉඳලා try කරන්න.';
        } else if (err?.response?.status === 403) {
            errMsg += '\n\n⚠️ API token invalid. Config check කරන්න.';
        } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
            errMsg += '\n\n⚠️ Request timeout. නැවත try කරන්න.';
        } else if (err?.response?.status === 500) {
            errMsg += '\n\n⚠️ API server error. ටිකක් ඉඳලා try කරන්න.';
        } else {
            errMsg += '\n\nError: ' + (err?.message || 'Unknown error');
        }

        reply(errMsg);
    }
}

// ── Register commands ─────────────────────────────────────────
cmd({
    pattern:  'deepseek',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'Ask DeepSeek AI any question'
}, deepseekHandler);

cmd({
    pattern:  'ds',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'Ask DeepSeek AI (short alias)'
}, deepseekHandler);

cmd({
    pattern:  'ask',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'Ask DeepSeek AI (alias)'
}, deepseekHandler);
