// ============================================
//   plugins/group-plugins.js - SHAVIYA-XMD V2
//   ✅ .kick / .add / .promote / .demote
//   ✅ .mute / .unmute (group lock)
//   ✅ .tagall (tag all members)
//   ✅ .groupinfo
//   ✅ Welcome/Goodbye message toggle
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── .kick ─────────────────────────────────────
cmd({
    pattern: 'kick',
    alias: ['remove'],
    desc: 'Remove a member from the group',
    category: 'group',
    react: '👢',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, reply, sender }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');

    let target = quoted?.sender || (m?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]);
    if (!target) return reply('📝 Reply to a message or mention a user.\nUsage: .kick @user');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'remove');
        reply(`✅ @${target.split('@')[0]} removed from the group!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}\nMake sure I am admin!`);
    }
});

// ── .add ──────────────────────────────────────
cmd({
    pattern: 'add',
    desc: 'Add a member to the group',
    category: 'group',
    react: '➕',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply('📝 Usage: .add 94712345678');

    const number = q.replace(/[^0-9]/g, '');
    const jid = number + '@s.whatsapp.net';
    try {
        await conn.groupParticipantsUpdate(from, [jid], 'add');
        reply(`✅ +${number} added to the group!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .promote ──────────────────────────────────
cmd({
    pattern: 'promote',
    desc: 'Promote a member to admin',
    category: 'group',
    react: '⬆️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');

    const target = quoted?.sender || m?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply('📝 Reply to a message or mention a user.');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'promote');
        reply(`✅ @${target.split('@')[0]} promoted to admin!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .demote ───────────────────────────────────
cmd({
    pattern: 'demote',
    desc: 'Demote an admin to member',
    category: 'group',
    react: '⬇️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');

    const target = quoted?.sender || m?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply('📝 Reply to a message or mention a user.');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'demote');
        reply(`✅ @${target.split('@')[0]} demoted to member!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .mute / .unmute ───────────────────────────
cmd({
    pattern: 'mute',
    alias: ['lockgroup', 'lock'],
    desc: 'Lock group (only admins can send messages)',
    category: 'group',
    react: '🔇',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');
    try {
        await conn.groupSettingUpdate(from, 'announcement');
        reply('🔇 *Group Locked!*\nOnly admins can send messages now.');
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

cmd({
    pattern: 'unmute',
    alias: ['unlockgroup', 'unlock'],
    desc: 'Unlock group (everyone can send messages)',
    category: 'group',
    react: '🔊',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');
    try {
        await conn.groupSettingUpdate(from, 'not_announcement');
        reply('🔊 *Group Unlocked!*\nEveryone can send messages now.');
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .tagall ───────────────────────────────────
cmd({
    pattern: 'tagall',
    alias: ['everyone', 'all'],
    desc: 'Tag all group members',
    category: 'group',
    react: '📣',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!isOwner) return reply('❌ Owner only!');

    try {
        const meta = await conn.groupMetadata(from);
        const members = meta.participants.map(p => p.id);
        const msg = q || '📣 Attention everyone!';
        const text = members.map(jid => `@${jid.split('@')[0]}`).join(' ');

        await conn.sendMessage(from, {
            text: `${msg}\n\n${text}`,
            mentions: members
        }, { quoted: mek });
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .groupinfo ────────────────────────────────
cmd({
    pattern: 'groupinfo',
    alias: ['ginfo', 'groupstats'],
    desc: 'Show group information',
    category: 'group',
    react: 'ℹ️',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');

    try {
        const meta = await conn.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).length;
        const members = meta.participants.length;
        const created = new Date(meta.creation * 1000).toLocaleDateString('en-CA');

        reply(
`╭─〔 *GROUP INFO* 〕─◉
│
│ 📛 *Name:* ${meta.subject}
│ 👥 *Members:* ${members}
│ 👑 *Admins:* ${admins}
│ 📅 *Created:* ${created}
│ 📋 *Desc:* ${meta.desc?.slice(0, 100) || 'No description'}
│
╰────────────────⊷
> SHAVIYA-XMD V2 💎`
        );
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── .welcome on/off ───────────────────────────
cmd({
    pattern: 'welcome',
    alias: ['setwelcome'],
    desc: 'Toggle welcome/goodbye messages in groups',
    category: 'group',
    react: '👋',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const sub = (q || '').toLowerCase().trim();
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('welcome') ?? false;
        return reply(`👋 *Welcome Messages:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: .welcome on/off`);
    }
    setSetting('welcome', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Welcome Messages ${sub === 'on' ? 'Enabled' : 'Disabled'}!*`);
});
