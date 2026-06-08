/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  🛡️  SHAVIYA-XMD V2 — ANTI-CRASH PLUGIN  v5             ║
 * ║  xbetainvis · Xdelay · CallCrash · DelayInvis            ║
 * ║  v5: instant block · newsletter safe · full chat block   ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════
const CFG = {
    // ── Block immediately on first confirmed attack ──
    BLOCK_AFTER         : 1,

    // ── Text field limits ──
    MAX_TEXT_LEN        : 30000,
    MAX_REPEAT_RATIO    : 0.85,
    REPEAT_MIN_LEN      : 150,

    // ── Byte-level limits ──
    MAX_NULL_BYTES      : 400,
    MAX_NEWLINE_BYTES   : 500,
    MAX_INVIS_CHARS     : 350,

    // ── Structural limits ──
    MAX_MENTIONS        : 300,
    MAX_PARAMS_JSON_LEN : 5000,
    MAX_RAW_BYTES       : 950_000,

    // ── Escaped-char limits (raw JSON) ──
    MAX_ESCAPED_NULL    : 300,
    MAX_ESCAPED_INVIS   : 200,
    MAX_ESCAPED_NEWLINE : 400,

    // ── Actions ──
    AUTO_DELETE         : true,
    AUTO_BLOCK          : true,
    NOTIFY_OWNER        : true,
    LOG_ATTACKS         : true,

    EXEMPT_USERS        : [],
    EXEMPT_GROUPS       : [],
};

// ═══════════════════════════════════════════════════════════
//  SAFE JID PREFIXES — these senders are NEVER flagged
//  120363 = WhatsApp Newsletters / Channels / Business
//  These JIDs send system messages with special Unicode
//  that would otherwise trigger false positives
// ═══════════════════════════════════════════════════════════
const SAFE_JID_PREFIXES = [
    '120363',       // WhatsApp Newsletters & Channels
    '0@s',          // System messages
    'status@',      // Status broadcast
];

// ═══════════════════════════════════════════════════════════
//  SAFE MESSAGE TYPES — skip detection entirely
// ═══════════════════════════════════════════════════════════
const SAFE_TYPES = new Set([
    'senderKeyDistributionMessage',
    'protocolMessage',
    'messageContextInfo',
    'contactMessage',
    'contactsArrayMessage',
    'reactionMessage',
    'keepInChatMessage',
    'pinInChatMessage',
    'editedMessage',
    'newsletterAdminInviteMessage',
    'newsletterReactionMessage',
]);

// ═══════════════════════════════════════════════════════════
//  INVISIBLE / ZERO-WIDTH CHAR REGEX
// ═══════════════════════════════════════════════════════════
const INVIS_RE       = /[\u200B\u200C\u200D\u200E\u200F\u2060\u2061\u2062\u2063\u2064\uFEFF\u180E\u00AD]/g;
const LINESEP_RE     = /[\u2028\u2029]/g;
const BALINESE_RE    = /[\u1B61-\u1B7C\uA980-\uA9CD]/g;
const HANGUL_FILL_RE = /[\u115F\u1160\u3164\uFFA0]/g;

// ═══════════════════════════════════════════════════════════
//  ATTACK PATTERNS — tuned to never match normal messages
// ═══════════════════════════════════════════════════════════
const ATTACK_PATTERNS = [
    // xbetainvis: null flood inside paramsJson / state
    /("paramsJson"\s*:\s*"[^"]*)\u0000{100,}/,
    /("state"\s*:\s*"[^"]*)\u0000{100,}/,

    // Xdelay stage 1: newline flood inside paramsJson
    /("paramsJson"\s*:\s*"[^"]*)\\n{200,}/,

    // Xdelay stage 2: mention bomb
    /"mentionedJid"\s*:\s*\[(\s*"[^"]+"\s*,\s*){300,}/,

    // Xdelay stage 3: oversized paramsJson
    /"paramsJson"\s*:\s*"[^"]{50000,}"/,

    // groupStatusMessageV2 / nativeFlowResponse exploit
    /"groupStatusMessageV2"[^}]{0,500}"paramsJson"\s*:\s*"[^"]{800,}"/,
    /"nativeFlowResponseMessage"[^}]{0,200}"paramsJson"\s*:\s*"[^"]{800,}"/,
    /"interactiveResponseMessage"[^}]{0,300}"paramsJson"\s*:\s*"[^"]{800,}"/,

    // buttonParamsJson overflow
    /"buttonParamsJson"\s*:\s*"[^"]{2000,}"/,

    // Poll name bomb
    /"pollCreationMessage"\s*:\s*\{[^}]*"name"\s*:\s*"[^"]{300,}"/,

    // Location overflow
    /"address"\s*:\s*"[^"]{700,}/,
    /"liveLocationMessage"[^}]{0,150}"caption"\s*:\s*"[^"]{1500,}"/,

    // Group invite overflow
    /"groupInviteMessage"[^}]{0,200}"groupName"\s*:\s*"[^"]{800,}"/,

    // Extended text mega flood
    /"extendedTextMessage"[^}]{0,100}"text"\s*:\s*"[^"]{4000,}"/,

    // viewOnce + location (IosInvisible)
    /"viewOnceMessage"[^}]{0,300}"locationMessage"/,

    // Product scan overflow
    /"firstScanLength"\s*:\s*[0-9]{11,}/,

    // Balinese / exotic Unicode
    /([\u1B00-\u1B7F])\1{80,}/,
    /ꦾ{25,}/,
    /([\u0900-\uFFFF])\1{250,}/,
];

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function isSafeJid(jid) {
    if (!jid) return false;
    return SAFE_JID_PREFIXES.some(p => jid.startsWith(p));
}

function repeatRatio(text) {
    if (!text || text.length < CFG.REPEAT_MIN_LEN) return 0;
    const freq = {};
    const len = text.length;
    for (const ch of text) {
        freq[ch] = (freq[ch] || 0) + 1;
        if (freq[ch] / len > CFG.MAX_REPEAT_RATIO) return freq[ch] / len;
    }
    return 0;
}

function countRe(text, re) {
    if (!text) return 0;
    const m = text.match(re);
    return m ? m.length : 0;
}

function countEscaped(raw, pattern) {
    const m = raw.match(pattern);
    return m ? m.length : 0;
}

function isSafeUnicodeScript(text) {
    return /[\u0D80-\u0DFF\u0B80-\u0BFF\u0600-\u06FF\u0900-\u097F]/.test(text);
}

// Deep scan object for oversized paramsJson at any nesting level
function checkParamsJsonDeep(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return null;
    for (const key of Object.keys(obj)) {
        if (key === 'paramsJson' && typeof obj[key] === 'string') {
            if (obj[key].length > CFG.MAX_PARAMS_JSON_LEN)
                return `paramsJson too large: ${obj[key].length}`;
        }
        if (obj[key] && typeof obj[key] === 'object') {
            const deep = checkParamsJsonDeep(obj[key], depth + 1);
            if (deep) return deep;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════
//  CORE DETECTION
// ═══════════════════════════════════════════════════════════
function detectAttack(mek) {
    try {
        if (!mek?.message) return { malicious: false };

        // Skip safe message types
        const msgType = Object.keys(mek.message)[0];
        if (SAFE_TYPES.has(msgType)) return { malicious: false };

        // Serialize
        let raw = '';
        try {
            raw = JSON.stringify(mek.message);
        } catch {
            return { malicious: true, reason: 'JSON.stringify failed (malformed)' };
        }

        const msg = mek.message;

        // Collect attack-relevant text fields only
        const texts = [
            msg.conversation,
            msg.extendedTextMessage?.text,
            msg.imageMessage?.caption,
            msg.videoMessage?.caption,
            msg.audioMessage?.caption,
            msg.documentMessage?.caption,
            msg.locationMessage?.address,
            msg.liveLocationMessage?.caption,
            msg.pollCreationMessage?.name,
            msg.groupInviteMessage?.groupName,
            msg.interactiveMessage?.header?.title,
            msg.interactiveMessage?.body?.text,
            ...(msg.pollCreationMessage?.options?.map(o => o.name) || []),
        ].filter(v => typeof v === 'string' && v.length > 0);

        const combined = texts.join(' ');

        // Rule 1: Text length
        if (combined.length > CFG.MAX_TEXT_LEN)
            return { malicious: true, reason: `Text overflow: ${combined.length} chars` };

        // Rule 2: Repeat ratio (skip for safe Unicode scripts)
        if (!isSafeUnicodeScript(combined)) {
            const ratio = repeatRatio(combined);
            if (ratio > CFG.MAX_REPEAT_RATIO)
                return { malicious: true, reason: `Char repeat flood: ${(ratio * 100).toFixed(0)}%` };
        }

        // Rule 3: Null bytes
        const nullN = countRe(combined, /\u0000/g);
        if (nullN > CFG.MAX_NULL_BYTES)
            return { malicious: true, reason: `Null byte flood: ${nullN}` };

        // Rule 4: Newline flood (Xdelay stage 1)
        const newlineN = countRe(combined, /\n/g);
        if (newlineN > CFG.MAX_NEWLINE_BYTES)
            return { malicious: true, reason: `Newline flood: ${newlineN} (Xdelay)` };

        // Rule 5: Invisible chars (DelayInvis)
        const invisN = countRe(combined, INVIS_RE)
                     + countRe(combined, LINESEP_RE)
                     + countRe(combined, BALINESE_RE)
                     + countRe(combined, HANGUL_FILL_RE);
        if (invisN > CFG.MAX_INVIS_CHARS)
            return { malicious: true, reason: `Invisible char flood: ${invisN}` };

        // Rule 6: Escaped nulls in raw JSON (xbetainvis)
        const escapedNull = countEscaped(raw, /\\u0000/gi);
        if (escapedNull > CFG.MAX_ESCAPED_NULL)
            return { malicious: true, reason: `Escaped null flood: ${escapedNull} (xbetainvis)` };

        // Rule 7: Escaped newlines in raw JSON (Xdelay)
        const escapedNL = countEscaped(raw, /\\\\n/g);
        if (escapedNL > CFG.MAX_ESCAPED_NEWLINE)
            return { malicious: true, reason: `Escaped newline flood: ${escapedNL} (Xdelay)` };

        // Rule 8: Escaped invisible chars (DelayInvis)
        const escapedInvis = countEscaped(raw, /\\u(200[b-fB-F]|206[0-4]|[fF][eE][fF][fF]|2063|180[eE])/gi);
        if (escapedInvis > CFG.MAX_ESCAPED_INVIS)
            return { malicious: true, reason: `Escaped invis flood: ${escapedInvis} (DelayInvis)` };

        // Rule 9: Structural pattern match
        for (const pat of ATTACK_PATTERNS) {
            if (pat.test(raw))
                return { malicious: true, reason: `Attack pattern detected` };
        }

        // Rule 10: Mention bomb (Xdelay stage 2)
        const mentions = msg.extendedTextMessage?.contextInfo?.mentionedJid
                      || msg.contextInfo?.mentionedJid || [];
        if (mentions.length > CFG.MAX_MENTIONS)
            return { malicious: true, reason: `Mention bomb: ${mentions.length} JIDs` };

        // Rule 11: Deep paramsJson size check (Xdelay stage 3)
        const paramsResult = checkParamsJsonDeep(msg);
        if (paramsResult) return { malicious: true, reason: paramsResult };

        // Rule 12: Button params overflow
        for (const btn of (msg.interactiveMessage?.nativeFlowMessage?.buttons || [])) {
            if ((btn?.buttonParamsJson?.length || 0) > 3500)
                return { malicious: true, reason: `Button overflow: ${btn.buttonParamsJson.length}` };
        }

        // Rule 13: Total payload size
        if (raw.length > CFG.MAX_RAW_BYTES)
            return { malicious: true, reason: `Payload too large: ${raw.length} bytes` };

        return { malicious: false };

    } catch (err) {
        return { malicious: true, reason: `Detection error: ${err.message}` };
    }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function initAntiCrash(conn, sessionId = 'default', ownerNums = []) {

    const exempt = new Set([
        ...CFG.EXEMPT_USERS,
        ...ownerNums.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net'),
    ]);

    const strikes = new Map();

    // Safe delete — silent fail if no admin rights
    async function tryDelete(jid, key) {
        try { await conn.sendMessage(jid, { delete: key }); } catch {}
    }

    // Block sender
    async function tryBlock(jid) {
        try {
            await conn.updateBlockStatus(jid, 'block');
            if (CFG.LOG_ATTACKS)
                console.log(`[ANTICRASH:${sessionId}] 🔨 Blocked ${jid}`);
        } catch (e) {
            if (CFG.LOG_ATTACKS)
                console.log(`[ANTICRASH:${sessionId}] ⚠️ Block failed: ${e.message}`);
        }
    }

    // Full chat block — stops all future messages from sender
    async function blockChat(jid) {
        try {
            // Mark chat as archived and muted permanently
            await conn.chatModify({ archive: true, lastMessages: [] }, jid);
            await conn.chatModify({
                mute: 365 * 24 * 60 * 60, // 1 year mute
            }, jid);
        } catch {}
    }

    // Notify owner
    async function alertOwner(sender, jid, reason, count, blocked) {
        if (!CFG.NOTIFY_OWNER || !ownerNums.length) return;
        try {
            const ownerJid = ownerNums[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            const isGroup  = jid.endsWith('@g.us');
            await conn.sendMessage(ownerJid, { text:
`🛡️ *ANTI-CRASH* [${sessionId}]

🚨 *Attack Intercepted & Blocked*
👤 Sender : wa.me/${sender.split('@')[0]}
📍 Chat   : ${isGroup ? 'Group » ' + jid : 'Private DM'}
⚡ Reason : ${reason}
🔢 Strike : ${count}/${CFG.BLOCK_AFTER}
${blocked ? '🔨 Sender auto-blocked + chat muted.' : '⏳ Monitoring...'}`
            });
        } catch {}
    }

    // ── Main protection listener ──────────────────────────
    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const mek of messages) {
            if (!mek?.message) continue;
            if (mek.key.fromMe) continue;

            const isGroup = mek.key.remoteJid?.endsWith('@g.us');
            const sender  = isGroup ? mek.key.participant : mek.key.remoteJid;
            if (!sender) continue;

            // Safe JID check — newsletters, system, broadcast
            if (isSafeJid(sender)) continue;
            if (isSafeJid(mek.key.remoteJid)) continue;

            if (exempt.has(sender)) continue;
            if (CFG.EXEMPT_GROUPS.includes(mek.key.remoteJid)) continue;

            let result;
            try { result = detectAttack(mek); }
            catch (e) { result = { malicious: true, reason: `outer: ${e.message}` }; }

            if (!result.malicious) continue;

            const count   = (strikes.get(sender) || 0) + 1;
            const blocked = CFG.AUTO_BLOCK && count >= CFG.BLOCK_AFTER;
            strikes.set(sender, count);

            if (CFG.LOG_ATTACKS) console.log(
`╔════════════════════════════════════════╗
║  🚨 ANTICRASH — BLOCKED                ║
╠════════════════════════════════════════╣
  Session : ${sessionId}
  Sender  : ${sender}
  Chat    : ${mek.key.remoteJid}
  Reason  : ${result.reason}
  Strike  : ${count}/${CFG.BLOCK_AFTER}
  Action  : ${blocked ? 'BLOCKED + CHAT MUTED' : 'MESSAGE DELETED'}
╚════════════════════════════════════════╝`);

            ;(async () => {
                // 1. Delete the attack message immediately
                if (CFG.AUTO_DELETE) await tryDelete(mek.key.remoteJid, mek.key);

                // 2. Block sender + mute chat on first strike
                if (blocked) {
                    await tryBlock(sender);
                    await blockChat(mek.key.remoteJid);
                    strikes.delete(sender);
                }

                // 3. Notify owner
                await alertOwner(sender, mek.key.remoteJid, result.reason, count, blocked);
            })().catch(() => {});
        }
    });

    // ── CallCrash guard — WebSocket level ────────────────
    try {
        if (conn.ws && typeof conn.ws.emit === 'function') {
            const _orig = conn.ws.emit.bind(conn.ws);
            conn.ws.emit = function (ev, ...args) {
                if (ev === 'CB:call' || ev === 'CB:call,offer' || ev === 'CB:call,terminate') {
                    if (CFG.LOG_ATTACKS)
                        console.log(`[ANTICRASH:${sessionId}] 📵 CallCrash blocked (${ev})`);
                    return true;
                }
                return _orig(ev, ...args);
            };
        }
    } catch {}

    if (CFG.LOG_ATTACKS)
        console.log(`[ANTICRASH:${sessionId}] ✅ Anti-Crash v5 active — instant block · newsletter safe · 13 rules`);

    return {
        resetStrikes : (jid) => strikes.delete(jid),
        getStrikes   : (jid) => strikes.get(jid) || 0,
        exempt       : (jid) => exempt.add(jid),
    };
}

module.exports = { initAntiCrash, detectAttack };
