// ============================================================
//   plugins/ownermenu.js — SHAVIYA-XMD V2
//   ⚙️ Owner Control Panel — All-in-one
//   ✅ .ownermenu / .omenu — Interactive menu
//   ✅ Reply number to toggle (session-based)
//   ✅ .toggle <num|all> [on|off] — Direct toggle
//   ✅ MongoDB save — survives restart
//   © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

'use strict';

const { cmd }                           = require('../command');
const { getSetting, setSetting }        = require('../lib/settings');

// ── Toggleable features ──────────────────────────────────────
const TOGGLES = [
    { n: 1,  key: 'autoReadStatus',  label: 'Auto Read Status',    emoji: '👁️', desc: 'Auto view all statuses'        },
    { n: 2,  key: 'autoReactStatus', label: 'Auto React Status',   emoji: '❤️', desc: 'Auto react to statuses'        },
    { n: 3,  key: 'autoVoice',       label: 'Auto Voice Reply',    emoji: '🔊', desc: 'Auto reply with voice notes'   },
    { n: 4,  key: 'autoAI',          label: 'Auto AI Reply',       emoji: '🤖', desc: 'Auto reply using AI'           },
    { n: 5,  key: 'antiLink',        label: 'Anti Link',           emoji: '🔗', desc: 'Block links in groups'         },
    { n: 6,  key: 'antiBadWords',    label: 'Anti Bad Words',      emoji: '🤬', desc: 'Delete bad words in groups'    },
    { n: 7,  key: 'antidelete',      label: 'Anti Delete',         emoji: '🗑️', desc: 'Recover deleted messages'      },
    { n: 8,  key: 'antiBot',         label: 'Anti Bot',            emoji: '🛡️', desc: 'Block other bots in groups'    },
    { n: 9,  key: 'autoReadCmd',     label: 'Auto Read Messages',  emoji: '📨', desc: 'Mark all messages as read'     },
];

// ── Session tracker (reply-by-number toggle) ─────────────────
// { jid → { ts: timestamp } }
const sessions = new Map();
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────
function isOn(key) {
    const v = getSetting(key);
    return v === true || v === 'true';
}

function buildMenu() {
    const mode   = getSetting('mode')   || 'public';
    const prefix = getSetting('prefix') || '.';

    let msg = `╔══════════════════════════╗\n`;
    msg    += `║ ⚙️  *SHAVIYA-XMD V2 PANEL*  ║\n`;
    msg    += `╚══════════════════════════╝\n\n`;
    msg    += `🔐 *Bot Mode:* \`${mode.toUpperCase()}\`\n`;
    msg    += `🔣 *Prefix:* \`${prefix}\`\n\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg    += `📋 *TOGGLEABLE FEATURES*\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    TOGGLES.forEach(t => {
        const on = isOn(t.key);
        msg += `*${String(t.n).padStart(2, '0')}.* ${t.emoji} ${t.label}\n`;
        msg += `      ${on ? '✅ *ON*' : '❌ *OFF*'} — _${t.desc}_\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 *How to toggle:*\n`;
    msg += `• Reply *1–${TOGGLES.length}* → toggle that feature\n`;
    msg += `• \`${prefix}toggle 3 on\` → force ON\n`;
    msg += `• \`${prefix}toggle all off\` → disable all\n`;
    msg += `• \`${prefix}setmode public/private/inbox/group\`\n\n`;
    msg += `_Session active for 5 mins_ ⏱️\n\n`;
    msg += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 ⚙️`;

    return msg;
}

// ─────────────────────────────────────────────────────────────
// .ownermenu — Show panel
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'ownermenu',
    alias:    ['omenu', 'botpanel', 'panel', 'ownerconfig', 'botconfig'],
    desc:     'Owner control panel — toggle all features',
    category: 'owner',
    react:    '⚙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, from, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    // Open session for reply-by-number toggle
    sessions.set(from, { ts: Date.now() });

    await conn.sendMessage(from, { text: buildMenu() }, { quoted: mek });
});

// ─────────────────────────────────────────────────────────────
// .toggle <num|all> [on|off] — Direct command toggle
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'toggle',
    alias:    ['tgl', 'feature'],
    desc:     'Toggle bot feature on/off by number',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ *Owner only!*');
    if (!q) return reply(
        `⚙️ *Usage:*\n\n`
        + `\`.toggle 3\` — flip ON/OFF\n`
        + `\`.toggle 3 on\` — force ON\n`
        + `\`.toggle 3 off\` — force OFF\n`
        + `\`.toggle all on\` — enable all\n`
        + `\`.toggle all off\` — disable all\n\n`
        + `_Use .ownermenu to see the full list._`
    );

    const parts = q.trim().toLowerCase().split(/\s+/);

    // ── toggle all ──
    if (parts[0] === 'all') {
        const force = parts[1];
        if (force !== 'on' && force !== 'off') {
            return reply('❌ Usage: `.toggle all on` OR `.toggle all off`');
        }
        const val = force === 'on';
        TOGGLES.forEach(t => setSetting(t.key, val));
        return reply(
            `${val ? '✅' : '❌'} *All ${TOGGLES.length} features turned ${force.toUpperCase()}!*\n\n`
            + `_Changes saved — survives restart 💾_\n\n`
            + `> Use _.ownermenu_ to verify.`
        );
    }

    // ── toggle by number ──
    const num    = parseInt(parts[0]);
    const toggle = TOGGLES.find(t => t.n === num);
    if (!toggle) {
        return reply(
            `❌ *Invalid number* \`${parts[0]}\`\n`
            + `Valid range: *1 – ${TOGGLES.length}*\n\n`
            + `_Use .ownermenu to see the list._`
        );
    }

    let newVal;
    if (parts[1] === 'on')       newVal = true;
    else if (parts[1] === 'off') newVal = false;
    else                         newVal = !isOn(toggle.key);

    setSetting(toggle.key, newVal);

    reply(
        `${newVal ? '✅' : '❌'} *${toggle.emoji} ${toggle.label}*\n\n`
        + `Status: *${newVal ? 'ON ✅' : 'OFF ❌'}*\n`
        + `Key: \`${toggle.key}\`\n\n`
        + `_Saved to MongoDB — survives restart 💾_\n\n`
        + `> © SHAVIYA-XMD V2 ⚙️`
    );
});

// ─────────────────────────────────────────────────────────────
// Body listener — Reply-by-number toggle (session based)
// ─────────────────────────────────────────────────────────────
cmd({ on: 'body' },
async (conn, mek, m, { from, body, isOwner }) => {
    try {
        if (!isOwner) return;

        const session = sessions.get(from);
        if (!session) return;

        // Session expired?
        if (Date.now() - session.ts > SESSION_TTL) {
            sessions.delete(from);
            return;
        }

        const trimmed = (body || '').trim();
        const num     = parseInt(trimmed);

        // Must be a plain number only
        if (isNaN(num) || trimmed !== String(num)) return;
        if (num < 1 || num > TOGGLES.length) return;

        // Refresh session
        session.ts = Date.now();

        const toggle = TOGGLES[num - 1];
        const newVal = !isOn(toggle.key);
        setSetting(toggle.key, newVal);

        await conn.sendMessage(from, {
            text:
                `${newVal ? '✅' : '❌'} *${toggle.emoji} ${toggle.label}*\n\n`
                + `Status: *${newVal ? 'ON ✅' : 'OFF ❌'}*\n`
                + `_${toggle.desc}_\n\n`
                + `💡 Reply another number to toggle more.\n`
                + `> © SHAVIYA-XMD V2 ⚙️`
        }, { quoted: mek });

    } catch {}
});
