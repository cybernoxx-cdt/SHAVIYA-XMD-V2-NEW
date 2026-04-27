// ============================================================
//  group-kickall.js — SHAVIYA-XMD V2 (FIXED VERSION)
// ============================================================

'use strict';

const { cmd } = require('../command');
const config  = require('../config');

// ── State ─────────────────────────────────────────────
const activeKick = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Normalize JID (🔥 FIX)
function normalizeJid(jid = '') {
    return jid.split(':')[0] + '@s.whatsapp.net';
}

// ── Fake vCard
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© SHAVIYA-XMD V2',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── Progress bar
function buildBar(done, total, size = 10) {
    const filled = Math.round((done / total) * size);
    return `[${'█'.repeat(filled)}${'░'.repeat(size - filled)}] ${Math.round((done / total) * 100)}%`;
}

// ── Get group meta
async function getGroupMeta(conn, groupJid) {
    try {
        return await conn.groupMetadata(groupJid);
    } catch {
        return null;
    }
}

// ── Check bot admin (🔥 FIXED)
async function isBotAdmin(conn, groupJid) {
    try {
        const meta = await conn.groupMetadata(groupJid);
        const botJid = normalizeJid(conn.user?.id || '');

        return meta.participants.some(p =>
            normalizeJid(p.id) === botJid && p.admin
        );
    } catch {
        return false;
    }
}

// ── Core kick engine
async function runKickAll(conn, from, members, progressMsg, label, leaveAfter = false) {
    const total = members.length;
    let done = 0, failed = 0;

    const cancelObj = { cancel: false };
    activeKick.set(from, { cancelObj, total, done: 0, failed: 0, label });

    for (const jid of members) {
        if (cancelObj.cancel) break;

        try {
            await conn.groupParticipantsUpdate(from, [jid], 'remove');
            done++;
        } catch {
            failed++;
        }

        activeKick.set(from, { cancelObj, total, done, failed, label });

        if ((done + failed) % 5 === 0 || done + failed === total) {
            try {
                await conn.sendMessage(from, {
                    text:
`╭─〔 🔴 *${label}* 〕
│
│  ${buildBar(done + failed, total)}
│  ✅ Kicked: *${done}*
│  ❌ Failed: *${failed}*
│  📊 Total:  *${total}*
│
╰────────────────⊷`,
                    edit: progressMsg.key
                });
            } catch {}
        }

        await sleep(700);
    }

    const cancelled = cancelObj.cancel;

    try {
        await conn.sendMessage(from, {
            text:
`╭─〔 ${cancelled ? '⏹️' : '✅'} *${label} ${cancelled ? 'CANCELLED' : 'COMPLETE'}* 〕
│
│  ${buildBar(done, total)}
│
│  ✅ Kicked: ${done}
│  ❌ Failed: ${failed}
│  📊 Total:  ${total}
│
╰────────────────⊷`,
            edit: progressMsg.key
        });
    } catch {}

    activeKick.delete(from);

    if (leaveAfter && !cancelled) {
        await sleep(1500);
        try { await conn.groupLeave(from); } catch {}
    }
}

// ════════════════════════════════════════════════════
//  KICKALL
// ════════════════════════════════════════════════════
cmd({
    pattern: 'kickall',
    desc: 'Kick all members',
    category: 'group',
    react: '💀',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, sender, reply }) => {

    if (!from.endsWith('@g.us')) return reply('❌ Group only!');
    if (!isOwner) return reply('❌ Owner only!');
    if (activeKick.has(from)) return reply('⚠️ Already running!');

    const leaveAfter = q === 'me';

    if (!(await isBotAdmin(conn, from))) {
        return reply('❌ I am not admin!');
    }

    const meta = await getGroupMeta(conn, from);
    if (!meta) return reply('❌ Failed to fetch group');

    const botJid = normalizeJid(conn.user?.id || '');
    const ownerJid = sender;

    const targets = meta.participants.filter(p => {
        const jid = normalizeJid(p.id);

        if (p.admin) return false;
        if (jid === botJid) return false;
        if (jid === ownerJid) return false;

        return true;
    }).map(p => p.id);

    if (!targets.length) return reply('✅ No members to kick');

    const msg = await conn.sendMessage(from, {
        text: `🚀 Kickall Started\nTotal: ${targets.length}`
    }, { quoted: FakeVCard });

    await runKickAll(conn, from, targets, msg, 'KICKALL', leaveAfter);
});

// ════════════════════════════════════════════════════
//  CANCEL
// ════════════════════════════════════════════════════
cmd({
    pattern: 'cancelkick',
    desc: 'Cancel kick',
    category: 'group',
    react: '⏹️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {

    if (!isOwner) return reply('❌ Owner only');

    if (!activeKick.has(from)) {
        return reply('✅ No running task');
    }

    activeKick.get(from).cancelObj.cancel = true;

    reply('⏹️ Cancelled!');
});

// ════════════════════════════════════════════════════
//  STATUS
// ════════════════════════════════════════════════════
cmd({
    pattern: 'kickstatus',
    desc: 'Show status',
    category: 'group',
    react: '📊',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {

    if (!activeKick.has(from)) {
        return reply('✅ No active task');
    }

    const { total, done, failed, label } = activeKick.get(from);

    reply(
`📊 ${label}

${buildBar(done + failed, total)}

✅ ${done}
❌ ${failed}
📊 ${total}`
    );
});
