// plugins/deepseek.js — SHAVIYA-XMD V2 | DeepSeek R1 AI Plugin
// API: https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1
// Usage: .deepseek <question> | .ds <question> | .ask <question> | .think <question>

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// ── Config ─────────────────────────────────────────────────────
const API_TOKEN = 'e76n2P';
const API_URL   = 'https://whiteshadow-x-api.onrender.com/api/ai/deepseekr1';

// ── React helper ───────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Extract answer from API response ──────────────────────────
function extractAnswer(data) {
    // DeepSeek R1 API possible response fields
    if (data?.response)       return String(data.response).trim();
    if (data?.result)         return String(data.result).trim();
    if (data?.answer)         return String(data.answer).trim();
    if (data?.message)        return String(data.message).trim();
    if (data?.output)         return String(data.output).trim();
    if (data?.text)           return String(data.text).trim();
    if (data?.content)        return String(data.content).trim();
    if (data?.reply)          return String(data.reply).trim();
    if (typeof data === 'string') return data.trim();
    return null;
}

// ── Extract reasoning/thinking from API response ───────────────
function extractThinking(data) {
    if (data?.reasoning)      return String(data.reasoning).trim();
    if (data?.thinking)       return String(data.thinking).trim();
    if (data?.thought)        return String(data.thought).trim();
    if (data?.chain_of_thought) return String(data.chain_of_thought).trim();
    return null;
}

// ── Send long text in chunks (WhatsApp 4096 char limit) ────────
async function sendChunked(conn, from, mek, text, chunkSize = 3900) {
    if (text.length <= chunkSize) {
        await conn.sendMessage(from, { text }, { quoted: mek });
        return;
    }
    let remaining = text;
    let isFirst = true;
    while (remaining.length > 0) {
        const chunk = remaining.slice(0, chunkSize);
        remaining   = remaining.slice(chunkSize);
        const suffix = remaining.length > 0 ? '\n\n_(continued...)_' : '';
        await conn.sendMessage(from, { text: chunk + suffix }, { quoted: mek });
        if (isFirst) isFirst = false;
        // small delay between chunks to avoid flood
        if (remaining.length > 0) await new Promise(r => setTimeout(r, 600));
    }
}

// ── Main handler ───────────────────────────────────────────────
async function deepseekHandler(conn, mek, m, { from, q, reply, args }) {

    // ── Get question ──
    let question = '';
    if (Array.isArray(q) && q.length > 0) question = q.join(' ').trim();
    else if (typeof q === 'string')        question = q.trim();

    // fallback: quoted message text
    if (!question && m.quoted?.text)  question = m.quoted.text.trim();
    if (!question && m.quoted?.body)  question = m.quoted.body.trim();

    if (!question) {
        await react(conn, from, mek.key, '❌');
        return reply(
            '╔══════════════════╗\n' +
            '║  🤖 *DEEPSEEK R1 AI*  ║\n' +
            '╚══════════════════╝\n\n' +
            '❓ Question එකක් ලිය හිත!\n\n' +
            '📌 *Usage:*\n' +
            '  ▸ `.deepseek` What is quantum computing?\n' +
            '  ▸ `.ds` Explain black holes\n' +
            '  ▸ `.ask` How to learn Python?\n' +
            '  ▸ `.think` Solve: 5x + 10 = 50\n\n' +
            '💡 _DeepSeek R1 uses chain-of-thought reasoning_\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '_Powered by SHAVIYA-XMD V2_'
        );
    }

    await react(conn, from, mek.key, '🤔');
    await reply(
        '🤖 *DeepSeek R1* සිතනවා...\n' +
        '🧠 Chain-of-thought processing...\n' +
        '_ටිකක් ඉන්න, R1 model slow වෙන්න පුළුවන්_'
    );

    try {
        const url = `${API_URL}?q=${encodeURIComponent(question)}&think=true&apitoken=${API_TOKEN}`;

        const res = await axios.get(url, {
            timeout: 120000, // 2 min — R1 thinking takes time
            headers: {
                'Accept':     'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'
            }
        });

        const data = res.data;

        // ── Extract main answer ──
        const answer = extractAnswer(data);
        if (!answer) {
            await react(conn, from, mek.key, '❌');
            return reply(
                '❌ *DeepSeek R1* valid response එකක් දුන්නේ නෑ.\n\n' +
                '🔁 නැවත try කරන්න.\n' +
                '_Raw:_ `' + JSON.stringify(data).slice(0, 200) + '`'
            );
        }

        // ── Extract reasoning (thinking chain) if available ──
        const thinking = extractThinking(data);

        // ── Build response ──
        const header =
            '╔══════════════════════╗\n' +
            '║   🤖 *DEEPSEEK R1 AI*   ║\n' +
            '╚══════════════════════╝\n\n' +
            `❓ *Question:*\n${question}\n\n`;

        const footer =
            '\n━━━━━━━━━━━━━━━━━━━━━━\n' +
            '🔰 *Model:* DeepSeek-R1\n' +
            '_Powered by SHAVIYA-XMD V2_';

        // ── Send thinking block first (if exists & non-empty) ──
        if (thinking && thinking.length > 20) {
            const thinkHeader = '🧠 *Chain-of-Thought Reasoning:*\n━━━━━━━━━━━━━━━━━━━━━━\n';
            const thinkFooter = '\n━━━━━━━━━━━━━━━━━━━━━━\n💡 *Final Answer below* ↓';
            await sendChunked(conn, from, mek, thinkHeader + thinking + thinkFooter);
            await new Promise(r => setTimeout(r, 700));
        }

        // ── Send main answer ──
        await sendChunked(conn, from, mek, header + '💡 *Answer:*\n' + answer + footer);
        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[deepseek-r1] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        const status = err?.response?.status;
        let errMsg = '❌ *DeepSeek R1* connect කරන්න බැරි වුණා.\n\n';

        if (status === 429)
            errMsg += '⚠️ API rate limit. මිනිත්තු කිහිපයකින් try කරන්න.';
        else if (status === 403)
            errMsg += '⚠️ API token invalid.';
        else if (status === 400)
            errMsg += '⚠️ Bad request. Question වෙනස් කරලා try කරන්න.';
        else if (status === 500 || status === 502 || status === 503)
            errMsg += '⚠️ API server error/down. ටිකක් ඉඳලා try කරන්න.';
        else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
            errMsg += '⚠️ Timeout — R1 model slow. 2 minutes wait කරලා try කරන්න.';
        else if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED')
            errMsg += '⚠️ API server unreachable. Internet/server check කරන්න.';
        else
            errMsg += 'Error: ' + (err?.message || 'Unknown error');

        reply(errMsg);
    }
}

// ── Register Commands ──────────────────────────────────────────
cmd({
    pattern:  'deepseek',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'Ask DeepSeek R1 AI (chain-of-thought reasoning)',
    filename: __filename
}, deepseekHandler);

cmd({
    pattern:  'ds',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'DeepSeek R1 AI short alias',
    filename: __filename
}, deepseekHandler);

cmd({
    pattern:  'ask',
    react:    '🤖',
    category: 'ai',
    fromMe:   false,
    desc:     'Ask AI anything (DeepSeek R1)',
    filename: __filename
}, deepseekHandler);

cmd({
    pattern:  'think',
    react:    '🧠',
    category: 'ai',
    fromMe:   false,
    desc:     'Deep think with DeepSeek R1 reasoning model',
    filename: __filename
}, deepseekHandler);
