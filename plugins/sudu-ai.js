'use strict';

/**
 * ============================================================
 * SHAVIYA-XMD V2
 * SUDU AI AGENT - FIXED VERSION
 * ============================================================
 */

const { cmd } = require('../command');
const axios = require('axios');

/* ============================================================
   API SETTINGS
============================================================ */

const API_URL = 'https://api.zanta-mini.store/api/wife';
const API_KEY = 'zan_vWpU1lkr_g6wwxdlvyv';

/* ============================================================
   CONFIG
============================================================ */

const CONFIG = {
    maxTextLength: 2000,
    timeoutMs: 60000,
    cooldownMs: 1000,
    groupsEnabled: true,
    ignoreFromMe: true,
};

/* ============================================================
   COOLDOWN
============================================================ */

const cooldowns = new Map();

function canRun(chatId) {
    const now = Date.now();
    const last = cooldowns.get(chatId) || 0;
    if (now - last < CONFIG.cooldownMs) {
        return false;
    }
    cooldowns.set(chatId, now);
    return true;
}

/* ============================================================
   TEXT HELPERS
============================================================ */

function cleanText(value) {
    return String(value || '').replace(/\s+/gu, ' ').trim();
}

function removeTrigger(text) {
    let clean = cleanText(text);
    clean = clean.replace(/^\.\s*/u, '');
    clean = clean.replace(/^(?:sudu|සුදු)(?:\s+|$)/iu, '');
    return cleanText(clean);
}

/* ============================================================
   API RESPONSE PARSER - FIXED
============================================================ */

function getApiReply(data) {
    console.log('[SUDU-AI] Full API Response:', JSON.stringify(data, null, 2));
    
    // මෙන්න API එකෙන් එන response එක හරියට parse කරන විදිය
    if (data && data.success === true && data.result && data.result.reply) {
        return data.result.reply.trim();
    }
    
    // Fallback - වෙනත් possible paths
    const candidates = [
        data?.result?.reply,
        data?.reply,
        data?.result?.answer,
        data?.answer,
        data?.data?.reply,
        data?.data?.answer,
    ];

    const found = candidates.find(value => typeof value === 'string' && value.trim());
    return found ? found.trim() : '';
}

/* ============================================================
   API REQUEST - FIXED
============================================================ */

async function askSudu(text) {
    const prompt = cleanText(text).slice(0, CONFIG.maxTextLength) || 'Hi';

    console.log(`[SUDU-AI] Sending prompt: ${prompt}`);

    const response = await axios.get(API_URL, {
        params: {
            apiKey: API_KEY,
            text: prompt,
        },
        timeout: CONFIG.timeoutMs,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'SHAVIYA-XMD-V2-SUDU-AI/2.0',
        },
        validateStatus: status => status >= 200 && status < 500,
    });

    const data = response.data;
    console.log('[SUDU-AI] API status:', response.status);

    // HTTP error check
    if (response.status >= 400) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(String(errorMessage));
    }

    // API success check
    if (data?.success === false) {
        throw new Error(String(data?.message || data?.error || 'API returned success=false'));
    }

    // Get AI response
    const reply = getApiReply(data);

    if (!reply) {
        console.error('[SUDU-AI] Unexpected API response:', JSON.stringify(data));
        throw new Error('API returned no AI reply');
    }

    return {
        reply: reply,
        model: data?.result?.model || data?.model || null,
    };
}

/* ============================================================
   SEND AI RESPONSE
============================================================ */

async function runSudu(conn, mek, { from, text, reply }) {
    try {
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) return;
        if (!from) return;
        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) return;
        if (!canRun(from)) return;

        const prompt = cleanText(text) || 'Hi';

        // React immediately
        await conn.sendMessage(from, {
            react: { text: '💗', key: mek.key }
        }).catch(() => {});

        // API request
        const result = await askSudu(prompt);

        // Send AI reply - මෙන්න reply එක හරියට send කරනවා
        await conn.sendMessage(from, {
            text: result.reply
        }, {
            quoted: mek
        });

        // Success reaction
        await conn.sendMessage(from, {
            react: { text: '❤️', key: mek.key }
        }).catch(() => {});

        console.log('[SUDU-AI] Response sent successfully');

    } catch (error) {
        console.error('[SUDU-AI] ERROR:', error?.message || error);

        // Error reaction
        await conn.sendMessage(from, {
            react: { text: '❌', key: mek.key }
        }).catch(() => {});

        // Tell user
        try {
            await conn.sendMessage(from, {
                text: '❌ *Sudu AI* response එක ගන්න බැරි වුණා.\n\nටිකකින් ආයෙත් try කරන්න.'
            }, {
                quoted: mek
            });
        } catch (sendError) {
            console.error('[SUDU-AI] ERROR MESSAGE FAILED:', sendError?.message || sendError);
        }
    }
}

/* ============================================================
   NO PREFIX LISTENER
============================================================ */

cmd({
    on: 'body',
    dontAddCommandList: true,
    filename: __filename,
}, async (conn, mek, m, { from, body, reply }) => {
    try {
        if (!body) return;
        const original = cleanText(body);
        
        if (original.startsWith('.')) return;
        
        const triggerMatch = /^(?:sudu|සුදු)(?:\s+|$)/iu.test(original);
        if (!triggerMatch) return;

        const question = removeTrigger(original);
        await runSudu(conn, mek, {
            from,
            text: question || 'Hi',
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI BODY ERROR]:', error?.message || error);
    }
});

/* ============================================================
   DOT COMMAND
============================================================ */

cmd({
    pattern: 'sudu',
    alias: ['සුදු', 'wifeai', 'girlfriendai', 'suduai'],
    react: '💗',
    desc: 'Sudu AI Wife/Girlfriend Agent',
    category: 'ai',
    fromMe: false,
    filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) return;
        if (!from) return;
        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) return;

        const question = cleanText(q) || 'Hi';
        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI COMMAND ERROR]:', error?.message || error);
        try {
            await conn.sendMessage(from, {
                text: '❌ *Sudu AI* error එකක් ආවා. ටිකකින් ආයෙත් try කරන්න.'
            }, {
                quoted: mek
            });
        } catch (e) {}
    }
});

console.log('💗 SUDU AI loaded | no-prefix: sudu / සුදු | commands: .sudu / .සුදු');
