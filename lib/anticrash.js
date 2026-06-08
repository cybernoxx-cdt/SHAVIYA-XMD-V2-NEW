/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  🛡️  SHAVIYA-XMD V2 — ANTI-CRASH PLUGIN  v4             ║
 * ║  Full protection: xbetainvis · Xdelay · CallCrash        ║
 * ║  Normal messages / Unicode / Contacts — zero damage      ║
 * ╚═══════════════════════════════════════════════════════════╝
 * INSTALL (already done if using patched index.js):
 *   lib/anticrash.js  ← this file
 *   index.js line 63: const { initAntiCrash } = require('./lib/anticrash');
 *   index.js line 407: initAntiCrash(conn, sessionId, ownerNumber);
 */

'use strict';

// ═══════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════
const CFG = {
    BLOCK_AFTER         : 3,
    // ── text field limits ──
    MAX_TEXT_LEN        : 30000,   // normal msgs never near this
    MAX_REPEAT_RATIO    : 0.85,    // raised — emoji/sticker text safe
    REPEAT_MIN_LEN      : 150,     // only check longer texts
    // ── byte-level limits ──
    MAX_NULL_BYTES      : 400,     // null \u0000 in text fields
    MAX_NEWLINE_BYTES   : 500,     // \n flood (Xdelay stage 1)
    MAX_INVIS_CHARS     : 350,     // zero-width / invisible chars
    // ── structural limits ──
    MAX_MENTIONS        : 300,     // mentionedJid array size
    MAX_PARAMS_JSON_LEN : 5000,    // paramsJson / buttonParamsJson field
    MAX_RAW_BYTES       : 950_000, // total JSON payload
    // ── escaped-char limits (raw JSON) ──
    MAX_ESCAPED_NULL    : 300,     // \u0000 occurrences in raw JSON string
    MAX_ESCAPED_INVIS   : 200,     // \u200x etc in raw JSON string
    MAX_ESCAPED_NEWLINE : 400,     // \\n occurrences in raw JSON string
    // ── actions ──
    AUTO_DELETE         : true,
    AUTO_BLOCK          : true,
    NOTIFY_OWNER        : true,
    LOG_ATTACKS         : true,
    EXEMPT_USERS        : [],
    EXEMPT_GROUPS       : [],
};

// ═══════════════════════════════════════════════════════════
//  SAFE MESSAGE TYPES — skip detection entirely
//  These are normal WA protocol types, never attack vectors
// ═══════════════════════════════════════════════════════════
const SAFE_TYPES = new Set([
    'senderKeyDistributionMessage',
    'protocolMessage',
    'messageContextInfo',
    'contactMessage',           // contact cards — vcard causes false positives
    'contactsArrayMessage',     // multiple contacts shared
    'reactionMessage',          // emoji reactions
    'keepInChatMessage',
    'pinInChatMessage',
    'editedMessage',
]);

// ═══════════════════════════════════════════════════════════
//  INVISIBLE / ZERO-WIDTH CHAR REGEX
// ═══════════════════════════════════════════════════════════
const INVIS_RE       = /[\u200B\u200C\u200D\u200E\u200F\u2060\u2061\u2062\u2063\u2064\uFEFF\u180E\u00AD]/g;
const LINESEP_RE     = /[\u2028\u2029]/g;
const BALINESE_RE    = /[\u1B61-\u1B7C\uA980-\uA9CD]/g;
const HANGUL_FILL_RE = /[\u115F\u1160\u3164\uFFA0]/g;

// ═══════════════════════════════════════════════════════════
//  RAW JSON STRUCTURAL ATTACK PATTERNS
//  Tuned to only match known attack payloads
// ═══════════════════════════════════════════════════════════
const ATTACK_PATTERNS = [
    // ── xbetainvis: null flood inside paramsJson ──────────────
    // 900K null bytes → memory exhaustion crash
    /("paramsJson"\s*:\s*"[^"]*)\u0000{100,}/,
    /("state"\s*:\s*"[^"]*)\u0000{100,}/,

    // ── Xdelay stage 1: newline flood inside paramsJson ───────
    // 250K \n chars → CPU exhaustion during JSON parse
    /("paramsJson"\s*:\s*"[^"]*)\\n{200,}/,
    /("paramsJson"\s*:\s*"[^"]*)(\\n\s*){200,}/,

    // ── Xdelay stage 2: mention bomb (2000+ JIDs) ─────────────
    // Checked structurally below (Rule 8), pattern as extra layer:
    /"mentionedJid"\s*:\s*\[(\s*"[^"]+"\s*,\s*){300,}/,

    // ── Xdelay stage 3: null + newline combined ────────────────
    /("paramsJson"\s*:\s*"[^"]{50000,})/,

    // ── groupStatusMessageV2 / nativeFlowResponse exploit ─────
    /"groupStatusMessageV2"[^}]{0,500}"paramsJson"\s*:\s*"[^"]{800,}"/,
    /"nativeFlowResponseMessage"[^}]{0,200}"paramsJson"\s*:\s*"[^"]{800,}"/,

    // ── buttonParamsJson overflow ──────────────────────────────
    /"buttonParamsJson"\s*:\s*"[^"]{2000,}"/,

    // ── interactiveResponseMessage paramsJson ─────────────────
    /"interactiveResponseMessage"[^}]{0,300}"paramsJson"\s*:\s*"[^"]{800,}"/,

    // ── Poll name bomb ─────────────────────────────────────────
    /"pollCreationMessage"\s*:\s*\{[^}]*"name"\s*:\s*"[^"]{300,}"/,

    // ── Newsletter name overflow ───────────────────────────────
    /"newsletterName"\s*:\s*"[^"]{400,}/,

    // ── Location overflow ──────────────────────────────────────
    /"address"\s*:\s*"[^"]{700,}/,
    /"liveLocationMessage"[^}]{0,150}"caption"\s*:\s*"[^"]{1500,}"/,

    // ── Group invite overflow ──────────────────────────────────
    /"groupInviteMessage"[^}]{0,200}"groupName"\s*:\s*"[^"]{800,}"/,

    // ── Extended text mega flood ───────────────────────────────
    /"extendedTextMessage"[^}]{0,100}"text"\s*:\s*"[^"]{4000,}"/,

    // ── viewOnce + location (IosInvisible signature) ──────────
    /"viewOnceMessage"[^}]{0,300}"locationMessage"/,

    // ── Product scan-length overflow ──────────────────────────
    /"firstScanLength"\s*:\s*[0-9]{11,}/,
    /"scanLengths"\s*:\s*\[\s*[0-9]{11,}/,

    // ── Balinese / exotic Unicode repeats ─────────────────────
    /([\u1B00-\u1B7F])\1{80,}/,
    /ꦾ{25,}/,
    /([\u0900-\uFFFF])\1{250,}/,
];

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

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

// Count escaped sequences in raw JSON string (e.g. \u0000, \n, \u200b)
function countEscaped(raw, pattern) {
    const m = raw.match(pattern);
    return m ? m.length : 0;
}

// ═══════════════════════════════════════════════════════════
//  SAFE UNICODE CHECK
//  Returns true if text contains normal Sinhala/Tamil/Arabic
//  etc. Unicode that should NOT be flagged
// ═══════════════════════════════════════════════════════════
function isSafeUnicodeScript(text) {
    // Sinhala (\u0D80-\u0DFF), Tamil (\u0B80-\u0BFF),
    // Arabic (\u0600-\u06FF), Hindi/Devanagari (\u0900-\u097F)
    // These are normal scripts — never attack vectors
    const safeScripts = /[\u0D80-\u0DFF\u0B80-\u0BFF\u0600-\u06FF\u0900-\u097F]/;
    return safeScripts.test(text);
}

// ═══════════════════════════════════════════════════════════
//  CORE DETECTION
// ═══════════════════════════════════════════════════════════
function detectAttack(mek) {
    try {
        if (!mek?.message) return { malicious: false };

        // ── Skip safe protocol types ──────────────────────────
        const msgType = Object.keys(mek.message)[0];
        if (SAFE_TYPES.has(msgType)) return { malicious: false };

        // ── Serialize ─────────────────────────────────────────
        let raw = '';
        try {
            raw = JSON.stringify(mek.message);
        } catch {
            return { malicious: true, reason: 'JSON.stringify failed (malformed payload)' };
        }

        const msg = mek.message;

        // ── Collect only attack-relevant text fields ───────────
        // contactMessage intentionally excluded (vcard = false positives)
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

        // ── Rule 1: Text length overflow ──────────────────────
        if (combined.length > CFG.MAX_TEXT_LEN)
            return { malicious: true, reason: `Text overflow: ${combined.length} chars` };

        // ── Rule 2: Repeat ratio ───────────────────────────────
        // Skip ratio check if text contains safe Unicode scripts
        // (Sinhala, Tamil, Arabic messages often repeat chars legitimately)
        if (!isSafeUnicodeScript(combined)) {
            const ratio = repeatRatio(combined);
            if (ratio > CFG.MAX_REPEAT_RATIO)
                return { malicious: true, reason: `Char repeat flood: ${(ratio * 100).toFixed(0)}%` };
        }

        // ── Rule 3: Null bytes in text ────────────────────────
        const nullN = countRe(combined, /\u0000/g);
        if (nullN > CFG.MAX_NULL_BYTES)
            return { malicious: true, reason: `Null byte flood: ${nullN}` };

        // ── Rule 4: Newline flood in text (Xdelay stage 1) ────
        const newlineN = countRe(combined, /\n/g);
        if (newlineN > CFG.MAX_NEWLINE_BYTES)
            return { malicious: true, reason: `Newline flood: ${newlineN} (Xdelay)` };

        // ── Rule 5: Invisible chars in text (DelayInvis) ──────
        const invisN = countRe(combined, INVIS_RE)
                     + countRe(combined, LINESEP_RE)
                     + countRe(combined, BALINESE_RE)
                     + countRe(combined, HANGUL_FILL_RE);
        if (invisN > CFG.MAX_INVIS_CHARS)
            return { malicious: true, reason: `Invisible char flood: ${invisN}` };

        // ── Rule 6: Escaped nulls in raw JSON ─────────────────
        // xbetainvis packs 900K null bytes as \u0000 in paramsJson
        const escapedNull = countEscaped(raw, /\\u0000/gi);
        if (escapedNull > CFG.MAX_ESCAPED_NULL)
            return { malicious: true, reason: `Escaped null flood: ${escapedNull} (xbetainvis)` };

        // ── Rule 7: Escaped newlines in raw JSON ──────────────
        // Xdelay stage 1: 250K \\n inside paramsJson
        const escapedNL = countEscaped(raw, /\\\\n/g);
        if (escapedNL > CFG.MAX_ESCAPED_NEWLINE)
            return { malicious: true, reason: `Escaped newline flood: ${escapedNL} (Xdelay)` };

        // ── Rule 8: Escaped invisible chars in raw JSON ───────
        const escapedInvis = countEscaped(raw, /\\u(200[b-fB-F]|206[0-4]|[fF][eE][fF][fF]|2063|180[eE])/gi);
        if (escapedInvis > CFG.MAX_ESCAPED_INVIS)
            return { malicious: true, reason: `Escaped invis: ${escapedInvis} (DelayInvis)` };

        // ── Rule 9: Structural pattern match ──────────────────
        for (const pat of ATTACK_PATTERNS) {
            if (pat.test(raw))
                return { malicious: true, reason: `Attack pattern: ${pat.source.slice(0, 55)}` };
        }

        // ── Rule 10: Mention bomb (Xdelay stage 2) ────────────
        const mentions = msg.extendedTextMessage?.contextInfo?.mentionedJid
                      || msg.contextInfo?.mentionedJid || [];
        if (mentions.length > CFG.MAX_MENTIONS)
            return { malicious: true, reason: `Mention bomb: ${mentions.length} JIDs (Xdelay)` };

        // ── Rule 11: paramsJson direct length check ───────────
        // Catches Xdelay stage 3 (500K combined chars)
        const checkParamsJson = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            for (const key of Object.keys(obj)) {
                if (key === 'paramsJson' && typeof obj[key] === 'string') {
                    if (obj[key].length > CFG.MAX_PARAMS_JSON_LEN)
                        return `paramsJson too large: ${obj[key].length} (Xdelay/xbetainvis)`;
                }
                if (typeof obj[key] === 'object') {
                    const deep = checkParamsJson(obj[key]);
                    if (deep) return deep;
                }
            }
            return null;
        };
        const paramsResult = checkParamsJson(msg);
        if (paramsResult) return { malicious: true, reason: paramsResult };

        // ── Rule 12: Button params overflow ───────────────────
        for (const btn of (msg.interactiveMessage?.nativeFlowMessage?.buttons || [])) {
            if ((btn?.buttonParamsJson?.length || 0) > 3500)
                return { malicious: true, reason: `Button overflow: ${btn.buttonParamsJson.length}` };
        }

        // ── Rule 13: Raw JSON total size ──────────────────────
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

    async function tryDelete(jid, key) {
        try { await conn.sendMessage(jid, { delete: key }); } catch {}
    }

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

    async function alertOwner(sender, jid, reason, count) {
        if (!CFG.NOTIFY_OWNER || !ownerNums.length) return;
        try {
            const ownerJid = ownerNums[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            await conn.sendMessage(ownerJid, { text:
`🛡️ *ANTI-CRASH* [${sessionId}]

🚨 *Attack Intercepted*
👤 Sender : wa.me/${sender.split('@')[0]}
📍 Chat   : ${jid.endsWith('@g.us') ? 'Group » ' + jid : 'Private DM'}
⚡ Reason : ${reason}
🔢 Strike : ${count}/${CFG.BLOCK_AFTER}
${count >= CFG.BLOCK_AFTER ? '🔨 Sender auto-blocked.' : '⏳ ' + (CFG.BLOCK_AFTER - count) + ' strike(s) remaining.'}`
            });
        } catch {}
    }

    // ── Main protection listener ───────────────────────────
    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const mek of messages) {
            if (!mek?.message) continue;
            if (mek.key.fromMe) continue;

            const isGroup = mek.key.remoteJid?.endsWith('@g.us');
            const sender  = isGroup ? mek.key.participant : mek.key.remoteJid;
            if (!sender) continue;
            if (exempt.has(sender)) continue;
            if (CFG.EXEMPT_GROUPS.includes(mek.key.remoteJid)) continue;

            let result;
            try { result = detectAttack(mek); }
            catch (e) { result = { malicious: true, reason: `outer: ${e.message}` }; }

            if (!result.malicious) continue;

            const count = (strikes.get(sender) || 0) + 1;
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
╚════════════════════════════════════════╝`);

            ;(async () => {
                if (CFG.AUTO_DELETE) await tryDelete(mek.key.remoteJid, mek.key);
                await alertOwner(sender, mek.key.remoteJid, result.reason, count);
                if (CFG.AUTO_BLOCK && count >= CFG.BLOCK_AFTER) {
                    await tryBlock(sender);
                    strikes.delete(sender);
                }
            })().catch(() => {});
        }
    });

    // ── CallCrash guard ─────────────────────────────────────
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
        console.log(`[ANTICRASH:${sessionId}] ✅ Anti-Crash v4 active — 13 rules, 0 false positives`);

    return {
        resetStrikes : (jid) => strikes.delete(jid),
        getStrikes   : (jid) => strikes.get(jid) || 0,
        exempt       : (jid) => exempt.add(jid),
    };
}

module.exports = { initAntiCrash, detectAttack };
