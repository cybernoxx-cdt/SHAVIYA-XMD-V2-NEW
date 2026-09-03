'use strict';

/**
 * SHAVIYA-XMD V2 — SUDU AI AGENT
 *
 * Always-on AI wife/girlfriend style agent powered by ZANTA-MD /wife API.
 *
 * Trigger examples (normal messages, no command required):
 *   sudu kohomada?
 *   Sudu mata adarei da?
 *   සුදු කොහොමද?
 *
 * Force command:
 *   sudu kohomada?
 *
 * The plugin is intentionally self-contained and uses axios, which is
 * already present in the SHAVIYA-XMD V2 package.
 */

const { cmd } = require('../command');
const axios = require('axios');

const API_URL = 'https://api.zanta-mini.store/api/wife';
const API_KEY = process.env.SUDU_AI_API_KEY || process.env.ZANTA_API_KEY || '';

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────
const CONFIG = {
    // Maximum user text sent to the API. Prevents accidental huge requests.
    maxTextLength: 2000,

    // API timeout. Keep it high enough for an AI model response.
    timeoutMs: 60000,

    // Small per-chat cooldown to avoid accidental API spam.
    cooldownMs: 1200,

    // When true, only messages containing a standalone trigger word activate.
    // This avoids matching words such as "suddenly".
    wordBoundary: true,

    // Trigger words. Add more if you want.
    triggers: ['sudu', 'සුදු'],

    // If true, bot replies to its own outgoing messages are ignored.
    ignoreFromMe: true,

    // If true, the always-on listener works in groups as well as private chats.
    groupsEnabled: true,

    // If true, command sudu works even when the normal trigger is disabled.
    commandEnabled: true,
};

const cooldowns = new Map();

function normalizeText(value) {
    return String(value || '').replace(/\s+/gu, ' ').trim();
}

function hasTrigger(text) {
    const clean = normalizeText(text);
    if (!clean) return false;

    for (const trigger of CONFIG.triggers) {
        if (CONFIG.wordBoundary) {
            // Unicode-aware boundary for Latin/Sinhala trigger words.
            const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(trigger)}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
            if (re.test(clean)) return true;
        } else if (clean.toLocaleLowerCase().includes(trigger.toLocaleLowerCase())) {
            return true;
        }
    }

    return false;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeTrigger(text) {
    let clean = normalizeText(text);

    for (const trigger of CONFIG.triggers) {
        const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(trigger)}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
        if (re.test(clean)) {
            clean = clean.replace(re, ' ').replace(/\s+/gu, ' ').trim();
            break;
        }
    }

    return clean;
}

function getApiKey() {
    return process.env.SUDU_AI_API_KEY || process.env.ZANTA_API_KEY || API_KEY;
}

function getReplyFromResponse(data) {
    // Current API shape:
    // { success: true, creator: 'ZANTA-MD', message: 'Success',
    //   result: { reply: '...', model: '...' } }
    const candidates = [
        data?.result?.reply,
        data?.reply,
        data?.result?.answer,
        data?.answer,
        data?.data?.reply,
        data?.data?.answer,
    ];

    const answer = candidates.find(v => typeof v === 'string' && v.trim());
    return answer ? answer.trim() : '';
}

function isSuccess(data) {
    // Current API reports success=true. Accept a few common variants so
    // harmless API envelope changes do not immediately break the plugin.
    if (data?.success === false) return false;
    if (data?.status === false) return false;
    if (data?.error) return false;
    return true;
}

async function askSudu(text) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('SUDU_AI_API_KEY is not configured');
    }

    const userText = normalizeText(text).slice(0, CONFIG.maxTextLength) || 'Hi';

    const response = await axios.get(API_URL, {
        params: {
            apiKey,
            text: userText,
        },
        timeout: CONFIG.timeoutMs,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'SHAVIYA-XMD-V2-SUDU-Agent/1.0',
        },
        validateStatus: status => status >= 200 && status < 500,
    });

    const data = response.data;

    if (response.status >= 400) {
        const apiMessage = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(String(apiMessage));
    }

    if (!isSuccess(data)) {
        throw new Error(String(data?.message || data?.error || 'AI API returned an unsuccessful response'));
    }

    const reply = getReplyFromResponse(data);
    if (!reply) {
        throw new Error('AI API returned no reply');
    }

    return {
        reply,
        model: data?.result?.model || data?.model || null,
    };
}

function canRun(chatId) {
    const now = Date.now();
    const last = cooldowns.get(chatId) || 0;

    if (now - last < CONFIG.cooldownMs) return false;
    cooldowns.set(chatId, now);

    // Prevent unbounded memory growth on long-running bots.
    if (cooldowns.size > 5000) {
        for (const [key, timestamp] of cooldowns) {
            if (now - timestamp > CONFIG.cooldownMs * 10) cooldowns.delete(key);
        }
    }

    return true;
}

async function runAgent(conn, mek, { from, text, reply }) {
    if (CONFIG.ignoreFromMe && mek?.key?.fromMe) return;
    if (!from || !text) return;
    if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) return;
    if (!canRun(from)) return;

    try {
        const prompt = removeTrigger(text) || 'Hi';

        await conn.sendMessage(from, {
            react: { text: '💗', key: mek.key }
        }).catch(() => {});

        const result = await askSudu(prompt);

        await conn.sendMessage(
            from,
            { text: result.reply },
            { quoted: mek }
        );

        await conn.sendMessage(from, {
            react: { text: '❤️', key: mek.key }
        }).catch(() => {});
    } catch (error) {
        console.error('[SUDU-AI] Error:', error?.message || error);

        await conn.sendMessage(from, {
            react: { text: '❌', key: mek.key }
        }).catch(() => {});

        // Do not expose the API key or raw axios config to users.
        if (error?.message === 'SUDU_AI_API_KEY is not configured') {
            return reply('❌ *SUDU AI* API key is not configured. Add `SUDU_AI_API_KEY` to your environment variables.');
        }

        return reply('❌ Sudu AI ටිකක් busy. ටිකකින් ආයෙත් try කරන්න.');
    }
}

// ─────────────────────────────────────────────────────────────
// 1) Always-on listener — catches normal messages containing
//    "sudu" / "සුදු" anywhere in a chat.
// ─────────────────────────────────────────────────────────────
cmd({
    on: 'body',
    dontAddCommandList: true,
    filename: __filename,
}, async (conn, mek, m, { from, body, reply }) => {
    try {
        if (!hasTrigger(body)) return;
        await runAgent(conn, mek, { from, text: body, reply });
    } catch (e) {
        console.error('[SUDU-AI BODY]', e?.message || e);
    }
});

// ─────────────────────────────────────────────────────────────
// 2) Explicit command — sudu <message>
// ─────────────────────────────────────────────────────────────
if (CONFIG.commandEnabled) {
    cmd({
        pattern: 'sudu',
        alias: ['wifeai', 'girlfriendai', 'suduai'],
        react: '💗',
        desc: 'Sudu AI Wife/Girlfriend Agent',
        category: 'ai',
        filename: __filename,
    }, async (conn, mek, m, { from, q, reply }) => {
        // Explicit command should not be blocked by the trigger parser.
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) return;
        if (!from) return;
        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) return;
        if (!canRun(from)) return;

        try {
            const result = await askSudu(q || 'Hi');
            await conn.sendMessage(
                from,
                { text: result.reply },
                { quoted: mek }
            );
        } catch (error) {
            console.error('[SUDU-AI COMMAND] Error:', error?.message || error);
            return reply(
                error?.message === 'SUDU_AI_API_KEY is not configured'
                    ? '❌ *SUDU AI* API key is not configured. Add `SUDU_AI_API_KEY` to your environment variables.'
                    : '❌ Sudu AI ටිකක් busy. ටිකකින් ආයෙත් try කරන්න.'
            );
        }
    });
}

console.log('💗 SUDU AI Agent plugin loaded | triggers: sudu, සුදු');
