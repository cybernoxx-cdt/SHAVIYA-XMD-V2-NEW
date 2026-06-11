// plugins/deepseek.js — SHAVIYA-XMD V2 | DeepSeek AI Chat Plugin
// API: https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4
// Usage: .deepseek <your question>

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// ── Config ────────────────────────────────────────────────────
const DEEPSEEK_API_TOKEN = 'e76n2P';
const DEEPSEEK_API_BASE  = 'https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4';

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
    await reply('🤖 DeepSeek AI සිතනවා... ටිකක් ඉන්න.');

    try {
        // ✅ FIX: Manually build URL with encodeURIComponent — avoids axios param encoding issues
        const url = `${DEEPSEEK_API_BASE}?q=${encodeURIComponent(question)}&apitoken=${DEEPSEEK_API_TOKEN}`;

        const res = await axios.get(url, {
            timeout: 90000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const data = res.data;

        // ✅ API returns: { success, creator, prompt, model, reasoning, response }
        let answer = '';
        if (data?.response)      answer = String(data.response).trim();
        else if (data?.result)   answer = String(data.result).trim();
        else if (data?.answer)   answer = String(data.answer).trim();
        else if (data?.message)  answer = String(data.message).trim();
        else if (typeof data === 'string') answer = data.trim();
        else answer = JSON.stringify(data);

        if (!answer) {
            await react(conn, from, mek.key, '❌');
            return reply('❌ DeepSeek AI වලින් valid response එකක් ලැබුණේ නැහැ. නැවත try කරන්න.');
        }

        // ✅ WhatsApp 4096 char limit — split if too long
        const header =
            `🤖 *DeepSeek AI*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `❓ *Q:* ${question}\n\n` +
            `💡 *Answer:*\n`;

        const footer = `\n━━━━━━━━━━━━━━━━━━\n_DeepSeek V4 | SHAVIYA-XMD_`;

        const maxLen = 4000 - header.length - footer.length;

        if (answer.length <= maxLen) {
            await reply(header + answer + footer);
        } else {
            // Send in chunks
            await reply(header + answer.slice(0, maxLen) + '\n_(continued...)_');
            let remaining = answer.slice(maxLen);
            while (remaining.length > 0) {
                const chunk = remaining.slice(0, 4000);
                remaining   = remaining.slice(4000);
                await conn.sendMessage(from, {
                    text: remaining.length > 0
                        ? chunk + '\n_(continued...)_'
                        : chunk + footer
                }, { quoted: mek });
            }
        }

        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[deepseek] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        let errMsg = '❌ DeepSeek AI connect කරන්න බැරි වුණා.';
        const status = err?.response?.status;

        if (status === 429)      errMsg += '\n\n⚠️ API rate limit. ටිකක් ඉඳලා try කරන්න.';
        else if (status === 403) errMsg += '\n\n⚠️ API token invalid.';
        else if (status === 400) errMsg += '\n\n⚠️ Bad request. Question වෙනස් කරලා try කරන්න.';
        else if (status === 500) errMsg += '\n\n⚠️ API server error. ටිකක් ඉඳලා try කරන්න.';
        else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
                                 errMsg += '\n\n⚠️ Timeout. Internet check කරලා නැවත try කරන්න.';
        else                     errMsg += '\n\nError: ' + (err?.message || 'Unknown');

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
