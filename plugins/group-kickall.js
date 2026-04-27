// ============================================================
//  group-kickall.js — SHAVIYA-XMD V2
//  ✅ .kickall     — Kick ALL non-admin members
//  ✅ .kickall me  — Kick all + bot leaves group
//  ✅ .softkick    — Kick members who joined before X days
//  ✅ .kickbots    — Kick all bot accounts from group
//  ✅ .kickstatus  — Show live progress of ongoing kickall
//  ✅ .cancelkick  — Cancel any ongoing kickall operation
//  CDT — Crash Delta Team
// ============================================================

'use strict';

const { cmd } = require('../command');
const config  = require('../config');

// ── In-memory state for ongoing operations ─────────────────
const activeKick = new Map(); // groupJid → { cancel, total, done, status }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Fake vCard ──────────────────────────────────────────────
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── Progress bar helper ─────────────────────────────────────
function buildBar(done, total, size = 10) {
    const filled = Math.round((done / total) * size);
    const bar = '█'.repeat(filled) + '░'.repeat(size - filled);
    const pct  = Math.round((done / total) * 100);
    return `[${bar}] ${pct}%`;
}

// ── Get group metadata safely ───────────────────────────────
async function getGroupMeta(conn, groupJid) {
    try {
        return await conn.groupMetadata(groupJid);
    } catch (e) {
        return null;
    }
}

// ── Check if bot is admin ───────────────────────────────────
async function isBotAdmin(conn, groupJid) {
    try {
        const meta = await conn.groupMetadata(groupJid);
        const botJid = conn.user?.id?.replace(/:.*@/, '@') || '';
        return meta.participants.some(p =>
            (p.id === botJid || p.id.split(':')[0] + '@s.whatsapp.net' === botJid) && p.admin
        );
    } catch (_) {
        return false;
    }
}

// ── Core kick engine ────────────────────────────────────────
async function runKickAll(conn, from, members, progressMsg, label, leaveAfter = false) {
    const total = members.length;
    let done = 0;
    let failed = 0;
    const cancelObj = { cancel: false };
    activeKick.set(from, { cancelObj, total, done: 0, failed: 0, label });

    for (const jid of members) {
        if (cancelObj.cancel) break;

        try {
            await conn.groupParticipantsUpdate(from, [jid], 'remove');
            done++;
        } catch (_) {
            failed++;
        }

        // Update state
        activeKick.set(from, { cancelObj, total, done, failed, label });

        // Edit progress message every 5 kicks or on last
        if ((done + failed) % 5 === 0 || done + failed === total) {
            const bar = buildBar(done + failed, total);
            try {
                await conn.sendMessage(from, {
                    text:
`╭─〔 🔴 *${label}* 〕
│
│  ${bar}
│  ✅ Kicked: *${done}*
│  ❌ Failed: *${failed}*
│  📊 Total:  *${total}*
│
│  _ᴘʀᴏᴄᴇꜱꜱɪɴɢ... ᴅᴏ ɴᴏᴛ ᴄʟᴏꜱᴇ_
╰────────────────⊷`,
                    edit: progressMsg.key
                });
            } catch (_) {}
        }

        await sleep(750); // Avoid WhatsApp rate limit ban
    }

    // Final edit
    const cancelled = cancelObj.cancel;
    try {
        await conn.sendMessage(from, {
            text:
`╭─〔 ${cancelled ? '⏹️' : '✅'} *${label} ${cancelled ? 'CANCELLED' : 'COMPLETE'}* 〕
│
│  ${buildBar(done, total)}
│
│  ✅ *Kicked:*  ${done}
│  ❌ *Failed:*  ${failed}
│  👥 *Total:*   ${total}
│  📌 *Status:* ${cancelled ? 'Cancelled by owner' : 'All done!'}
│
╰────────────────⊷
> Sʜᴀᴠɪʏᴀ Xᴍᴅ 𝗩𝟮 🌖`,
            edit: progressMsg.key
        });
    } catch (_) {}

    activeKick.delete(from);

    if (leaveAfter && !cancelled) {
        await sleep(1500);
        try { await conn.groupLeave(from); } catch (_) {}
    }
}

// ══════════════════════════════════════════════════════════════
//  .kickall — Kick ALL non-admin members
//  Usage: .kickall         → kick all members, bot stays
//         .kickall me      → kick all members + bot leaves
//         .kickall confirm → skip confirmation prompt
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'kickall',
    alias:    ['removeall', 'kickeveryone'],
    desc:     'Kick all non-admin members from the group',
    category: 'group',
    react:    '💀',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, sender, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner) return reply('❌ *Owner only command!*');
    if (activeKick.has(from)) return reply('⚠️ *A kick operation is already running!*\nUse `.kickstatus` to check or `.cancelkick` to stop.');

    const arg       = (q || '').toLowerCase().trim();
    const leaveAfter = arg === 'me';
    const skipConfirm = arg === 'confirm' || leaveAfter;

    // Admin check
    const adminOk = await isBotAdmin(conn, from);
    if (!adminOk) return reply('❌ *I am not an admin!*\nPromote me to admin first.');

    const meta = await getGroupMeta(conn, from);
    if (!meta) return reply('❌ Failed to fetch group info.');

    const botJid    = conn.user?.id?.replace(/:.*@/, '@') || '';
    const ownerJid  = sender;
    const ownerNum  = config.OWNER_NUMBER ? config.OWNER_NUMBER + '@s.whatsapp.net' : null;

    // Filter: skip admins, bot, owner
    const targets = meta.participants.filter(p => {
        if (p.admin) return false;                            // skip admins
        if (p.id === botJid) return false;                    // skip bot
        if (p.id.split(':')[0] + '@s.whatsapp.net' === botJid) return false;
        if (p.id === ownerJid) return false;                  // skip sender (owner)
        if (ownerNum && p.id === ownerNum) return false;      // skip owner number
        return true;
    }).map(p => p.id);

    if (targets.length === 0) return reply('✅ *No members to kick!*\nOnly admins are in this group.');

    // Confirmation prompt (unless bypassed)
    if (!skipConfirm) {
        await conn.sendMessage(from, {
            text:
`╭─〔 ⚠️ *KICKALL CONFIRMATION* 〕
│
│  👥 *Members to kick:* ${targets.length}
│  🛡️ *Admins (safe):*   ${meta.participants.filter(p => p.admin).length}
│
│  This will remove ALL non-admin members!
│  Are you sure?
│
│  ✅ Type: *.kickall confirm*
│  🚪 Type: *.kickall me* _(kick all + I leave)_
│  ❌ Type: *.cancelkick* to abort
╰────────────────⊷
> Sʜᴀᴠɪʏᴀ Xᴍᴅ 𝗩𝟮 🌖`,
        }, { quoted: FakeVCard });
        return;
    }

    // Send initial progress msg
    const progressMsg = await conn.sendMessage(from, {
        text:
`╭─〔 🔴 *KICKALL STARTED* 〕
│
│  [░░░░░░░░░░] 0%
│  ✅ Kicked: 0
│  ❌ Failed: 0
│  📊 Total:  ${targets.length}
│
│  _ᴘʀᴏᴄᴇꜱꜱɪɴɢ... ᴅᴏ ɴᴏᴛ ᴄʟᴏꜱᴇ_
╰────────────────⊷`,
    }, { quoted: FakeVCard });

    // Run kick engine
    await runKickAll(conn, from, targets, progressMsg, 'KICKALL', leaveAfter);
});

// ══════════════════════════════════════════════════════════════
//  .softkick — Kick members who joined before X days ago
//  Usage: .softkick 7     → kick members older than 7 days
//         .softkick 30    → kick members older than 30 days
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'softkick',
    alias:    ['oldkick', 'inactivekick'],
    desc:     'Kick members who joined before X days ago',
    category: 'group',
    react:    '🧹',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, sender, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner) return reply('❌ *Owner only command!*');
    if (activeKick.has(from)) return reply('⚠️ *A kick operation is already running!*');

    const days = parseInt(q || '0', 10);
    if (!days || days < 1) return reply('📝 *Usage:* `.softkick <days>`\nExample: `.softkick 7` — kicks members who joined 7+ days ago');

    const adminOk = await isBotAdmin(conn, from);
    if (!adminOk) return reply('❌ *I am not an admin!*');

    const meta = await getGroupMeta(conn, from);
    if (!meta) return reply('❌ Failed to fetch group info.');

    const cutoff    = Date.now() - (days * 24 * 60 * 60 * 1000);
    const botJid    = conn.user?.id?.replace(/:.*@/, '@') || '';
    const ownerJid  = sender;
    const ownerNum  = config.OWNER_NUMBER ? config.OWNER_NUMBER + '@s.whatsapp.net' : null;

    const targets = meta.participants.filter(p => {
        if (p.admin) return false;
        if (p.id === botJid) return false;
        if (p.id.split(':')[0] + '@s.whatsapp.net' === botJid) return false;
        if (p.id === ownerJid) return false;
        if (ownerNum && p.id === ownerNum) return false;
        // Check join time — Baileys may expose this via p.t (Unix seconds)
        const joined = (p.t || 0) * 1000;
        if (joined === 0) return false; // skip if no join time
        return joined < cutoff;
    }).map(p => p.id);

    if (targets.length === 0) {
        return reply(`✅ *No members* joined more than *${days} days* ago (or join time unavailable).`);
    }

    const progressMsg = await conn.sendMessage(from, {
        text:
`╭─〔 🧹 *SOFTKICK STARTED* 〕
│
│  📅 Kicking members older than *${days} days*
│  [░░░░░░░░░░] 0%
│  ✅ Kicked: 0  │  📊 Total: ${targets.length}
│
│  _ᴘʀᴏᴄᴇꜱꜱɪɴɢ..._
╰────────────────⊷`,
    }, { quoted: FakeVCard });

    await runKickAll(conn, from, targets, progressMsg, `SOFTKICK (${days}d)`);
});

// ══════════════════════════════════════════════════════════════
//  .kickbots — Kick all bot accounts from group
//  Detects bots: JID ending in :xx@, known bot numbers, etc.
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'kickbots',
    alias:    ['removebots', 'antibot'],
    desc:     'Kick all bot accounts from the group',
    category: 'group',
    react:    '🤖',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner) return reply('❌ *Owner only command!*');
    if (activeKick.has(from)) return reply('⚠️ *A kick operation is already running!*');

    const adminOk = await isBotAdmin(conn, from);
    if (!adminOk) return reply('❌ *I am not an admin!*');

    const meta = await getGroupMeta(conn, from);
    if (!meta) return reply('❌ Failed to fetch group info.');

    const botJid   = conn.user?.id?.replace(/:.*@/, '@') || '';
    const ownerNum = config.OWNER_NUMBER ? config.OWNER_NUMBER + '@s.whatsapp.net' : null;

    // Bot detection: has device suffix (:xx@) OR is known bot pattern
    const targets = meta.participants.filter(p => {
        if (p.admin) return false;
        if (p.id === botJid) return false;
        if (p.id.split(':')[0] + '@s.whatsapp.net' === botJid) return false;
        if (ownerNum && (p.id === ownerNum || p.id.startsWith(ownerNum.split('@')[0]))) return false;
        // Detect bot: JID has device ID suffix like 94712345678:5@s.whatsapp.net
        const hasDeviceSuffix = /:\d+@/.test(p.id);
        return hasDeviceSuffix;
    }).map(p => p.id);

    if (targets.length === 0) {
        return reply('✅ *No bot accounts detected* in this group!\nAll members look like regular numbers.');
    }

    const preview = targets.slice(0, 5).map(j => `• @${j.split('@')[0].split(':')[0]}`).join('\n');

    const progressMsg = await conn.sendMessage(from, {
        text:
`╭─〔 🤖 *KICKBOTS STARTED* 〕
│
│  🔍 Bots detected: *${targets.length}*
│  ${preview}${targets.length > 5 ? `\n│  ...and ${targets.length - 5} more` : ''}
│
│  [░░░░░░░░░░] 0%
│  _ᴋɪᴄᴋɪɴɢ ʙᴏᴛꜱ..._
╰────────────────⊷`,
    }, { quoted: FakeVCard });

    await runKickAll(conn, from, targets, progressMsg, 'KICKBOTS');
});

// ══════════════════════════════════════════════════════════════
//  .kickstatus — Show live progress of ongoing kickall
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'kickstatus',
    alias:    ['kstatus', 'kickprogress'],
    desc:     'Show live progress of ongoing kickall operation',
    category: 'group',
    react:    '📊',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner) return reply('❌ *Owner only command!*');

    if (!activeKick.has(from)) {
        return reply('✅ *No active kick operation* running in this group.');
    }

    const { total, done, failed, label } = activeKick.get(from);
    const bar = buildBar(done + failed, total);

    reply(
`╭─〔 📊 *${label} STATUS* 〕
│
│  ${bar}
│
│  ✅ *Kicked:*  ${done}
│  ❌ *Failed:*  ${failed}
│  🔄 *Remaining:* ${total - done - failed}
│  📊 *Total:*   ${total}
│
╰────────────────⊷
> Use *.cancelkick* to stop`
    );
});

// ══════════════════════════════════════════════════════════════
//  .cancelkick — Cancel any ongoing kickall operation
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'cancelkick',
    alias:    ['stopkick', 'abortick'],
    desc:     'Cancel any ongoing kickall operation',
    category: 'group',
    react:    '⏹️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner) return reply('❌ *Owner only command!*');

    if (!activeKick.has(from)) {
        return reply('✅ *No active kick operation* to cancel.');
    }

    const state = activeKick.get(from);
    state.cancelObj.cancel = true;

    reply(
`⏹️ *Kick operation cancelled!*
│
│  ✅ Kicked so far: *${state.done}*
│  ❌ Failed:        *${state.failed}*
│  🔄 Remaining:    *${state.total - state.done - state.failed}* (skipped)
│
╰────────────────⊷`
    );
});
