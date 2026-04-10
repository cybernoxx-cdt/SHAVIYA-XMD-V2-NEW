// ============================================
//   plugins/settings_premium.js
//   SHAVIYA-XMD V2 — FULL PREMIUM SETTINGS
//
//   ✅ .settings  → Interactive numbered menu
//   ✅ Reply number to toggle ON/OFF instantly
//   ✅ X.5 = OFF  |  X = ON  (e.g. 7=on, 7.5=off)
//   ✅ No restart needed — saves to settings.json
//   ✅ Auto typing / recording — real interval
//   ✅ Full customize support
// ============================================

'use strict';

const { cmd }                      = require('../command');
const { getSetting, setSetting,
        getAllSettings, getConfig } = require('../lib/settings');

// ── Presence interval trackers (module-level) ─
let _typingTimers    = new Map(); // jid → intervalId
let _recordingTimers = new Map(); // jid → intervalId

function startPresence(conn, jid, type, timerMap) {
    stopPresence(jid, timerMap);
    // Send immediately then every 5s
    conn.sendPresenceUpdate(type, jid).catch(() => {});
    const id = setInterval(() => {
        conn.sendPresenceUpdate(type, jid).catch(() => {});
    }, 5000);
    timerMap.set(jid, id);
}

function stopPresence(jid, timerMap) {
    if (timerMap.has(jid)) {
        clearInterval(timerMap.get(jid));
        timerMap.delete(jid);
    }
}

// ── Settings definition list ──────────────────
// { id, half, label, icon, settingKey, type }
// id   = number to type for ON
// half = id + ".5" for OFF
// type = 'bool' | 'string'
const SETTINGS_LIST = [
    // ── AUTOMATION ──
    { id: 1,  label: 'Auto Voice',       icon: '🔊', key: 'autoVoice'      },
    { id: 2,  label: 'Auto AI',          icon: '🤖', key: 'autoAI'         },
    { id: 3,  label: 'Always Online',    icon: '🟢', key: 'alwaysOnline'   },
    { id: 4,  label: 'Auto Read Status', icon: '👁️', key: 'autoReadStatus' },
    { id: 5,  label: 'Auto Read CMD',    icon: '📖', key: 'autoReadCmd'    },
    // ── PRESENCE ──
    { id: 6,  label: 'Auto Typing',      icon: '⌨️', key: 'autoTyping'    },
    { id: 7,  label: 'Auto Recording',   icon: '🎙️', key: 'autoRecording' },
    // ── SECURITY ──
    { id: 8,  label: 'Anti Link',        icon: '🔗', key: 'antiLink'       },
    { id: 9,  label: 'Anti Bot',         icon: '🤖', key: 'antiBot'        },
    { id: 10, label: 'Anti Delete',      icon: '🗑️', key: 'antidelete'    },
    { id: 11, label: 'Anti Bad Words',   icon: '🚫', key: 'antiBadWords'   },
    // ── UI ──
    { id: 12, label: 'Button Mode',      icon: '🔘', key: 'button'         },
    { id: 13, label: 'Movie Doc Thumb',  icon: '🎬', key: 'moviedoc'       },
];

// ── Build the settings menu text ─────────────
function buildSettingsMenu(s) {
    const icon = v => (v === true || v === 'true') ? '✅' : '❌';

    let automation = '';
    let presence   = '';
    let security   = '';
    let ui         = '';

    SETTINGS_LIST.forEach(item => {
        const val  = s[item.key];
        const line = `│  ${item.id < 10 ? ' ' : ''}*${item.id}* ${item.icon} *${item.label}*\n│      ↳ ${icon(val)} | ON: *${item.id}* | OFF: *${item.id}.5*\n`;
        if (item.id <= 5)       automation += line;
        else if (item.id <= 7)  presence   += line;
        else if (item.id <= 11) security   += line;
        else                    ui         += line;
    });

    return (
`╔══════════════════════════╗
║  ⚙️ *SHAVIYA-XMD V2 SETTINGS*  ║
╚══════════════════════════╝
│
├─ 🤖 *BOT INFO*
│  ├─ *Prefix* ➠ [ ${s.prefix || '.'} ]
│  ├─ *Mode*   ➠ ${(s.mode || 'public').toUpperCase()}
│  └─ *Button Style* ➠ ${s.buttonStyle || 'default'}
│
├─ ⚡ *AUTOMATION*   _(reply number)_
${automation}│
├─ 🎭 *PRESENCE*
${presence}│
├─ 🛡️ *SECURITY*
${security}│
├─ 🎨 *UI*
${ui}│
├─────────────────────────
│  💡 *HOW TO USE:*
│  ├─ Type *7* → Auto Recording ON
│  ├─ Type *7.5* → Auto Recording OFF
│  ├─ Type *6* → Auto Typing ON
│  └─ Type *6.5* → Auto Typing OFF
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⊷
> ✨ *SHAVIYA XMD · PREMIUM SETTINGS* 💎`
    );
}

// ══════════════════════════════════════════════
//   .settings  —  show premium settings menu
// ══════════════════════════════════════════════
cmd({
    pattern:  'settings',
    alias:    ['setting', 'config', 'bsettings', 'botconfig'],
    desc:     'Premium bot settings menu',
    category: 'owner',
    react:    '⚙️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, sessionId }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    const s       = getAllSettings();
    const menuTxt = buildSettingsMenu(s);

    const FakeVCard = {
        key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
        message: { contactMessage: {
            displayName: '💎 SHAVIYA-XMD V2',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD'
        }}
    };

    // Send settings menu
    let sentMenu;
    try {
        sentMenu = await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/f18ceb.jpg' },
            caption: menuTxt,
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
    } catch (e) {
        sentMenu = await conn.sendMessage(from, { text: menuTxt }, { quoted: mek });
    }

    // ── Store latest menu msg ID in global (per user) ─
    const ownerNum = m.sender.split('@')[0].split(':')[0];
    if (!global._settingsMenuIds) global._settingsMenuIds = new Map();
    global._settingsMenuIds.set(ownerNum, {
        menuId: sentMenu.key.id,
        conn,
        from,
        sessionId
    });
});

// ── Global persistent settings reply handler ──────────────
// Runs on EVERY message, no timeout, no expire
// Works with original menu reply AND any subsequent menu reply
cmd({ on: 'body' },
async (conn, mek, m, { from, body, isOwner }) => {
    try {
        if (!isOwner) return;
        if (!global._settingsMenuIds) return;

        const ownerNum = m.sender.split('@')[0].split(':')[0];
        const session  = global._settingsMenuIds.get(ownerNum);
        if (!session) return;

        const msg     = mek;
        const context = msg.message?.extendedTextMessage?.contextInfo;
        if (!context?.stanzaId) return;

        // Check if this is a reply to ANY settings menu message
        if (context.stanzaId !== session.menuId) return;

        const text   = body.trim();
        if (!text) return;

        // Parse: "7" = ON, "7.5" = OFF
        const isOff   = text.endsWith('.5');
        const numPart = isOff ? text.slice(0, -2) : text;
        const num     = parseFloat(numPart);

        if (isNaN(num)) return;

        const setting = SETTINGS_LIST.find(s => s.id === num);

        if (!setting) {
            await conn.sendMessage(from, {
                text: `❌ *Invalid:* ${text}\n\nUse a number from the menu.\n*Example:* 7 = ON | 7.5 = OFF`
            }, { quoted: mek });
            return;
        }

        const newVal    = !isOff;
        await setSetting(setting.key, newVal);

        // ── Special live handlers ────────────
        if (setting.key === 'autoTyping') {
            if (newVal) startPresence(conn, from, 'composing', _typingTimers);
            else { stopPresence(from, _typingTimers); conn.sendPresenceUpdate('paused', from).catch(() => {}); }
        }
        if (setting.key === 'autoRecording') {
            if (newVal) startPresence(conn, from, 'recording', _recordingTimers);
            else { stopPresence(from, _recordingTimers); conn.sendPresenceUpdate('paused', from).catch(() => {}); }
        }
        if (setting.key === 'button' && typeof global.setButtonState === 'function') {
            global.setButtonState(session.sessionId, newVal);
        }

        // ── React ─────────────────────────────
        await conn.sendMessage(from, { react: { text: newVal ? '✅' : '❌', key: mek.key } });

        // ── Send updated menu ─────────────────
        const updated    = getAllSettings();
        const newMenuTxt = buildSettingsMenu(updated);
        const statusTxt  = newVal ? '✅ ON' : '❌ OFF';

        const FakeVCard = {
            key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
            message: { contactMessage: {
                displayName: '💎 SHAVIYA-XMD V2',
                vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD'
            }}
        };

        let newSent;
        try {
            newSent = await conn.sendMessage(from, {
                image: { url: 'https://files.catbox.moe/f18ceb.jpg' },
                caption: `${setting.icon} *${setting.label}* → *${statusTxt}*\n✅ _Saved instantly — no restart needed_\n\n${newMenuTxt}`,
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
        } catch (e) {
            newSent = await conn.sendMessage(from, {
                text: `${setting.icon} *${setting.label}* → *${statusTxt}*\n✅ _Saved_\n\n${newMenuTxt}`
            }, { quoted: FakeVCard });
        }

        // ── Update tracked menu ID to new message ─
        global._settingsMenuIds.set(ownerNum, {
            menuId: newSent.key.id,
            conn,
            from,
            sessionId: session.sessionId
        });

    } catch (err) {
        console.log('[SETTINGS REPLY]:', err.message);
    }
});

// ══════════════════════════════════════════════
//   on:body — Auto Typing presence (interval)
// ══════════════════════════════════════════════
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        if (!getConfig('ALWAYS_TYPING')) return;
        if (!_typingTimers.has(from)) {
            startPresence(conn, from, 'composing', _typingTimers);
        }
    } catch {}
});

// ══════════════════════════════════════════════
//   on:body — Auto Recording presence (interval)
// ══════════════════════════════════════════════
cmd({ on: 'body' },
async (conn, mek, m, { from }) => {
    try {
        if (!getConfig('ALWAYS_RECORDING')) return;
        if (!_recordingTimers.has(from)) {
            startPresence(conn, from, 'recording', _recordingTimers);
        }
    } catch {}
});

// ══════════════════════════════════════════════
//   .set  —  quick single setting change
// ══════════════════════════════════════════════
cmd({
    pattern:  'set',
    alias:    ['toggle', 'botset'],
    desc:     'Quick toggle any setting',
    category: 'owner',
    react:    '🔧',
    filename: __filename
},
async (conn, mek, m, { isOwner, args, reply, sessionId, from }) => {
    if (!isOwner) return reply('❌ *Owner only!*');

    if (!args[0]) return reply(
`🔧 *Quick Setting Change*

Usage: *.set <key> <on/off>*

Examples:
├─ *.set autovoice on*
├─ *.set autotyping off*
├─ *.set autorecording on*
├─ *.set antilink on*
├─ *.set button on*
├─ *.set mode public*
└─ *.set prefix .*

Or use *.settings* for the full menu.`
    );

    const keyRaw = args[0].toLowerCase().trim();
    const value  = args.slice(1).join(' ').toLowerCase().trim();

    const boolMap = {
        autovoice:      'autoVoice',
        autoai:         'autoAI',
        autotyping:     'autoTyping',
        autorecording:  'autoRecording',
        alwaysonline:   'alwaysOnline',
        autoreadstatus: 'autoReadStatus',
        autoreadcmd:    'autoReadCmd',
        antilink:       'antiLink',
        antibot:        'antiBot',
        antidelete:     'antidelete',
        antibadwords:   'antiBadWords',
        button:         'button',
        moviedoc:       'moviedoc',
    };

    const strMap = {
        mode:   { key: 'mode',        valid: ['public','private','inbox','group','premium','privatepremium'] },
        prefix: { key: 'prefix',      valid: null },
        footer: { key: 'footer',      valid: null },
        style:  { key: 'buttonStyle', valid: ['default','image','video','minimal','numbered'] },
    };

    if (boolMap[keyRaw]) {
        if (value !== 'on' && value !== 'off') return reply(`❌ Use *on* or *off*\nExample: *.set ${keyRaw} on*`);
        const newVal = value === 'on';
        await setSetting(boolMap[keyRaw], newVal);

        if (keyRaw === 'autotyping') {
            if (newVal) startPresence(conn, from, 'composing', _typingTimers);
            else { stopPresence(from, _typingTimers); conn.sendPresenceUpdate('paused', from).catch(() => {}); }
        }
        if (keyRaw === 'autorecording') {
            if (newVal) startPresence(conn, from, 'recording', _recordingTimers);
            else { stopPresence(from, _recordingTimers); conn.sendPresenceUpdate('paused', from).catch(() => {}); }
        }
        if (keyRaw === 'button' && typeof global.setButtonState === 'function') {
            global.setButtonState(sessionId, newVal);
        }
        return reply(`${newVal ? '✅' : '❌'} *${keyRaw.toUpperCase()} ${value.toUpperCase()}*\n_Saved instantly — no restart needed_ ✅`);
    }

    if (strMap[keyRaw]) {
        const { key: sk, valid } = strMap[keyRaw];
        if (valid && !valid.includes(value)) return reply(`❌ Invalid: *${value}*\nValid: ${valid.join(', ')}`);
        const saveVal = (keyRaw === 'prefix' || keyRaw === 'footer') ? args.slice(1).join(' ').trim() : value;
        await setSetting(sk, saveVal);
        return reply(`✅ *${keyRaw.toUpperCase()}* set to: *${saveVal}*\n_Saved instantly_ ✅`);
    }

    return reply(`❌ Unknown key: *${keyRaw}*\n\nType *.set* to see all options.`);
});

// ══════════════════════════════════════════════
//   .resetbot  —  reset all to defaults
// ══════════════════════════════════════════════
cmd({
    pattern:  'resetbot',
    alias:    ['resetsettings'],
    desc:     'Reset all settings to default',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');
    if (args[0] !== 'confirm') return reply('⚠️ *Reset all settings?*\n\nType *.resetbot confirm* to proceed.');

    const { resetAllSettings } = require('../lib/settings');
    resetAllSettings();

    // Stop all presence timers
    _typingTimers.forEach((id) => clearInterval(id));
    _recordingTimers.forEach((id) => clearInterval(id));
    _typingTimers.clear();
    _recordingTimers.clear();

    return reply('🔄 *All settings reset to default!*\n\nSaved ✅');
});
