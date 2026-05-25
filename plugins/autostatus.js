// ============================================================
//   plugins/autostatus.js  —  SHAVIYA-XMD V2
//   Commands: .autostatus, .autolike
//   Uses native getSetting/setSetting (MongoDB + file backed)
//
//   FIX NOTES:
//   - autoStatusRead default = ON (undefined/null treated as true)
//     matches index.js: if (autoStatusRead !== false) → read
//   - Status display now shows correct ON/OFF for unset state
//   - autolike only reacts to actual content (image/video/text)
//     not senderKeyDistribution or null-message deliveries
// ============================================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// Helper: treat undefined/null as ON (default enabled)
const isEnabled = (val) => val !== false;

// ── .autostatus ───────────────────────────────────────────────
cmd({
    pattern: 'autostatus',
    alias: ['statusview', 'autoread'],
    desc: 'Toggle auto status view (read all contacts statuses)',
    category: 'settings',
    react: '👁️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only command!');

    const current   = getSetting('autoStatusRead');
    const reactState = getSetting('autoStatusLike');

    // No args — show current state
    if (!q) {
        return reply(
            `👁️ *Auto Status Settings*\n\n` +
            `📱 *Auto Status View:* ${isEnabled(current) ? 'ON ✅' : 'OFF ❌'}\n` +
            `💚 *Auto Status React:* ${isEnabled(reactState) ? 'ON ✅' : 'OFF ❌'}\n\n` +
            `*Usage:*\n` +
            `.autostatus on  — Enable auto view\n` +
            `.autostatus off — Disable auto view\n` +
            `.autolike on/off — Toggle ❤️ reactions\n\n` +
            `_Default: Auto View = ON, Auto React = OFF_`
        );
    }

    const arg = q.trim().toLowerCase();

    if (arg === 'on') {
        await setSetting('autoStatusRead', true);
        return reply('✅ *Auto Status View ON!*\nBot will now automatically view all statuses.');
    }

    if (arg === 'off') {
        await setSetting('autoStatusRead', false);
        return reply('❌ *Auto Status View OFF*\nBot will no longer view statuses.');
    }

    return reply('❓ Usage: `.autostatus on` or `.autostatus off`');
});

// ── .autolike ─────────────────────────────────────────────────
cmd({
    pattern: 'autolike',
    alias: ['autoreact', 'statusreact'],
    desc: 'Toggle auto react ❤️ to statuses',
    category: 'settings',
    react: '💚',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only command!');

    const current = getSetting('autoStatusLike');

    if (!q) {
        return reply(
            `💚 *Auto Status React* is: *${isEnabled(current) ? 'ON ✅' : 'OFF ❌'}*\n\n` +
            `Usage: .autolike on / off\n` +
            `_Default: OFF — only reacts to image/video/text statuses_`
        );
    }

    const arg = q.trim().toLowerCase();

    if (arg === 'on') {
        await setSetting('autoStatusLike', true);
        return reply('💚 *Auto Status React ON!*\nBot will react ❤️ to every image/video/text status.');
    }

    if (arg === 'off') {
        await setSetting('autoStatusLike', false);
        return reply('❌ *Auto Status React OFF*');
    }

    return reply('❓ Usage: `.autolike on` or `.autolike off`');
});
