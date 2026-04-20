// ============================================
//   plugins/ownermenu.js - SHAVIYA-XMD V2
//   ✅ .omenu — Full owner settings menu
//   ✅ Reply with number to toggle ON/OFF
//   ✅ Uses unified settings.js
//   ✅ Real-time save — survives restart
// ============================================

'use strict';

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── All toggleable settings ─────────────────
const TOGGLES = [
    { n: 1,  key: 'alwaysOnline',    label: 'Always Online',          emoji: '🟢' },
    { n: 2,  key: 'autoReadStatus',  label: 'Auto Read Status',        emoji: '👁️' },
    { n: 3,  key: 'autoReactStatus', label: 'Auto React Status',       emoji: '❤️' },
    { n: 6,  key: 'autoVoice',       label: 'Auto Voice Reply',        emoji: '🔊' },
    { n: 7,  key: 'autoAI',          label: 'Auto AI Reply',           emoji: '🤖' },
    { n: 8,  key: 'antiLink',        label: 'Anti Link (Groups)',      emoji: '🔗' },
    { n: 9,  key: 'antiBadWords',    label: 'Anti Bad Words',          emoji: '🤬' },
    { n: 10, key: 'antidelete',      label: 'Anti Delete',             emoji: '🗑️' },
    { n: 11, key: 'antiBot',         label: 'Anti Bot',                emoji: '🤖' },
    { n: 12, key: 'autoReadCmd',     label: 'Auto Read Messages',      emoji: '📨' },
];

function isOn(key) {
    const v = getSetting(key);
    return v === true || v === 'true';
}

function buildMenu() {
    const mode = getSetting('mode') || 'public';
    let msg = `╔══════════════════════════╗\n`;
    msg += `║  ⚙️ *SHAVIYA-XMD V2 SETTINGS* ⚙️  ║\n`;
    msg += `╚══════════════════════════╝\n\n`;
    msg += `🔐 *Bot Mode:* \`${mode.toUpperCase()}\`\n`;
    msg += `_(Use .setmode public/private/inbox/group)_\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*REPLY WITH NUMBER TO TOGGLE ON/OFF*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    TOGGLES.forEach(t => {
        const on = isOn(t.key);
        msg += `*${t.n}.* ${t.emoji} ${t.label}\n`;
        msg += `    Status: ${on ? '✅ *ON*' : '❌ *OFF*'}\n\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 *Examples:*\n`;
    msg += `• *.toggle 1* → Toggle Always Online\n`;
    msg += `• *.toggle 2 on* → Force ON\n`;
    msg += `• *.toggle all off* → Turn everything OFF\n\n`;
    msg += `> © SHAVIYA-XMD V2 Settings 💎`;
    return msg;
}

// ── .omenu — Show the menu ────────────────────
cmd({
    pattern: 'omenu',
    alias: ['ownermenu', 'ownerconfig', 'botconfig'],
    desc: 'Owner settings menu — toggle all features',
    category: 'owner',
    react: '⚙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    reply(buildMenu());
});

// ── .toggle <num|all> [on|off] ────────────────
cmd({
    pattern: 'toggle',
    alias: ['set', 'tgl'],
    desc: 'Toggle bot feature on/off by number',
    category: 'owner',
    react: '🔄',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply(`Usage:\n*.toggle 1* — toggle by number\n*.toggle 1 on/off* — force state\n*.toggle all on/off* — toggle all\n\nSee *.omenu* for full list.`);

    const parts = q.trim().toLowerCase().split(/\s+/);

    // toggle all on/off
    if (parts[0] === 'all') {
        const force = parts[1];
        if (force !== 'on' && force !== 'off') return reply('Usage: .toggle all on  OR  .toggle all off');
        const val = force === 'on';
        TOGGLES.forEach(t => setSetting(t.key, val));
        return reply(`${val ? '✅' : '❌'} *All ${TOGGLES.length} features turned ${force.toUpperCase()}!*\n\nUse *.omenu* to see current status.`);
    }

    const num = parseInt(parts[0]);
    const toggle = TOGGLES.find(t => t.n === num);
    if (!toggle) return reply(`❌ Invalid number *${parts[0]}*.\nValid: 1–${TOGGLES.length}\n\nSee *.omenu* for the list.`);

    let newVal;
    if (parts[1] === 'on')       newVal = true;
    else if (parts[1] === 'off') newVal = false;
    else                         newVal = !isOn(toggle.key); // flip

    setSetting(toggle.key, newVal);

    reply(
`${newVal ? '✅' : '❌'} *${toggle.emoji} ${toggle.label}*

Status: *${newVal ? 'ON ✅' : 'OFF ❌'}*
Setting: \`${toggle.key}\`

_Changes saved — survives restart! 💾_
> SHAVIYA-XMD V2 ⚙️`
    );
});
