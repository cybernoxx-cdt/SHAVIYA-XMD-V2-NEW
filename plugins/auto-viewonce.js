// ============================================================
//   plugins/auto-viewonce.js — SHAVIYA-XMD V2  (FIXED)
//   ✅ Auto-capture every view-once image/video/audio
//   ✅ Forwards to OWNER inbox with sender info
//   ✅ Works even when access-control would block body handlers
//   ✅ Supports viewOnceMessage / V2 / V2Extension + viewOnce flag
//   ✅ Manual: .vv  (reply to view-once)
//   ✅ Toggle:  .autovv on | off | status
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
    if (_seen.size > 800) {
        const first = _seen.values().next().value;
        _seen.delete(first);
    }
    return false;
}

function unwrapMessage(message) {
    if (!message || typeof message !== 'object') return null;
    let msg = message;
    for (let i = 0; i < 5; i++) {
        if (msg.ephemeralMessage?.message) {
            msg = msg.ephemeralMessage.message;
            continue;
        }
        if (msg.deviceSentMessage?.message) {
            msg = msg.deviceSentMessage.message;
            continue;
        }
        if (msg.viewOnceMessage?.message) {
            msg = msg.viewOnceMessage.message;
            continue;
        }
        if (msg.viewOnceMessageV2?.message) {
            msg = msg.viewOnceMessageV2.message;
            continue;
        }
        if (msg.viewOnceMessageV2Extension?.message) {
            msg = msg.viewOnceMessageV2Extension.message;
            continue;
        }
        break;
    }
    return msg;
}

function extractViewOnce(mek) {
    const raw = mek?.message;
    if (!raw) return null;

    const topType = Object.keys(raw).find(k => VIEWONCE_WRAPPERS.has(k));
    if (topType) {
        const inner = raw[topType]?.message;
        if (inner) {
            const innerType = Object.keys(inner).find(k => MEDIA_TYPES.has(k));
            if (innerType) {
                return { innerType, mediaMsg: inner[innerType], wasWrapped: true };
            }
        }
    }

    const unwrapped = unwrapMessage(raw);
    if (unwrapped) {
        for (const t of MEDIA_TYPES) {
            if (unwrapped[t]) {
                const media = unwrapped[t];
                if (media.viewOnce === true || topType) {
                    return { innerType: t, mediaMsg: media, wasWrapped: true };
                }
            }
        }
        const stillWrap = Object.keys(unwrapped).find(k => VIEWONCE_WRAPPERS.has(k));
        if (stillWrap) {
            const inner = unwrapped[stillWrap]?.message;
            if (inner) {
                const innerType = Object.keys(inner).find(k => MEDIA_TYPES.has(k));
                if (innerType) {
                    return { innerType, mediaMsg: inner[innerType], wasWrapped: true };
                }
            }
        }
    }

    return null;
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
    const jids = new Set();
    const raw = (config.OWNER_NUMBER || process.env.OWNER_NUMBER || '').toString();
    raw.split(',').forEach(n => {
        const num = n.replace(/[^0-9]/g, '');
        if (num.length >= 8) jids.add(num + '@s.whatsapp.net');
    });
    try {
        const botNum = (conn.user?.id || '').split(':')[0].split('@')[0];
        if (botNum) jids.add(botNum + '@s.whatsapp.net');
    } catch {}
    return [...jids];
}

function isEnabled(sessionId) {
    const v = getSetting('autoViewOnce', sessionId);
    if (v === false || v === 'false') return false;
    return true;
}

async function processViewOnce(conn, mek, sessionId) {
    try {
        if (!mek?.key || !mek?.message) return;
        if (mek.key.fromMe) return;
        if (mek.key.remoteJid === 'status@broadcast') return;

        const msgId = mek.key.id;
        if (markSeen(msgId)) return;
        if (!isEnabled(sessionId)) return;

        const extracted = extractViewOnce(mek);
        if (!extracted) return;

        const { innerType, mediaMsg } = extracted;

        let buffer;
        try {
            buffer = await downloadMedia(mediaMsg, innerType);
        } catch (e) {
            console.log('[AUTO-VIEWONCE] download failed:', e.message);
            return;
        }
        if (!buffer || buffer.length < 50) return;

        const chat = mek.key.remoteJid || '';
        const isGroup = chat.endsWith('@g.us');
        const rawSender = isGroup
            ? (mek.key.participant || mek.participant || '')
            : chat;
        const senderNumber = String(rawSender).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

        let groupName = '';
        if (isGroup) {
            try {
                const meta = await conn.groupMetadata(chat);
                groupName = meta.subject || chat.split('@')[0];
            } catch {
                groupName = chat.split('@')[0];
            }
        }

        const time = new Date().toLocaleString('en-GB', {
            timeZone: 'Asia/Colombo',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });

        const caption = mediaMsg.caption || '';
        const info =
`🔓 *VIEW-ONCE CAPTURED*
━━━━━━━━━━━━━━━━━━━━━
👤 *Sender:*  @${senderNumber || 'unknown'}
${isGroup ? `👥 *Group:*   ${groupName}\n` : ''}🕐 *Time:*    ${time}
━━━━━━━━━━━━━━━━━━━━━${caption ? `\n💬 *Caption:* ${caption}` : ''}`;

        const mentions = senderNumber ? [`${senderNumber}@s.whatsapp.net`] : [];
        const owners = getOwnerJids(conn);
        if (!owners.length) {
            console.log('[AUTO-VIEWONCE] No owner JID found');
            return;
        }

        for (const ownerJid of owners) {
            try {
                if (innerType === 'imageMessage') {
                    await conn.sendMessage(ownerJid, {
                        image: buffer,
                        caption: info,
                        mentions,
                    });
                } else if (innerType === 'videoMessage') {
                    await conn.sendMessage(ownerJid, {
                        video: buffer,
                        caption: info,
                        mentions,
                    });
                } else if (innerType === 'audioMessage') {
                    await conn.sendMessage(ownerJid, { text: info, mentions });
                    await conn.sendMessage(ownerJid, {
                        audio: buffer,
                        mimetype: mediaMsg.mimetype || 'audio/mp4',
                        ptt: !!mediaMsg.ptt,
                    });
                }
            } catch (e) {
                console.log('[AUTO-VIEWONCE] send to owner failed:', e.message);
            }
        }

        console.log(`[AUTO-VIEWONCE] ✅ Captured ${innerType} from ${senderNumber}`);
    } catch (e) {
        console.log('[AUTO-VIEWONCE ERROR]:', e.message);
    }
}

cmd({ on: 'body', filename: __filename },
async (conn, mek, m, { sessionId }) => {
    await processViewOnce(conn, mek, sessionId || 'default');
});

const _attached = new WeakSet();
function attachRawListener(conn, sessionId) {
    if (!conn || _attached.has(conn)) return;
    _attached.add(conn);
    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' && type !== 'append') return;
        for (const mek of messages || []) {
            await processViewOnce(conn, mek, sessionId || 'default');
        }
    });
    console.log(`[AUTO-VIEWONCE] Raw listener attached (${sessionId})`);
}

function tryAttachAll() {
    try {
        if (global._activeConns && global._activeConns.size) {
            for (const [sid, conn] of global._activeConns) {
                attachRawListener(conn, sid);
            }
        }
    } catch {}
}
tryAttachAll();
setInterval(tryAttachAll, 5000);

cmd({
    pattern:  'vv',
    alias:    ['viewonce', 'openvo', 'reveal'],
    react:    '🔓',
    desc:     'Open / reveal a view-once message (reply to it)',
    category: 'owner',
    filename: __filename,
},
async (conn, mek, m, { from, reply, isOwner }) => {
    try {
        if (!isOwner) return reply('❌ Owner only!');

        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage
                    || m?.quoted?.message
                    || null;

        if (!quoted) {
            return reply('❌ View-once message එකකට *reply* කරලා `.vv` ගහන්න!');
        }

        const fakeMek = {
            key: {
                id: mek.message?.extendedTextMessage?.contextInfo?.stanzaId || ('vv_' + Date.now()),
                remoteJid: from,
                fromMe: false,
                participant: mek.message?.extendedTextMessage?.contextInfo?.participant,
            },
            message: quoted,
        };

        if (fakeMek.key.id) _seen.delete(fakeMek.key.id);

        let extracted = extractViewOnce(fakeMek);

        if (!extracted) {
            const unwrapped = unwrapMessage(quoted) || quoted;
            for (const t of MEDIA_TYPES) {
                if (unwrapped[t]) {
                    extracted = { innerType: t, mediaMsg: unwrapped[t] };
                    break;
                }
            }
        }

        if (!extracted) {
            return reply('❌ මේක view-once / media message එකක් නෙවෙයි.');
        }

        const buffer = await downloadMedia(extracted.mediaMsg, extracted.innerType);
        if (!buffer?.length) return reply('❌ Download fail.');

        if (extracted.innerType === 'imageMessage') {
            await conn.sendMessage(from, {
                image: buffer,
                caption: '🔓 *View-Once Opened*\n' + (extracted.mediaMsg.caption || ''),
            }, { quoted: mek });
        } else if (extracted.innerType === 'videoMessage') {
            await conn.sendMessage(from, {
                video: buffer,
                caption: '🔓 *View-Once Opened*\n' + (extracted.mediaMsg.caption || ''),
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: extracted.mediaMsg.mimetype || 'audio/mp4',
                ptt: !!extracted.mediaMsg.ptt,
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) {
        console.error('[VV]', e);
        reply('⚠️ Error: ' + e.message);
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
async (conn, mek, m, { args, reply, isOwner, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');

    const cur = isEnabled(sessionId);
    if (!args[0]) {
        return reply(
`🔓 *Auto View-Once*

Status: ${cur ? '✅ ON' : '❌ OFF'}

• \`.autovv on\`
• \`.autovv off\`
• \`.vv\` — reply to open one manually`
        );
    }

    const a = args[0].toLowerCase();
    if (a !== 'on' && a !== 'off') {
        return reply('Use `.autovv on` or `.autovv off`');
    }

    const val = a === 'on';
    await setSetting('autoViewOnce', val, sessionId);
    return reply(val
        ? '✅ *Auto View-Once: ON*\n_Incoming view-once media will be sent to owner._'
        : '❌ *Auto View-Once: OFF*');
});

module.exports = { processViewOnce, extractViewOnce };
