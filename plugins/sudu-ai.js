'use strict';

/**
 * ============================================================
 * SUDU AI PLUGIN - FULLY FIXED
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
    return cleanText(clean) || 'Hi';
}

/* ============================================================
   ✅ FIXED: API RESPONSE PARSER
============================================================ */

function getApiReply(data) {
    console.log('[SUDU-AI] 📦 Parsing API Response...');
    
    // Direct paths - FIXED
    if (data?.result?.reply) {
        console.log('[SUDU-AI] ✅ Found: data.result.reply');
        return data.result.reply.trim();
    }
    
    if (data?.result?.answer) {
        console.log('[SUDU-AI] ✅ Found: data.result.answer');
        return data.result.answer.trim();
    }
    
    if (data?.reply) {
        console.log('[SUDU-AI] ✅ Found: data.reply');
        return data.reply.trim();
    }
    
    if (data?.answer) {
        console.log('[SUDU-AI] ✅ Found: data.answer');
        return data.answer.trim();
    }
    
    if (data?.data?.reply) {
        console.log('[SUDU-AI] ✅ Found: data.data.reply');
        return data.data.reply.trim();
    }
    
    if (data?.data?.answer) {
        console.log('[SUDU-AI] ✅ Found: data.data.answer');
        return data.data.answer.trim();
    }
    
    // Try to find any string in the response
    if (typeof data === 'string') {
        console.log('[SUDU-AI] ✅ Response is string');
        return data.trim();
    }
    
    // If response is an object, try to find any string value
    if (typeof data === 'object' && data !== null) {
        const stringValues = [];
        for (const key in data) {
            if (typeof data[key] === 'string' && data[key].trim().length > 10) {
                stringValues.push(data[key].trim());
            }
            if (typeof data[key] === 'object' && data[key] !== null) {
                for (const subKey in data[key]) {
                    if (typeof data[key][subKey] === 'string' && data[key][subKey].trim().length > 10) {
                        stringValues.push(data[key][subKey].trim());
                    }
                }
            }
        }
        if (stringValues.length > 0) {
            console.log('[SUDU-AI] ✅ Found string value in object');
            return stringValues[0];
        }
    }
    
    console.log('[SUDU-AI] ❌ No reply found');
    return null;
}

/* ============================================================
   ✅ FIXED: API REQUEST
============================================================ */

async function askSudu(text) {
    const prompt = cleanText(text).slice(0, CONFIG.maxTextLength) || 'Hi';

    console.log(`[SUDU-AI] 📤 Prompt: "${prompt}"`);

    try {
        const response = await axios.get(API_URL, {
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

        console.log(`[SUDU-AI] 📥 Status: ${response.status}`);

        // Check if response is valid
        if (!response.data) {
            throw new Error('Empty response from API');
        }

        const data = response.data;
        console.log('[SUDU-AI] 📦 Response:', JSON.stringify(data).substring(0, 200));

        // Check for error in response
        if (data.success === false) {
            throw new Error(data.message || data.error || 'API returned error');
        }

        // Get reply using fixed parser
        const reply = getApiReply(data);
        
        if (!reply) {
            console.error('[SUDU-AI] ❌ Full response:', JSON.stringify(data, null, 2));
            throw new Error('Could not extract reply from API response');
        }

        console.log(`[SUDU-AI] ✅ Reply: "${reply.substring(0, 50)}..."`);
        
        return {
            reply: reply,
            model: data?.result?.model || data?.model || 'AI',
            fullData: data
        };

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('[SUDU-AI] ❌ Network Error:', error.message);
            if (error.response) {
                console.error('[SUDU-AI] Response data:', error.response.data);
            }
            throw new Error(`Network error: ${error.message}`);
        }
        throw error;
    }
}

/* ============================================================
   ✅ FIXED: SEND AI RESPONSE
============================================================ */

async function runSudu(conn, mek, { from, text, reply }) {
    console.log('[SUDU-AI] 🚀 Running...');

    try {
        // Check if message is from self
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            console.log('[SUDU-AI] ⏭️ Self message ignored');
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

        const prompt = cleanText(text) || 'Hi';
        console.log(`[SUDU-AI] 📝 Prompt: "${prompt}"`);

        // Cooldown
        if (!canRun(from)) {
            console.log('[SUDU-AI] ⏭️ Cooldown');
            return;
        }

        // Send reaction
        await conn.sendMessage(from, {
            react: { text: '💗', key: mek.key }
        }).catch(() => {});

        // Get AI response
        const result = await askSudu(prompt);
        console.log('[SUDU-AI] ✅ Got response');

        // Send reply
        await conn.sendMessage(from, {
            text: `💕 *Wife AI*\n━━━━━━━━━━━━━━━\n${result.reply}\n━━━━━━━━━━━━━━━\n🤖 ${result.model}`
        }, {
            quoted: mek
        });

        // Success reaction
        await conn.sendMessage(from, {
            react: { text: '❤️', key: mek.key }
        }).catch(() => {});

        console.log('[SUDU-AI] ✅ Done!');

    } catch (error) {
        console.error('[SUDU-AI] ❌ Error:', error.message);
        
        try {
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            }).catch(() => {});
            
            await conn.sendMessage(from, {
                text: `❌ *Sudu AI Error*\n━━━━━━━━━━━━━━━\n\`\`\`${error.message || 'Unknown error'}\`\`\`\n━━━━━━━━━━━━━━━\n⏳ Try again later.`
            }, {
                quoted: mek
            });
        } catch (e) {
            console.error('[SUDU-AI] ❌ Send error failed:', e.message);
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
    console.log('[SUDU-AI] 📨 Body listener');
    
    try {
        if (!body) return;

        const original = cleanText(body);
        
        // Skip dot commands
        if (original.startsWith('.')) {
            console.log('[SUDU-AI] ⏭️ Dot command');
            return;
        }

        // Check for trigger: sudu / සුදු
        const triggerMatch = /^(?:sudu|සුදු)(?:\s+|$)/iu.test(original);
        if (!triggerMatch) {
            console.log('[SUDU-AI] ⏭️ No trigger');
            return;
        }

        // Remove trigger and get question
        const question = removeTrigger(original);
        console.log(`[SUDU-AI] 📝 Question: "${question}"`);

        // Run AI
        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI] ❌ Body error:', error.message);
    }
});

/* ============================================================
   ✅ FIXED: DOT COMMAND
============================================================ */

cmd({
    pattern: 'sudu',
    alias: ['සුදු', 'wife', 'gf'],
    react: '💗',
    desc: 'Sudu AI - Wife/Girlfriend Agent',
    category: 'ai',
    fromMe: false,
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    console.log('[SUDU-AI] 📨 Command: .sudu');
    console.log('[SUDU-AI] 📝 Query:', q);

    try {
        if (CONFIG.ignoreFromMe && mek?.key?.fromMe) {
            console.log('[SUDU-AI] ⏭️ Self message');
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
        console.log(`[SUDU-AI] 📝 Question: "${question}"`);

        await runSudu(conn, mek, {
            from,
            text: question,
            reply
        });

    } catch (error) {
        console.error('[SUDU-AI] ❌ Command error:', error.message);
        try {
            await conn.sendMessage(from, {
                text: `❌ *Error*\n\`\`\`${error.message || 'Unknown'}\`\`\``
            }, {
                quoted: mek
            });
        } catch (e) {}
    }
});

console.log('💗 SUDU AI FIXED - Ready!');
console.log('📌 Commands: .sudu / .සුදු | No-prefix: sudu / සුදු');
