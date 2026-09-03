'use strict';

/**
 * ============================================================
 * SHAVIYA-XMD V2
 * SUDU AI AGENT - FULLY DEBUGGED
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
    
    // Clean old entries
    if (cooldowns.size > 5000) {
        for (const [key, timestamp] of cooldowns) {
            if (now - timestamp > CONFIG.cooldownMs * 10) {
                cooldowns.delete(key);
            }
        }
    }
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
   API RESPONSE PARSER - WITH FULL DEBUG
============================================================ */

function getApiReply(data) {
    console.log('[SUDU-AI] 📦 Full API Response:', JSON.stringify(data, null, 2));
    
    // Try all possible paths where reply might be
    const possiblePaths = [
        data?.result?.reply,
        data?.result?.answer,
        data?.reply,
        data?.answer,
        data?.data?.reply,
        data?.data?.answer,
        data?.message,
        data?.response,
        data?.text,
        data?.output,
    ];

    for (const value of possiblePaths) {
        if (typeof value === 'string' && value.trim()) {
            console.log('[SUDU-AI] ✅ Found reply at path:', value);
            return value.trim();
        }
    }

    console.log('[SUDU-AI] ❌ No reply found in response');
    return '';
}

/* ============================================================
   API REQUEST - WITH FULL ERROR HANDLING
============================================================ */

async function askSudu(text) {
    const prompt = cleanText(text).slice(0, CONFIG.maxTextLength) || 'Hi';

    console.log(`[SUDU-AI] 📤 Sending prompt: "${prompt}"`);
    console.log(`[SUDU-AI] 🌐 API URL: ${API_URL}`);
    console.log(`[SUDU-AI] 🔑 API Key: ${API_KEY.substring(0, 10)}...`);

    try {
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
            validateStatus: (status) => status >= 200 && status < 500,
        });

        console.log(`[SUDU-AI] 📥 Response Status: ${response.status}`);
        console.log(`[SUDU-AI] 📥 Response Headers:`, response.headers);

        const data = response.data;

        // HTTP error
        if (response.status >= 400) {
            const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
            console.error(`[SUDU-AI] ❌ HTTP Error:`, errorMessage);
            throw new Error(String(errorMessage));
        }

        // API success check
        if (data?.success === false) {
            const errorMsg = data?.message || data?.error || 'API returned success=false';
            console.error(`[SUDU-AI] ❌ API Error:`, errorMsg);
            throw new Error(String(errorMsg));
        }

        // Get AI response
        const reply = getApiReply(data);

        if (!reply) {
            console.error('[SUDU-AI] ❌ No reply found in:', JSON.stringify(data));
            throw new Error('API returned no AI reply');
        }

        console.log(`[SUDU-AI] ✅ Success! Reply: "${reply.substring(0, 50)}..."`);
        
        return {
            reply: reply,
            model: data?.result?.model || data?.model || null,
            fullData: data,
        };

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('[SUDU-AI] ❌ Axios Error:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw new Error(`Network error: ${error.message}`);
        }
        throw error;
    }
}

/* ============================================================
   SEND AI RESPONSE - WITH FULL ERROR HANDLING
============================================================ */

async function runSudu(conn, mek, { from, text, reply }) {
    console.log('[SUDU-AI] 🚀 Starting runSudu...');
    console.log('[SUDU-AI] 📍 From:', from);
    console.log('[SUDU-AI] 📝 Text:', text);

    try {
        // Basic checks
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            console.log('[SUDU-AI] ⏭️ Ignoring self message');
            return;
        }

        if (!from) {
            console.log('[SUDU-AI] ⏭️ No from');
            return;
        }

        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) {
            console.log('[SUDU-AI] ⏭️ Groups disabled');
            return;
        }

        // Cooldown
        if (!canRun(from)) {
            console.log('[SUDU-AI] ⏭️ Cooldown active');
            return;
        }

        const prompt = cleanText(text) || 'Hi';
        console.log('[SUDU-AI] 📝 Cleaned prompt:', prompt);

        // React immediately
        console.log('[SUDU-AI] 💗 Sending initial reaction...');
        await conn.sendMessage(from, {
            react: { text: '💗', key: mek.key }
        }).catch(e => console.log('[SUDU-AI] ⚠️ React failed:', e.message));

        // API request
        console.log('[SUDU-AI] 🌐 Calling API...');
        const result = await askSudu(prompt);
        console.log('[SUDU-AI] 📥 Got API result:', result);

        // Send AI reply
        console.log('[SUDU-AI] 📤 Sending reply...');
        await conn.sendMessage(from, {
            text: result.reply
        }, {
            quoted: mek
        });
        console.log('[SUDU-AI] ✅ Reply sent!');

        // Success reaction
        await conn.sendMessage(from, {
            react: { text: '❤️', key: mek.key }
        }).catch(() => {});

        console.log('[SUDU-AI] ✅ Done!');

    } catch (error) {
        console.error('[SUDU-AI] ❌ ERROR:', error?.message || error);
        console.error('[SUDU-AI] ❌ Full error:', error);

        // Error reaction
        try {
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            }).catch(() => {});
        } catch (e) {}

        // Tell user with detailed error
        try {
            const errorMsg = error?.message || 'Unknown error';
            await conn.sendMessage(from, {
                text: `❌ *Sudu AI Error*\n\n` +
                      `\`\`\`${errorMsg}\`\`\`\n\n` +
                      `Please try again later.`
            }, {
                quoted: mek
            });
        } catch (sendError) {
            console.error('[SUDU-AI] ❌ Error message failed:', sendError?.message || sendError);
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
    console.log('[SUDU-AI] 📨 Body listener triggered');
    console.log('[SUDU-AI] 📨 Body:', body);
    
    try {
        if (!body) {
            console.log('[SUDU-AI] ⏭️ No body');
            return;
        }

        const original = cleanText(body);
        console.log('[SUDU-AI] 📝 Cleaned original:', original);

        // Ignore dot commands (handled by command handler)
        if (original.startsWith('.')) {
            console.log('[SUDU-AI] ⏭️ Dot command, ignoring');
            return;
        }

        // Check trigger
        const triggerMatch = /^(?:sudu|සුදු)(?:\s+|$)/iu.test(original);
        console.log('[SUDU-AI] 🔍 Trigger match:', triggerMatch);

        if (!triggerMatch) {
            console.log('[SUDU-AI] ⏭️ No trigger');
            return;
        }

        // Remove trigger
        const question = removeTrigger(original);
        console.log('[SUDU-AI] 📝 Question after removing trigger:', question);

        // Run AI
        await runSudu(conn, mek, {
            from,
            text: question || 'Hi',
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI] ❌ BODY ERROR:', error?.message || error);
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
}, async (conn, mek, m, { from, q, reply, sender }) => {
    console.log('[SUDU-AI] 📨 Command handler triggered');
    console.log('[SUDU-AI] 📨 From:', from);
    console.log('[SUDU-AI] 📨 Query:', q);
    console.log('[SUDU-AI] 📨 Sender:', sender);

    try {
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            console.log('[SUDU-AI] ⏭️ Ignoring self');
            return;
        }

        if (!from) {
            console.log('[SUDU-AI] ⏭️ No from');
            return;
        }

        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) {
            console.log('[SUDU-AI] ⏭️ Groups disabled');
            return;
        }

        const question = cleanText(q) || 'Hi';
        console.log('[SUDU-AI] 📝 Cleaned question:', question);

        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI] ❌ COMMAND ERROR:', error?.message || error);
        try {
            await conn.sendMessage(from, {
                text: `❌ *Sudu AI Error*\n\n\`\`\`${error?.message || 'Unknown error'}\`\`\``
            }, {
                quoted: mek
            });
        } catch (e) {
            console.error('[SUDU-AI] ❌ Error message failed:', e);
        }
    }
});

console.log('💗 SUDU AI loaded | no-prefix: sudu / සුදු | commands: .sudu / .සුදු');
console.log('🔍 Debug mode: ENABLED - Check console for detailed logs');
