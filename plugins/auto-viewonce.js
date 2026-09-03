// ============================================================
//   plugins/auto-viewonce.js — SHAVIYA-XMD V2  (HARD FIX)
//   Hooked from index.js like antidelete (BEFORE access control)
// ============================================================

'use strict';

const { cmd } = require('../command');
const config  = require('../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getSetting, setSetting } = require('../lib/settings');

const VIEWONCE_WRAPPERS = new Set([
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
]);

const MEDIA_TYPES = new Set([
    'imageMessage',
    'videoMessage',
    'audioMessage',
]);

const _seen = new Set();
function markSeen(id) {
    if (!id) return false;
    if (_seen.has(id)) return true;
    _seen.add(id);
    if (_seen.size > 1000) {
        const first = _seen.values().next().value;
        _seen.delete(first);
    }
    return false;
}

function deepFindViewOnce(obj, depth) {
    if (depth === undefined) depth = 0;
    if (!obj || typeof obj !== 'object' || depth > 8) return null;

    for (const w of VIEWONCE_WRAPPERS) {
        if (obj[w] && obj[w].message) {
            const inner = obj[w].message;
            for (const t of MEDIA_TYPES) {
                if (inner[t]) return { innerType: t, mediaMsg: inner[t] };
            }
            const nested = deepFindViewOnce(inner, depth + 1);
            if (nested) return nested;
        }
    }

    for (const t of MEDIA_TYPES) {
        if (obj[t] && obj[t].viewOnce === true) {
            return { innerType: t, mediaMsg: obj[t] };
        }
    }

    const wrapKeys = ['ephemeralMessage', 'deviceSentMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
    for (let i = 0; i < wrapKeys.length; i++) {
        const key = wrapKeys[i];
        if (obj[key] && obj[key].message) {
            const nested = deepFindViewOnce(obj[key].message, depth + 1);
            if (nested) return nested;
        }
    }

    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k === 'key' || k === 'messageContextInfo') continue;
        if (obj[k] && typeof obj[k] === 'object') {
            const nested = deepFindViewOnce(obj[k], depth + 1);
            if (nested) return nested;
        }
    }
    return null;
}

function extractViewOnce(mek) {
    if (!mek || !mek.message) return null;
    return deepFindViewOnce(mek.message, 0);
}

async function downloadMedia(mediaMsg, innerType) {
    const kind = innerType.replace('Message', '');
    const stream = await downloadContentFromMessage(mediaMsg, kind);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

function getOwnerJids(conn) {
    const jids = [];
    const botNum = String((conn && conn.user && conn.user.id) || '')
        .split(':')[0]
        .split('@')[0]
        .replace(/[^0-9]/g, '');

    const raw = (config.OWNER_NUMBER || process.env.OWNER_NUMBER || '').toString();
    const parts = raw.split(',');
    for (let i = 0; i < parts.length; i++) {
        const num = parts[i].replace(/[^0-9]/g, '');
        if (num.length < 8) continue;
        if (botNum && num === botNum) continue;
        jids.push(num + '@s.whatsapp.net');
    }

    if (!jids.length && botNum) {
        jids.push(botNum + '@s.whatsapp.net');
    }
    return jids;
}

function isEnabled(sessionId) {
    try {
        const v = getSetting('autoViewOnce', sessionId || 'main');
        if (v === false || v === 'false' || v === 0) return false;
        return true;
    } catch (e) {
        return true;
    }
}

async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek || !mek.key || !mek.message) return;
        if (mek.key.fromMe) return;
        if (mek.key.remoteJid === 'status@broadcast') return;

        const msgId = mek.key.id;
        if (markSeen(msgId)) return;

        if (!isEnabled(sessionId)) return;

        const extracted = extractViewOnce(mek);
        if (!extracted) return;

        console.log('[AUTO-VIEWONCE] Detected ' + extracted.innerType + ' id=' + msgId);

        let buffer;
        try {
            buffer = await downloadMedia(extracted.mediaMsg, extracted.innerType);
        } catch (e) {
            console.log('[AUTO-VIEWONCE] download failed:', e.message);
            return;
        }
        if (!buffer || buffer.length < 50) {
            console.log('[AUTO-VIEWONCE] empty buffer');
            return;
        }

        const chat = mek.key.remoteJid || '';
        const isGroup = chat.endsWith('@g.us');
        const rawSender = isGroup
            ? (mek.key.participant || mek.participant || '')
            : chat;
        const senderNumber = String(rawSender)
            .split('@')[0]
            .split(':')[0]
            .replace(/[^0-9]/g, '');

        let groupName = '';
        if (isGroup) {
            try {
                const meta = await conn.groupMetadata(chat);
                groupName = meta.subject || '';
            } catch (e) {
                groupName = chat.split('@')[0];
            }
        }

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });

        const caption = extracted.mediaMsg.caption || '';
        const info =
'🔓 *VIEW-ONCE CAPTURED*\n' +
'━━━━━━━━━━━━━━━━━━━━━\n' +
'👤 *Sender:*  @' + (senderNumber || 'unknown') + '\n' +
(isGroup ? ('👥 *Group:*   ' + groupName + '\n') : '') +
'🕐 *Time:*    ' + time + '\n' +
'━━━━━━━━━━━━━━━━━━━━━' +
(caption ? ('\n💬 *Caption:* ' + caption) : '');

        const mentions = senderNumber ? [senderNumber + '@s.whatsapp.net'] : [];
        const owners = getOwnerJids(conn);

        console.log('[AUTO-VIEWONCE] Sending to owners:', owners);

        if (!owners.length) {
            console.log('[AUTO-VIEWONCE] No OWNER_NUMBER set!');
            return;
        }

        for (let i = 0; i < owners.length; i++) {
            const ownerJid = owners[i];
            try {
                if (extracted.innerType === 'imageMessage') {
                    await conn.sendMessage(ownerJid, {
                        image: buffer,
                        caption: info,
                        mentions: mentions,
                    });
                } else if (extracted.innerType === 'videoMessage') {
                    await conn.sendMessage(ownerJid, {
                        video: buffer,
                        caption: info,
                        mentions: mentions,
                    });
                } else if (extracted.innerType === 'audioMessage') {
                    await conn.sendMessage(ownerJid, { text: info, mentions: mentions });
                    await conn.sendMessage(ownerJid, {
                        audio: buffer,
                        mimetype: extracted.mediaMsg.mimetype || 'audio/mp4',
                        ptt: !!extracted.mediaMsg.ptt,
                    });
                }
                console.log('[AUTO-VIEWONCE] Sent to ' + ownerJid);
            } catch (e) {
                console.log('[AUTO-VIEWONCE] send failed:', e.message);
            }
        }
    } catch (e) {
        console.log('[AUTO-VIEWONCE ERROR]:', e.message);
    }
}

cmd({ on: 'body', filename: __filename },
async (conn, mek, m, ctx) => {
    await onMessage(conn, mek, (ctx && ctx.sessionId) || 'main');
});

cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'openvo', 'reveal'],
    react:    '🔓',
    desc:     'Open / reveal a view-once message (reply to it)',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, ctx) => {
    try {
        if (!ctx.isOwner) return ctx.reply('Owner only!');

        const quoted = (mek.message && mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo && mek.message.extendedTextMessage.contextInfo.quotedMessage)
                    || (m && m.quoted && m.quoted.message)
                    || null;

        if (!quoted) {
            return ctx.reply('View-once ekata *reply* karala `.vv` gahanna!');
        }

        const stanzaId = mek.message && mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo
            ? mek.message.extendedTextMessage.contextInfo.stanzaId
            : null;

        const fakeMek = {
            key: {
                id: stanzaId || ('vv_' + Date.now()),
                remoteJid: ctx.from,
                fromMe: false,
                participant: mek.message && mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo
                    ? mek.message.extendedTextMessage.contextInfo.participant
                    : undefined,
            },
            message: quoted,
        };
        if (fakeMek.key.id) _seen.delete(fakeMek.key.id);

        let extracted = extractViewOnce(fakeMek);
        if (!extracted) {
            for (const t of MEDIA_TYPES) {
                if (quoted[t]) {
                    extracted = { innerType: t, mediaMsg: quoted[t] };
                    break;
                }
            }
            if (!extracted) extracted = deepFindViewOnce(quoted, 0);
        }
        if (!extracted) return ctx.reply('View-once / media hoyaganna ba.');

        const buffer = await downloadMedia(extracted.mediaMsg, extracted.innerType);
        if (!buffer || !buffer.length) return ctx.reply('Download fail.');

        if (extracted.innerType === 'imageMessage') {
            await conn.sendMessage(ctx.from, {
                image: buffer,
                caption: '🔓 *View-Once Opened*\n' + (extracted.mediaMsg.caption || ''),
            }, { quoted: mek });
        } else if (extracted.innerType === 'videoMessage') {
            await conn.sendMessage(ctx.from, {
                video: buffer,
                caption: '🔓 *View-Once Opened*\n' + (extracted.mediaMsg.caption || ''),
            }, { quoted: mek });
        } else {
            await conn.sendMessage(ctx.from, {
                audio: buffer,
                mimetype: extracted.mediaMsg.mimetype || 'audio/mp4',
                ptt: !!extracted.mediaMsg.ptt,
            }, { quoted: mek });
        }
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(function () {});
    } catch (e) {
        console.error('[VV]', e);
        ctx.reply('Error: ' + e.message);
    }
});

cmd({
    pattern:  'autovv',
    alias:    ['autoviewonce', 'avv'],
    react:    '⚙️',
    desc:     'Turn auto view-once capture ON/OFF',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, ctx) => {
    if (!ctx.isOwner) return ctx.reply('Owner only!');
    const cur = isEnabled(ctx.sessionId);
    if (!ctx.args[0]) {
        return ctx.reply(
'🔓 *Auto View-Once*\nStatus: ' + (cur ? 'ON' : 'OFF') + '\n\n' +
'• `.autovv on`\n• `.autovv off`\n• `.vv` — reply to open\n\n' +
'Owner: ' + (config.OWNER_NUMBER || 'NOT SET')
        );
    }
    const a = ctx.args[0].toLowerCase();
    if (a !== 'on' && a !== 'off') return ctx.reply('Use `.autovv on` or `.autovv off`');
    const val = a === 'on';
    await setSetting('autoViewOnce', val, ctx.sessionId);
    return ctx.reply(val ? '✅ *Auto View-Once: ON*' : '❌ *Auto View-Once: OFF*');
});

module.exports = { onMessage, extractViewOnce };
