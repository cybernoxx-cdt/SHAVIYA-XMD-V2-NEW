// ============================================================
//   plugins/settings.js — SHAVIYA-XMD V2
//   ⚙️ Full Bot Settings — All-in-one
//   ✅ .settings  → Interactive numbered menu (image)
//   ✅ Reply number to toggle (X = ON, X.5 = OFF)
//   ✅ .set <key> <on/off>  → Quick direct toggle
//   ✅ .botinfo  → Full env vars + config display
//   ✅ .resetbot confirm  → Reset all to defaults
//   ✅ MongoDB + File save — survives restart
//   © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

'use strict';

const { cmd }                                     = require('../command');
const { getSetting, setSetting,
        getAllSettings, resetAllSettings }         = require('../lib/settings');
const config                                      = require('../config');

// ─── FakeVCard ───────────────────────────────────────────────
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: { contactMessage: {
        displayName: '💎 SHAVIYA-XMD V2',
        vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
    }}
};

// ─── Toggleable settings list ────────────────────────────────
// id = number to type for ON  |  id.5 = OFF
const SETTINGS_LIST = [
    // ── AUTOMATION ──
    { id: 1,  label: 'Auto Voice Reply',   icon: '🔊', key: 'autoVoice',       group: 'auto' },
    { id: 2,  label: 'Auto AI Reply',      icon: '🤖', key: 'autoAI',          group: 'auto' },
    { id: 3,  label: 'Auto Read Status',   icon: '👁️', key: 'autoReadStatus',  group: 'auto' },
    { id: 4,  label: 'Auto React Status',  icon: '❤️', key: 'autoReactStatus', group: 'auto' },
    { id: 5,  label: 'Auto Read CMD',      icon: '📖', key: 'autoReadCmd',     group: 'auto' },
    // ── SECURITY ──
    { id: 6,  label: 'Anti Link',          icon: '🔗', key: 'antiLink',        group: 'sec'  },
    { id: 7,  label: 'Anti Bad Words',     icon: '🚫', key: 'antiBadWords',    group: 'sec'  },
    { id: 8,  label: 'Anti Delete',        icon: '🗑️', key: 'antidelete',      group: 'sec'  },
    { id: 9,  label: 'Anti Bot',           icon: '🛡️', key: 'antiBot',         group: 'sec'  },
    // ── UI ──
    { id: 10, label: 'Button Mode',        icon: '🔘', key: 'button',          group: 'ui'   },
    { id: 11, label: 'Movie Doc Thumb',    icon: '🎬', key: 'moviedoc',        group: 'ui'   },
    { id: 12, label: 'Always Offline',      icon: '👻', key: 'alwaysOffline',   group: 'ui'   },
];

// ─── Helpers ─────────────────────────────────────────────────
function isOn(key) {
    const v = getSetting(key);
    return v === true || v === 'true';
}
function tick(key) { return isOn(key) ? '✅' : '❌'; }
function isEnabled(val) { return val === true || String(val).toLowerCase() === 'true'; }

// ─── Build settings menu ─────────────────────────────────────
function buildSettingsMenu() {
    const s = getAllSettings();

    let autoRows = '', secRows = '', uiRows = '';
    SETTINGS_LIST.forEach(item => {
        const on   = isOn(item.key);
        const row  = `│  *${String(item.id).padStart(2, '0')}* ${item.icon} *${item.label}*\n│      ↳ ${on ? '✅ ON' : '❌ OFF'} │ ON: *${item.id}* │ OFF: *${item.id}.5*\n`;
        if (item.group === 'auto') autoRows += row;
        else if (item.group === 'sec') secRows += row;
        else uiRows += row;
    });

    return (
`╔══════════════════════════╗
║  ⚙️  *SHAVIYA-XMD V2 SETTINGS*  ║
╚══════════════════════════╝
│
├─ 🤖 *BOT INFO*
│  ├─ *Prefix* ➠ \`${s.prefix || '.'}\`
│  ├─ *Mode*   ➠ ${(s.mode || 'public').toUpperCase()}
│  └─ *Owner*  ➠ ${config.OWNER_NUMBER || 'Not set'}
│
├─ ⚡ *AUTOMATION*
${autoRows}│
├─ 🛡️ *SECURITY*
${secRows}│
├─ 🎨 *UI / STYLE*
${uiRows}│
├─────────────────────────
│  💡 *HOW TO TOGGLE:*
│  ├─ Type number → Toggle ON
│  └─ Type number.5 → Toggle OFF
│  *(Reply to THIS message)*
│
├─ 🔧 *QUICK COMMANDS:*
│  ├─ \`.set autovoice on\`
│  ├─ \`.set mode public\`
│  ├─ \`.set prefix .\`
│  └─ \`.resetbot confirm\`
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⊷
> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 💎`
    );
}

// ─── Build env/config info text ──────────────────────────────
function buildBotInfo() {
    const s = getAllSettings();
    return (
`╭──『 *SHAVIYA-XMD V2* 』──❏
│
│  ⚙️ *FULL BOT CONFIGURATION*
│─────────────────────────
│
├─❏ *🤖 BOT INFO*
│  ├─∘ *Prefix:*  ${config.PREFIX || '.'}
│  ├─∘ *Owner:*   ${config.OWNER_NUMBER || 'Not set'}
│  └─∘ *Mode:*    ${(s.mode || config.MODE || 'public').toUpperCase()}
│
├─❏ *⚙️ AUTOMATION* _(MongoDB live)_
│  ├─∘ *Auto Voice:*        ${tick('autoVoice')}
│  ├─∘ *Auto AI:*           ${tick('autoAI')}
│  ├─∘ *Auto Read Status:*  ${tick('autoReadStatus')}
│  ├─∘ *Auto React Status:* ${tick('autoReactStatus')}
│  └─∘ *Auto Read CMD:*     ${tick('autoReadCmd')}
│
├─❏ *🛡️ SECURITY* _(MongoDB live)_
│  ├─∘ *Anti Link:*         ${tick('antiLink')}
│  ├─∘ *Anti Bad Words:*    ${tick('antiBadWords')}
│  ├─∘ *Anti Delete:*       ${tick('antidelete')}
│  └─∘ *Anti Bot:*          ${tick('antiBot')}
│
├─❏ *🎨 UI*
│  ├─∘ *Button Mode:*       ${tick('button')}
│  ├─∘ *Movie Doc Thumb:*   ${tick('moviedoc')}
│  └─∘ *Button Style:*      ${s.buttonStyle || 'default'}
│
├─❏ *🔑 API KEYS* _(set/not set)_
│  ├─∘ *OpenWeather:*  ${config.OPENWEATHER_API_KEY ? '✅ Set' : '❌ Not set'}
│  ├─∘ *ElevenLabs:*   ${config.ELEVENLABS_API_KEY  ? '✅ Set' : '❌ Not set'}
│  ├─∘ *OMDB:*         ${config.OMDB_API_KEY         ? '✅ Set' : '❌ Not set'}
│  ├─∘ *Pexels:*       ${config.PEXELS_API_KEY       ? '✅ Set' : '❌ Not set'}
│  ├─∘ *Google API:*   ${config.GOOGLE_API_KEY        ? '✅ Set' : '❌ Not set'}
│  └─∘ *Pastebin:*     ${config.PASTEBIN_API_KEY      ? '✅ Set' : '❌ Not set'}
│
├─❏ *🎨 CUSTOMIZATION*
│  ├─∘ *Pack Name:*   ${config.PACKNAME || 'SHAVIYA-XMD V2'}
│  ├─∘ *Author:*      ${config.AUTHOR   || 'SHAVIYA TECH 💎'}
│  ├─∘ *Footer:*      ${s.footer        || 'Powered By SHAVIYA-XMD 💎'}
│  ├─∘ *Alive IMG:*   ${config.ALIVE_IMG ? '✅ Set' : '❌ Not set'}
│  └─∘ *Menu IMG:*    ${config.MENU_IMG  ? '✅ Set' : '❌ Not set'}
│
╰──『 SHAVIYA-XMD V2 | © Mr Savendra 』──❏`
    );
}

// ─── Send menu with image ─────────────────────────────────────
async function sendMenu(conn, from, mek, text) {
    try {
        return await conn.sendMessage(from, {
            image: { url: config.MENU_IMG || 'https://files.catbox.moe/f18ceb.jpg' },
            caption: text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421386030144@newsletter',
                    newsletterName: '⚙️ SHAVIYA-XMD V2 SETTINGS',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });
    } catch {
        return await conn.sendMessage(from, { text }, { quoted: mek });
    }
}

// ─── Global menu session tracker ─────────────────────────────
if (!global._settingsMenuIds) global._settingsMenuIds = new Map();

// ─────────────────────────────────────────────────────────────
// .settings — Interactive toggle menu
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'settings',
    alias:    ['setting', 'config', 'bsettings', 'botconfig'],
    desc:     'Full interactive bot settings menu',
    category: 'owner',
    react:    '⚙️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const menuTxt = buildSettingsMenu();
    const sent    = await sendMenu(conn, from, mek, menuTxt);

    // Track menu session for reply-by-number toggle
    const ownerNum = m.sender.split('@')[0].split(':')[0];
    global._settingsMenuIds.set(ownerNum, { menuId: sent.key.id, from });
});

// ─────────────────────────────────────────────────────────────
// .botinfo — Full env config display
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'botinfo',
    alias:    ['envinfo', 'configinfo'],
    desc:     'Show full bot configuration and env vars',
    category: 'owner',
    react:    '🔍',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    await conn.sendMessage(from, {
        image: { url: config.ALIVE_IMG || 'https://files.catbox.moe/f18ceb.jpg' },
        caption: buildBotInfo()
    }, { quoted: FakeVCard });
});

// ─────────────────────────────────────────────────────────────
// Body listener — Reply-by-number toggle (X = ON, X.5 = OFF)
// ─────────────────────────────────────────────────────────────
cmd({ on: 'body' },
async (conn, mek, m, { from, body, isOwner }) => {
    try {
        if (!isOwner) return;
        if (!global._settingsMenuIds) return;

        const ownerNum = m.sender.split('@')[0].split(':')[0];
        const session  = global._settingsMenuIds.get(ownerNum);
        if (!session) return;

        // Must be reply to our settings menu message
        const context = mek.message?.extendedTextMessage?.contextInfo;
        if (!context?.stanzaId) return;
        if (context.stanzaId !== session.menuId) return;

        const text = (body || '').trim();
        if (!text) return;

        // Parse: "3" = ON, "3.5" = OFF
        const isOff   = text.endsWith('.5');
        const numPart = isOff ? text.slice(0, -2) : text;
        const num     = parseFloat(numPart);
        if (isNaN(num)) return;

        const setting = SETTINGS_LIST.find(s => s.id === num);
        if (!setting) {
            return conn.sendMessage(from, {
                text: `❌ *Invalid:* \`${text}\`\n\nValid range: *1 – ${SETTINGS_LIST.length}*\nFormat: *3* = ON | *3.5* = OFF`
            }, { quoted: mek });
        }

        const newVal = !isOff;
        await setSetting(setting.key, newVal);

        // React
        await conn.sendMessage(from, { react: { text: newVal ? '✅' : '❌', key: mek.key } });

        // Send updated menu
        const newMenuTxt = buildSettingsMenu();
        const statusTxt  = newVal ? '✅ ON' : '❌ OFF';
        const fullCaption = `${setting.icon} *${setting.label}* → *${statusTxt}*\n✅ _Saved to MongoDB — no restart needed_\n\n${newMenuTxt}`;

        const newSent = await sendMenu(conn, from, mek, fullCaption);

        // Update tracked menu ID
        global._settingsMenuIds.set(ownerNum, { menuId: newSent.key.id, from });

    } catch (err) {
        console.log('[SETTINGS REPLY]:', err.message);
    }
});

// ─────────────────────────────────────────────────────────────
// .set — Quick direct toggle
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'set',
    alias:    ['botset', 'setbot'],
    desc:     'Quick toggle any setting by key',
    category: 'owner',
    react:    '🔧',
    filename: __filename
},
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    if (!args[0]) return reply(
`🔧 *Quick Setting Change*

*Usage:* \`.set <key> <on/off/value>\`

*Bool settings:*
├─ \`.set autovoice on\`
├─ \`.set autoai on\`
├─ \`.set autoreadstatus off\`
├─ \`.set autoreactstatus on\`
├─ \`.set autoreadcmd on\`
├─ \`.set antilink on\`
├─ \`.set antibadwords on\`
├─ \`.set antidelete on\`
├─ \`.set antibot on\`
├─ \`.set button on\`
└─ \`.set moviedoc on\`
└─ \`.set alwaysoffline on\`

*String settings:*
├─ \`.set mode public\`
├─ \`.set prefix .\`
└─ \`.set footer <text>\`

_Use .settings for full interactive menu._`
    );

    const keyRaw = args[0].toLowerCase().trim();
    const value  = args.slice(1).join(' ').toLowerCase().trim();

    // Bool keys map
    const boolMap = {
        autovoice:       'autoVoice',
        autoai:          'autoAI',
        autoreadstatus:  'autoReadStatus',
        autoreactstatus: 'autoReactStatus',
        autoreadcmd:     'autoReadCmd',
        antilink:        'antiLink',
        antibadwords:    'antiBadWords',
        antidelete:      'antidelete',
        antibot:         'antiBot',
        button:          'button',
        moviedoc:        'moviedoc',
        alwaysoffline:   'alwaysOffline',
    };

    // String keys map
    const strMap = {
        mode:   { key: 'mode',   valid: ['public','private','inbox','group'] },
        prefix: { key: 'prefix', valid: null },
        footer: { key: 'footer', valid: null },
    };

    if (boolMap[keyRaw]) {
        if (value !== 'on' && value !== 'off') {
            return reply(`❌ Use *on* or *off*\nExample: \`.set ${keyRaw} on\``);
        }
        const newVal = value === 'on';
        await setSetting(boolMap[keyRaw], newVal);
        return reply(
            `${newVal ? '✅' : '❌'} *${keyRaw.toUpperCase()}* → *${value.toUpperCase()}*\n`
            + `_Saved to MongoDB — no restart needed 💾_`
        );
    }

    if (strMap[keyRaw]) {
        const { key: sk, valid } = strMap[keyRaw];
        const saveVal = args.slice(1).join(' ').trim();
        if (!saveVal) return reply(`❌ Please provide a value!\nExample: \`.set ${keyRaw} public\``);
        if (valid && !valid.includes(saveVal.toLowerCase())) {
            return reply(`❌ Invalid: *${saveVal}*\nValid values: ${valid.join(', ')}`);
        }
        await setSetting(sk, saveVal);
        return reply(
            `✅ *${keyRaw.toUpperCase()}* set to: *${saveVal}*\n`
            + `_Saved to MongoDB — no restart needed 💾_`
        );
    }

    return reply(`❌ Unknown key: *${keyRaw}*\n\nType \`.set\` to see all options.`);
});

// ─────────────────────────────────────────────────────────────
// .resetbot — Reset all settings to defaults
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'resetbot',
    alias:    ['resetsettings', 'resetconfig'],
    desc:     'Reset all bot settings to default',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    if (args[0] !== 'confirm') {
        return reply(
`⚠️ *Reset All Settings?*

This will reset all settings to their default values.
All data will be erased from MongoDB and local file.

_To confirm type:_ \`.resetbot confirm\``
        );
    }

    await resetAllSettings();
    return reply(
`🔄 *All settings reset to default!*

✅ MongoDB updated
✅ Local file updated
✅ RAM cache cleared

_No restart needed._\n\n> © Mr Savendra · SHAVIYA-XMD V2`
    );
});
