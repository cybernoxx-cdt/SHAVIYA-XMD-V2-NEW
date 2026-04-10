// ============================================
//   plugins/group-features.js - SHAVIYA-XMD V2
//   ✅ Welcome / Goodbye messages
//   ✅ Group info commands
//   ✅ Add / Kick / Promote / Demote
//   ✅ Group link
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting } = require('../lib/settings');

// ── WELCOME toggle ────────────────────────────
cmd({
    pattern: 'welcome',
    alias: ['setwelcome'],
    desc: 'Toggle welcome/goodbye messages',
    category: 'group',
    react: '👋',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    const { setSetting } = require('../lib/settings');
    const sub = (q || '').toLowerCase().trim();
    if (sub === 'on') {
        setSetting('welcomeMsg', true);
        return reply('✅ *Welcome messages enabled!*');
    } else if (sub === 'off') {
        setSetting('welcomeMsg', false);
        return reply('❌ *Welcome messages disabled!*');
    }
    const cur = getSetting('welcomeMsg') ?? false;
    reply(`👋 *Welcome Messages:* ${cur ? '✅ ON' : '❌ OFF'}\n\nUsage: .welcome on/off`);
});

// ── KICK ──────────────────────────────────────
cmd({
    pattern: 'kick',
    alias: ['remove'],
    desc: 'Kick a member from group',
    category: 'group',
    react: '👢',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply, quoted, sender }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');

    let target = quoted ? quoted.sender :
                 q ? `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net` : null;
    if (!target) return reply('📝 Reply to a user or provide number:\n.kick 94712345678');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'remove');
        reply(`✅ @${target.split('@')[0]} has been removed!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}\n\nMake sure I am admin.`);
    }
});

// ── ADD ───────────────────────────────────────
cmd({
    pattern: 'add',
    desc: 'Add a member to the group',
    category: 'group',
    react: '➕',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');
    if (!q) return reply('📝 Usage: .add 94712345678');

    const number = q.replace(/[^0-9]/g, '');
    const jid = `${number}@s.whatsapp.net`;
    try {
        await conn.groupParticipantsUpdate(from, [jid], 'add');
        reply(`✅ @${number} added to group!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── PROMOTE ───────────────────────────────────
cmd({
    pattern: 'promote',
    desc: 'Promote member to admin',
    category: 'group',
    react: '⬆️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply, quoted }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');

    let target = quoted ? quoted.sender :
                 q ? `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net` : null;
    if (!target) return reply('📝 Reply to a user or: .promote 94712345678');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'promote');
        reply(`✅ @${target.split('@')[0]} promoted to admin!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── DEMOTE ────────────────────────────────────
cmd({
    pattern: 'demote',
    desc: 'Demote admin to member',
    category: 'group',
    react: '⬇️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply, quoted }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!from.endsWith('@g.us')) return reply('❌ Group only command!');

    let target = quoted ? quoted.sender :
                 q ? `${q.replace(/[^0-9]/g, '')}@s.whatsapp.net` : null;
    if (!target) return reply('📝 Reply to a user or: .demote 94712345678');

    try {
        await conn.groupParticipantsUpdate(from, [target], 'demote');
        reply(`✅ @${target.split('@')[0]} demoted from admin!`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── GROUP INFO ────────────────────────────────
cmd({
    pattern: 'groupinfo',
    alias: ['ginfo', 'groupdata'],
    desc: 'Get group info',
    category: 'group',
    react: 'ℹ️',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    if (!from.endsWith('@g.us')) return reply('❌ Group only!');
    try {
        const meta = await conn.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ');
        reply(
`ℹ️ *GROUP INFO*
━━━━━━━━━━━━━━━━━━━━
📌 *Name:* ${meta.subject}
👥 *Members:* ${meta.participants.length}
👑 *Admins:* ${admins || 'None'}
🔗 *ID:* ${from.split('@')[0]}
📝 *Description:* ${meta.desc || 'No description'}
━━━━━━━━━━━━━━━━━━━━
> SHAVIYA-XMD V2`
        );
    } catch (e) {
        reply(`❌ Failed: ${e.message}`);
    }
});

// ── GROUP LINK ────────────────────────────────
cmd({
    pattern: 'grouplink',
    alias: ['invitelink', 'glink'],
    desc: 'Get group invite link',
    category: 'group',
    react: '🔗',
    filename: __filename
},
async (conn, mek, m, { isOwner, from, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!from.endsWith('@g.us')) return reply('❌ Group only!');
    try {
        const link = await conn.groupInviteCode(from);
        reply(`🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${link}`);
    } catch (e) {
        reply(`❌ Failed: ${e.message}\n\nMake sure I am admin.`);
    }
});
