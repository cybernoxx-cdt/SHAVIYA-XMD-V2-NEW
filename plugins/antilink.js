// ============================================
//   plugins/antilink.js - SHAVIYA-XMD V2
//   ✅ Full antilink enforcement in groups
//   ✅ Warns user, then removes if repeated
//   ✅ Saves warn count to settings.json
//   Commands: .antilink on/off
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// URL/Link detection regex
const LINK_REGEX = /(?:https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/)[^\s]*/gi;

// Track warnings in memory (also persist to settings)
function getWarnData() {
    return getSetting('antilinkWarns') || {};
}
function saveWarnData(data) {
    setSetting('antilinkWarns', data);
}

// ── Toggle command ────────────────────────────
cmd({
    pattern: 'antilink',
    alias: ['antilnk', 'nolink'],
    desc: 'Anti-link protection for groups on/off',
    category: 'group',
    react: '🔗',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, from, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const sub = (q || '').toLowerCase().trim();

    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const cur = getSetting('antiLink') ?? false;
        return reply(
`🔗 *Anti-Link Status*

📌 *Current:* ${cur ? '✅ ON' : '❌ OFF'}

Usage:
• *.antilink on*  → Block all links in groups
• *.antilink off* → Allow links`
        );
    }

    setSetting('antiLink', sub === 'on');
    reply(`${sub === 'on' ? '✅' : '❌'} *Anti-Link ${sub === 'on' ? 'Enabled' : 'Disabled'}!*\n\n${sub === 'on' ? '🔗 All links will be deleted in groups.' : '🔓 Links are now allowed.'}`);
});

// ── Auto listener: runs on every message ─────
cmd({ on: 'body' },
async (conn, mek, m, { from, sender, senderNumber, isOwner, body }) => {
    try {
        // Only in groups
        if (!from.endsWith('@g.us')) return;

        const enabled = getSetting('antiLink') ?? false;
        if (!enabled) return;
        if (isOwner) return; // Owner exempt

        // Check if message contains a link
        if (!LINK_REGEX.test(body)) return;
        LINK_REGEX.lastIndex = 0; // reset regex state

        // Get group metadata and check if sender is admin
        let groupMeta, isAdmin = false;
        try {
            groupMeta = await conn.groupMetadata(from);
            const admins = groupMeta.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
            isAdmin = admins.includes(sender);
        } catch {}

        if (isAdmin) return; // Group admins exempt

        // Delete the message
        try {
            await conn.sendMessage(from, { delete: mek.key });
        } catch {}

        // Warn system
        const warns = getWarnData();
        const key = senderNumber;
        warns[key] = (warns[key] || 0) + 1;
        saveWarnData(warns);

        const warnCount = warns[key];

        if (warnCount >= 3) {
            // Remove after 3 warnings
            try {
                await conn.groupParticipantsUpdate(from, [sender], 'remove');
                await conn.sendMessage(from, {
                    text: `⛔ @${senderNumber} has been *removed* for repeatedly sharing links! (${warnCount} warnings)\n\n> SHAVIYA-XMD V2 Anti-Link 🔗`,
                    mentions: [sender]
                }, { quoted: mek });
                // Reset warns after removal
                warns[key] = 0;
                saveWarnData(warns);
            } catch (e) {
                await conn.sendMessage(from, {
                    text: `⚠️ @${senderNumber} — I tried to remove you but I'm not admin. This is *Warning ${warnCount}/3*. Stop sharing links!\n> SHAVIYA-XMD V2 🔗`,
                    mentions: [sender]
                }, { quoted: mek });
            }
        } else {
            await conn.sendMessage(from, {
                text: `⚠️ @${senderNumber} — Links are *not allowed* in this group!\n\n⚠️ *Warning ${warnCount}/3* — At 3 warnings you will be removed.\n\n> SHAVIYA-XMD V2 Anti-Link 🔗`,
                mentions: [sender]
            }, { quoted: mek });
        }

    } catch (e) {
        // Silent fail
    }
});
