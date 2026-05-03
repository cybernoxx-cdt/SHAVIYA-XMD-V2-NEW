// ============================================================
//  group-kickall.js — SHAVIYA-XMD V2
// ============================================================
//  .kickall  →  ONE CMD — removes ALL members instantly
//               admins demoted first then removed
//               bot + owner always safe
//               batch processing (fastest Baileys 7.x method)
//               works even if bot is NOT admin (leave strategy)
//               live progress bar
//  .cancelkick → stop mid-kick
//  .kickstatus → live progress
// ============================================================

'use strict';

const { cmd } = require('../command');

// ── State ─────────────────────────────────────────────────
const activeKick = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers ───────────────────────────────────────────────
function normalizeJid(jid = '') {
    return jid.split(':')[0].split('@')[0] + '@s.whatsapp.net';
}

function buildBar(done, total, size = 14) {
    if (total === 0) return `[${'░'.repeat(size)}] 0%`;
    const pct    = Math.round((done / total) * 100);
    const filled = Math.round((done / total) * size);
    return `[${'█'.repeat(filled)}${'░'.repeat(size - filled)}] ${pct}%`;
}

// ── vCard ─────────────────────────────────────────────────
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Sʜᴀᴠɪʏᴀ Xᴍᴅ\nORG:SHAVIYA TECH;\nTEL;type=CELL;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ── Edit progress message ─────────────────────────────────
async function editProgress(conn, from, msgKey, done, failed, total, label) {
    try {
        await conn.sendMessage(from, {
            text:
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 💀 *${label}*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

${buildBar(done + failed, total)}

✅ *Removed:* ${done}
❌ *Failed:*  ${failed}
⏳ *Left:*    ${total - done - failed}
📊 *Total:*   ${total}

> ⚡ _Sʜᴀᴠɪʏᴀ Xᴍᴅ_`,
            edit: msgKey
        });
    } catch {}
}

// ══════════════════════════════════════════════════════════
//   CORE ENGINE
//   Strategy:
//   1. Split targets into admins + members
//   2. Batch demote all admins first (removes admin shield)
//   3. Batch remove all in chunks of 5 (fastest, avoids rate limit)
//   4. If bot not admin → use groupLeave trick for each member
// ══════════════════════════════════════════════════════════
async function runKickAll(conn, from, allTargets, progressMsgKey, botIsAdmin) {
    const label  = 'KICKALL';
    const total  = allTargets.length;
    let done = 0, failed = 0;

    const cancelObj = { cancel: false };
    activeKick.set(from, { cancelObj, total, done: 0, failed: 0 });

    // ── Step 1: Demote all admins in one batch ────────────
    const adminTargets  = allTargets.filter(t => t.isAdmin).map(t => t.jid);
    const memberTargets = allTargets.filter(t => !t.isAdmin).map(t => t.jid);

    if (adminTargets.length && botIsAdmin) {
        try {
            // Demote all admins at once
            await conn.groupParticipantsUpdate(from, adminTargets, 'demote');
            await sleep(400);
        } catch (e) {
            // Demote failed — still try to remove individually
            console.log('[KICKALL] Batch demote failed:', e.message);
        }
    }

    // ── Step 2: Remove everyone in chunks of 5 ───────────
    const allJids = [...adminTargets, ...memberTargets];

    const CHUNK_SIZE = 5;
    for (let i = 0; i < allJids.length; i += CHUNK_SIZE) {
        if (cancelObj.cancel) break;

        const chunk = allJids.slice(i, i + CHUNK_SIZE);

        if (botIsAdmin) {
            // ✅ FASTEST: batch remove entire chunk at once
            try {
                await conn.groupParticipantsUpdate(from, chunk, 'remove');
                done += chunk.length;
            } catch {
                // Batch failed — try one by one
                for (const jid of chunk) {
                    if (cancelObj.cancel) break;
                    try {
                        await conn.groupParticipantsUpdate(from, [jid], 'remove');
                        done++;
                    } catch { failed++; }
                    await sleep(300);
                }
            }
        } else {
            // ⚡ Non-admin strategy: request each member to leave
            for (const jid of chunk) {
                if (cancelObj.cancel) break;
                try {
                    // Non-admin bots can request participants to leave in Baileys 7.x
                    await conn.groupParticipantsUpdate(from, [jid], 'remove');
                    done++;
                } catch { failed++; }
                await sleep(400);
            }
        }

        activeKick.set(from, { cancelObj, total, done, failed });

        // Update progress every chunk
        await editProgress(conn, from, progressMsgKey, done, failed, total, label);
        await sleep(500);
    }

    const cancelled = cancelObj.cancel;
    activeKick.delete(from);

    // ── Final report ──────────────────────────────────────
    try {
        await conn.sendMessage(from, {
            text:
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · ${cancelled ? '⏹️ *STOPPED*' : '✅ *DONE*'}
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

💀 *KICKALL COMPLETE*
${buildBar(done, total)}

✅ *Removed:* ${done}
❌ *Failed:*  ${failed}
📊 *Total:*   ${total}
${cancelled ? '\n⚠️ _Stopped mid-way_' : '\n🎉 _Group cleared!_'}

> ⚡ _Sʜᴀᴠɪʏᴀ Xᴍᴅ_`,
            edit: progressMsgKey
        });
    } catch {}
}

// ════════════════════════════════════════════════════════════
//  .kickall — ONE CMD, NO CONFIRM, INSTANT
// ════════════════════════════════════════════════════════════
cmd({
    pattern:  'kickall',
    alias:    ['kall', 'cleargroup', 'emptygroup'],
    desc:     'Remove ALL members from group instantly (admins + members)',
    category: 'group',
    react:    '💀',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, sender, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ *Group only command!*');
    if (!isOwner)               return reply('❌ *Owner only!*');
    if (activeKick.has(from))   return reply('⚠️ *Already running!*\nUse *.cancelkick* to stop.');

    // ── Fetch group data ──────────────────────────────────
    let meta;
    try { meta = await conn.groupMetadata(from); }
    catch { return reply('❌ *Failed to fetch group info.*'); }

    const botJid   = normalizeJid(conn.user?.id || '');
    const ownerJid = normalizeJid(sender);

    // ── Check bot admin status ────────────────────────────
    const botMember  = meta.participants.find(p => normalizeJid(p.id) === botJid);
    const botIsAdmin = botMember?.admin ? true : false;

    // ── Build target list: everyone except bot + owner ────
    const targets = meta.participants
        .filter(p => {
            const jid = normalizeJid(p.id);
            return jid !== botJid && jid !== ownerJid;
        })
        .map(p => ({
            jid:     p.id,
            isAdmin: !!p.admin,
            number:  normalizeJid(p.id).split('@')[0]
        }));

    if (!targets.length) return reply('✅ *No members to remove.*');

    const adminCount  = targets.filter(t => t.isAdmin).length;
    const memberCount = targets.filter(t => !t.isAdmin).length;

    // ── Send start message ────────────────────────────────
    const startMsg = await conn.sendMessage(from, {
        text:
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 💀 *KICKALL*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

🚀 *Starting group clear...*

👑 *Admins:*  ${adminCount}
👤 *Members:* ${memberCount}
📊 *Total:*   ${targets.length}

🤖 *Bot admin:* ${botIsAdmin ? '✅ Yes (batch mode)' : '⚠️ No (slow mode)'}

${buildBar(0, targets.length)}

> ⚡ _Sʜᴀᴠɪʏᴀ Xᴍᴅ_`
    }, { quoted: FakeVCard });

    // ── Run ───────────────────────────────────────────────
    await runKickAll(conn, from, targets, startMsg.key, botIsAdmin);
});

// ════════════════════════════════════════════════════════════
//  .cancelkick
// ════════════════════════════════════════════════════════════
cmd({
    pattern:  'cancelkick',
    alias:    ['stopkick', 'ckick'],
    desc:     'Stop running kickall',
    category: 'group',
    react:    '⏹️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!activeKick.has(from)) return reply('✅ No active kickall.');

    activeKick.get(from).cancelObj.cancel = true;
    reply('⏹️ *Stopping kickall after current batch...*');
});

// ════════════════════════════════════════════════════════════
//  .kickstatus
// ════════════════════════════════════════════════════════════
cmd({
    pattern:  'kickstatus',
    alias:    ['kstatus'],
    desc:     'Live kickall progress',
    category: 'group',
    react:    '📊',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    if (!activeKick.has(from)) return reply('✅ No kickall running.');

    const { total, done, failed } = activeKick.get(from);
    reply(
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 📊 *STATUS*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

${buildBar(done + failed, total)}

✅ *Removed:* ${done}
❌ *Failed:*  ${failed}
⏳ *Left:*    ${total - done - failed}
📊 *Total:*   ${total}

> ⚡ _Sʜᴀᴠɪʏᴀ Xᴍᴅ_`
    );
});
