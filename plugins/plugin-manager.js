// ============================================
//   plugins/plugin-manager.js - SHAVIYA-XMD V2
//   ✅ .plugins — List all plugins with ON/OFF status
//   ✅ .plugin <number> — Toggle a plugin ON/OFF by number
//   ✅ Saved to settings.json (survives restart)
//   ✅ Owner-only
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// Full plugin registry with display names
const PLUGIN_LIST = [
    { key: 'alwaysOnline',    name: 'Always Online',        cmd: '.alwaysonline'    },
    { key: 'autoReadStatus',  name: 'Auto Read Status',      cmd: '.autoreadstatus'  },
    { key: 'autoReactStatus', name: 'Auto React Status',     cmd: '.autoreactstatus' },
    { key: 'autoVoice',       name: 'Auto Voice Reply',      cmd: '.autovoice'       },
    { key: 'autoAI',          name: 'Auto AI Reply',         cmd: '.autoai'          },
    { key: 'antiLink',        name: 'Anti Link (Groups)',    cmd: '.antilink'        },
    { key: 'antiBadWords',    name: 'Anti Bad Words',        cmd: '.antibadwords'    },
    { key: 'antidelete',      name: 'Anti Delete',           cmd: '.antidelete'      },
    { key: 'antiBot',         name: 'Anti Bot',              cmd: '.antibot'         },
];

// ── .plugins — Show list ──────────────────────
cmd({
    pattern: 'plugins',
    alias: ['pluginlist', 'plist'],
    desc: 'Show all bot plugins with ON/OFF status',
    category: 'owner',
    react: '🔌',
    filename: __filename
},
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');

    let msg = `🔌 *SHAVIYA-XMD V2 — PLUGIN MANAGER*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*Reply with a number to toggle ON/OFF*\n\n`;

    PLUGIN_LIST.forEach((p, i) => {
        const val = getSetting(p.key);
        const isOn = val === true || val === 'true';
        msg += `*${i + 1}.* ${isOn ? '✅' : '❌'} ${p.name}\n`;
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 *Usage:*\n`;
    msg += `• Reply *.plugin 1* → Toggle "Always Online"\n`;
    msg += `• Reply *.plugin 3* → Toggle "Auto React Status"\n`;
    msg += `• Reply *.plugin all on* → Turn ALL on\n`;
    msg += `• Reply *.plugin all off* → Turn ALL off\n`;

    reply(msg);
});

// ── .plugin <number|all> <on|off> ────────────
cmd({
    pattern: 'plugin',
    alias: ['toggleplugin', 'tp'],
    desc: 'Toggle a plugin ON or OFF by number',
    category: 'owner',
    react: '⚙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply('Usage:\n*.plugin 1* → Toggle plugin #1\n*.plugin all on* → Enable all\n*.plugin all off* → Disable all\n\nSee *.plugins* for the full list.');

    const parts = q.trim().toLowerCase().split(/\s+/);

    // .plugin all on/off
    if (parts[0] === 'all') {
        const val = parts[1] === 'on';
        if (parts[1] !== 'on' && parts[1] !== 'off') return reply('Usage: .plugin all on  OR  .plugin all off');
        PLUGIN_LIST.forEach(p => setSetting(p.key, val));
        reply(`${val ? '✅' : '❌'} *All ${PLUGIN_LIST.length} plugins turned ${val ? 'ON' : 'OFF'}!*`);
        return;
    }

    // .plugin <number>   OR   .plugin <number> on/off
    const num = parseInt(parts[0]);
    if (isNaN(num) || num < 1 || num > PLUGIN_LIST.length) {
        return reply(`❌ Invalid number. Use 1–${PLUGIN_LIST.length}.\n\nSee *.plugins* for the full list.`);
    }

    const plugin = PLUGIN_LIST[num - 1];
    let newVal;

    if (parts[1] === 'on') {
        newVal = true;
    } else if (parts[1] === 'off') {
        newVal = false;
    } else {
        // Toggle
        const cur = getSetting(plugin.key);
        newVal = !(cur === true || cur === 'true');
    }

    setSetting(plugin.key, newVal);

    reply(
`${newVal ? '✅' : '❌'} *Plugin ${num} — ${plugin.name}*

Status: *${newVal ? 'ON ✅' : 'OFF ❌'}*
Command: ${plugin.cmd}

> SHAVIYA-XMD V2 Plugin Manager 🔌`
    );
});
