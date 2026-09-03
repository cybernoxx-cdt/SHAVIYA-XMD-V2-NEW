'use strict';

/**
 * ============================================================
 * SUDU AI PLUGIN - FULLY FIXED WITH DEBUG
 * ============================================================
 */

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');

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
    timeoutMs: 30000,
    cooldownMs: 2000,
    groupsEnabled: true,
    ignoreFromMe: true,
    debugMode: true, // Enable debug
};

/* ============================================================
   DEBUG LOGGER
============================================================ */

function debugLog(...args) {
    if (CONFIG.debugMode) {
        console.log('[SUDU-DEBUG]', ...args);
    }
}

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
    return cleanText(clean) || 'Hi';
}

/* ============================================================
   ✅ FIXED: API RESPONSE PARSER
============================================================ */

function getApiReply(data) {
    debugLog('📦 Parsing API Response:', JSON.stringify(data, null, 2));
    
    // Try all possible paths
    const paths = [
        () => data?.result?.reply,
        () => data?.result?.answer,
        () => data?.result?.text,
        () => data?.reply,
        () => data?.answer,
        () => data?.text,
        () => data?.message,
        () => data?.response,
        () => data?.data?.reply,
        () => data?.data?.answer,
        () => data?.data?.text,
        () => {
            // Try to find any string in the response
            if (typeof data === 'string') return data;
            if (typeof data === 'object' && data !== null) {
                for (const key in data) {
                    if (typeof data[key] === 'string' && data[key].trim().length > 5) {
                        return data[key];
                    }
                    if (typeof data[key] === 'object' && data[key] !== null) {
                        for (const subKey in data[key]) {
                            if (typeof data[key][subKey] === 'string' && data[key][subKey].trim().length > 5) {
                                return data[key][subKey];
                            }
                        }
                    }
                }
            }
            return null;
        }
    ];

    for (const pathFn of paths) {
        try {
            const value = pathFn();
            if (typeof value === 'string' && value.trim().length > 5) {
                debugLog('✅ Found reply:', value.substring(0, 50) + '...');
                return value.trim();
            }
        } catch (e) {}
    }

    debugLog('❌ No reply found in response');
    return null;
}

/* ============================================================
   ✅ FIXED: API REQUEST WITH DIRECT TEST
============================================================ */

async function askSudu(text) {
    const prompt = cleanText(text).slice(0, CONFIG.maxTextLength) || 'Hi';

    debugLog(`📤 Sending to API: "${prompt}"`);
    debugLog(`🌐 URL: ${API_URL}`);
    debugLog(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);

    try {
        // First test with simple axios
        const response = await axios({
            method: 'GET',
            url: API_URL,
            params: {
                apiKey: API_KEY,
                text: prompt
            },
            timeout: CONFIG.timeoutMs,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'WhatsApp-Bot/2.0'
            }
        });

        debugLog(`📥 Response Status: ${response.status}`);
        debugLog(`📥 Response Headers:`, response.headers);
        
        const data = response.data;
        debugLog(`📦 Response Data:`, JSON.stringify(data).substring(0, 500));

        // Check if response is valid
        if (!data) {
            throw new Error('Empty response from API');
        }

        // Check for error
        if (data.success === false) {
            throw new Error(data.message || data.error || 'API returned error');
        }

        // Get reply
        const reply = getApiReply(data);
        
        if (!reply) {
            debugLog('❌ Full response:', JSON.stringify(data, null, 2));
            throw new Error('Could not extract reply from API response');
        }

        debugLog(`✅ Reply extracted: "${reply.substring(0, 50)}..."`);
        
        // Get model
        let model = 'AI';
        if (data?.result?.model) model = data.result.model;
        else if (data?.model) model = data.model;
        else if (data?.result?.model) model = data.result.model;

        return {
            reply: reply,
            model: model,
            fullData: data
        };

    } catch (error) {
        debugLog('❌ API Error:', error.message);
        if (error.response) {
            debugLog('Response data:', error.response.data);
            debugLog('Response status:', error.response.status);
        }
        throw error;
    }
}

/* ============================================================
   ✅ FIXED: SEND AI RESPONSE - WITH DIRECT SEND
============================================================ */

async function runSudu(conn, mek, { from, text, reply }) {
    debugLog('🚀 Running Sudu AI...');
    debugLog(`📍 From: ${from}`);
    debugLog(`📝 Text: "${text}"`);

    try {
        // Check self
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            debugLog('⏭️ Self message ignored');
            return;
        }

        if (!from) {
            debugLog('⏭️ No from');
            return;
        }

        // Groups
        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) {
            debugLog('⏭️ Groups disabled');
            return;
        }

        const prompt = cleanText(text) || 'Hi';
        debugLog(`📝 Cleaned prompt: "${prompt}"`);

        // Cooldown
        if (!canRun(from)) {
            debugLog('⏭️ Cooldown active');
            return;
        }

        // React - send 1
        debugLog('💗 Sending reaction...');
        try {
            await conn.sendMessage(from, {
                react: { text: '💗', key: mek.key }
            });
        } catch (e) {
            debugLog('⚠️ React failed:', e.message);
        }

        // Get AI response
        debugLog('🌐 Calling API...');
        const result = await askSudu(prompt);
        debugLog('✅ Got API result');

        // Format reply with model
        const finalText = `💕 *Wife AI*\n━━━━━━━━━━━━━━━\n${result.reply}\n━━━━━━━━━━━━━━━\n🤖 ${result.model}`;
        debugLog(`📤 Sending reply: "${finalText.substring(0, 50)}..."`);

        // Send message - DIRECT SEND
        try {
            await conn.sendMessage(from, {
                text: finalText
            }, {
                quoted: mek
            });
            debugLog('✅ Message sent successfully!');
        } catch (sendError) {
            debugLog('❌ Send failed:', sendError.message);
            // Try without quoting
            try {
                await conn.sendMessage(from, {
                    text: finalText
                });
                debugLog('✅ Message sent without quote!');
            } catch (e2) {
                debugLog('❌ Send without quote failed:', e2.message);
                throw e2;
            }
        }

        // React - send 2
        try {
            await conn.sendMessage(from, {
                react: { text: '❤️', key: mek.key }
            });
        } catch (e) {}

        debugLog('✅ Done!');

    } catch (error) {
        debugLog('❌ ERROR:', error.message);
        debugLog('❌ Full error:', error);

        // Error reaction
        try {
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            }).catch(() => {});
        } catch (e) {}

        // Send error message
        try {
            const errorMsg = `❌ *Sudu AI Error*\n━━━━━━━━━━━━━━━\n\`\`\`${error.message || 'Unknown error'}\`\`\`\n━━━━━━━━━━━━━━━\n⏳ Try again later.`;
            await conn.sendMessage(from, {
                text: errorMsg
            }, {
                quoted: mek
            });
        } catch (sendError) {
            debugLog('❌ Error message failed:', sendError.message);
        }
    }
}

/* ============================================================
   ✅ FIXED: NO PREFIX LISTENER
============================================================ */

cmd({
    on: 'body',
    dontAddCommandList: true,
    filename: __filename,
}, async (conn, mek, m, { from, body, reply }) => {
    debugLog('📨 Body listener triggered');
    debugLog(`📨 Body: "${body}"`);
    
    try {
        if (!body) {
            debugLog('⏭️ No body');
            return;
        }

        const original = cleanText(body);
        debugLog(`📝 Cleaned: "${original}"`);

        // Skip dot commands
        if (original.startsWith('.')) {
            debugLog('⏭️ Dot command');
            return;
        }

        // Check trigger
        const triggerMatch = /^(?:sudu|සුදු)(?:\s+|$)/iu.test(original);
        debugLog(`🔍 Trigger match: ${triggerMatch}`);

        if (!triggerMatch) {
            debugLog('⏭️ No trigger');
            return;
        }

        // Remove trigger
        const question = removeTrigger(original);
        debugLog(`📝 Question: "${question}"`);

        // Run AI
        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        debugLog('❌ BODY ERROR:', error.message);
    }
});

/* ============================================================
   ✅ FIXED: DOT COMMAND
============================================================ */

cmd({
    pattern: 'sudu',
    alias: ['සුදු', 'wife', 'gf', 'wifeai'],
    react: '💗',
    desc: 'Sudu AI - Wife/Girlfriend Agent',
    category: 'ai',
    fromMe: false,
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    debugLog('📨 Command: .sudu');
    debugLog(`📝 Query: "${q}"`);

    try {
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            debugLog('⏭️ Self message');
            return;
        }

        if (!from) {
            debugLog('⏭️ No from');
            return;
        }

        if (!CONFIG.groupsEnabled && from.endsWith('@g.us')) {
            debugLog('⏭️ Groups disabled');
            return;
        }

        const question = cleanText(q) || 'Hi';
        debugLog(`📝 Question: "${question}"`);

        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        debugLog('❌ COMMAND ERROR:', error.message);
        try {
            await conn.sendMessage(from, {
                text: `❌ *Error*\n\`\`\`${error.message || 'Unknown'}\`\`\``
            }, {
                quoted: mek
            });
        } catch (e) {
            debugLog('❌ Error message failed:', e.message);
        }
    }
});

console.log('💗 SUDU AI FIXED - Ready!');
console.log('📌 Commands: .sudu / .සුදු | No-prefix: sudu / සුදු');
console.log('🔍 Debug mode: ENABLED');
