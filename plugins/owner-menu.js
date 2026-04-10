// ============================================
//   plugins/owner-menu.js - SHAVIYA-XMD V2
//   ✅ .ownermenu — Full interactive owner panel
//   ✅ Reply a NUMBER to toggle that plugin
//   ✅ Real ON/OFF saved to settings.json
//   ✅ Works via number reply in private chat
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting, getAllSettings } = require('../lib/settings');

// ── Plugin definitions ────────────────────────────────────────────
const PLUGINS = [
    { key: 'alwaysOnline',    name: '🟢 Always Online',         desc: 'Always appear online'             },
    { key: 'autoReadStatus',  name: '👁️ Auto Read Status',       desc: 'Auto view all statuses'           },
    { key: 'autoReactStatus', name: '❤️ Auto React Status',      desc: 'Auto react to statuses'           },
    { key: 'autoRecording',   name: '🎙️ Auto Recording',         desc: 'Always show recording indicator'  },
    { key: 'autoTyping',      name: '✍️ Auto Typing',            desc: 'Always show typing indicator'     },
    { key: 'autoVoice',       name: '🔊 Auto Voice Reply',       desc: 'Auto reply with voice notes'      },
    { key: 'autoAI',          name: '🤖 Auto AI Reply',          desc: 'Auto reply using AI'              },
    { key: 'antiLink',        name: '🔗 Anti Link',              desc: 'Block links in groups'            },
    { key: 'antiBadWords',    name: '🤬 Anti Bad Words',         desc: 'Delete bad words in groups'       },
    { key: 'antidelete',      name: '🗑️ Anti Delete',            desc: 'Recover deleted messages'         },
    { key: 'antiBot',         name: '🤖 Anti Bot',               desc: 'Block other bots in groups'       },
];

// Track pending menu sessions: { jid: { timestamp, page } }
const pendingSessions = new Map();

function buildMenuText() {
    let msg = `╔══════════════════════════╗\n`;
    msg += `║ ⚙️  *SHAVIYA-XMD V2 PANEL*  ║\n`;
    msg += `╚══════════════════════════╝\n\n`;
    msg += `*Reply a number to toggle ON/OFF*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    PLUGINS.forEach((p, i) => {
        const val = getSetting(p.key);
        const isOn = val === true || val === 'true';
        msg += `*${String(i + 1).padStart(2, '0')}* ${isOn ? '✅' : '❌'}  ${p.name}\n`;
        msg += `     _${p.desc}_\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Mode:* ${(getSetting('mode') || 'public').toUpperCase()}\n`;
    msg += `*Prefix:* ${getSetting('prefix') || '.'}\n\n`;
    msg += `💡 *Quick toggle:*\n`;
    msg += `• Reply *1* to *${PLUGINS.length}* → toggle that plugin\n`;
    msg += `• *.plugin all on* → enable all\n`;
    msg += `• *.plugin all off* → disable all\n`;
    msg += `• *.setmode public/private/inbox/group* → change mode\n`;

    return msg;
}

// ── .ownermenu ────────────────────────────────
cmd({
    pattern: 'ownermenu',
    alias: ['omenu', 'botpanel', 'panel'],
    desc: 'Owner control panel — toggle all plugins by number',
    category: 'owner',
    react: '⚙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, from, reply, senderNumber }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    // Open a 5-minute session for this chat
    pendingSessions.set(from, { ts: Date.now(), owner: senderNumber });

    const menuText = buildMenuText();
    await conn.sendMessage(from, { text: menuText }, { quoted: mek });
});

// ── Number-reply listener ──────────────────────
// Listens for a plain number (1-N) to toggle plugins
cmd({ on: 'body' },
async (conn, mek, m, { from, body, isOwner, senderNumber }) => {
    try {
        if (!isOwner) return;
        const session = pendingSessions.get(from);
        if (!session) return;

        // Session expires after 5 minutes
        if (Date.now() - session.ts > 5 * 60 * 1000) {
            pendingSessions.delete(from);
            return;
        }

        const trimmed = (body || '').trim();
        const num = parseInt(trimmed);
        if (isNaN(num) || trimmed !== String(num)) return; // must be a plain number
        if (num < 1 || num > PLUGINS.length) return;

        // Refresh session timer
        session.ts = Date.now();

        const plugin = PLUGINS[num - 1];
        const cur = getSetting(plugin.key);
        const isOn = cur === true || cur === 'true';
        const newVal = !isOn;

        setSetting(plugin.key, newVal);

        const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

        reply(
`${newVal ? '✅' : '❌'} *${plugin.name}*

Status changed to: *${newVal ? 'ON ✅' : 'OFF ❌'}*

_${plugin.desc}_

> Reply another number to toggle more plugins.`
        );

    } catch {}
});
