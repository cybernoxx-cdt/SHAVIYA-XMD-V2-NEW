// ============================================================
//   plugins/autostatus.js  —  SHAVIYA-XMD V2
//   Commands: .autostatus, .autolike
//
//   FEATURES:
//   - .autolike on/off       — toggle react
//   - .autolike emoji 💜     — change react emoji (saved to MongoDB)
//   - .autolike              — show current status
//   - autoStatusLike default = OFF
//   - autoStatusEmoji default = ❤️
// ============================================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// Helper: default ON — only explicit false = OFF
const isEnabled = (val) => val !== false;

// Valid single emoji check
const isSingleEmoji = (str) => {
    const emojiRegex = /^\p{Emoji}$/u;
    return emojiRegex.test(str.trim());
};

// ── .autostatus ───────────────────────────────────────────────
cmd({
    pattern: 'autostatus',
    alias: ['statusview', 'autoread'],
    desc: 'Toggle auto status view',
    category: 'settings',
    react: '👁️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only command!');

    const current    = getSetting('autoStatusRead');
    const likeState  = getSetting('autoStatusLike');
    const likeEmoji  = getSetting('autoStatusEmoji') || '❤️';

    if (!q) {
        return reply(
            `👁️ *Auto Status Settings*\n\n` +
            `📱 *Auto View:*  ${current !== false ? 'ON ✅' : 'OFF ❌'}\n` +
            `💚 *Auto React:* ${isEnabled(likeState) ? 'ON ✅' : 'OFF ❌'}\n` +
            `${likeEmoji} *React Emoji:* ${likeEmoji}\n\n` +
            `*Commands:*\n` +
            `.autostatus on/off\n` +
            `.autolike on/off\n` +
            `.autolike emoji 💜  — change emoji`
        );
    }

    const arg = q.trim().toLowerCase();

    if (arg === 'on') {
        await setSetting('autoStatusRead', true);
        return reply('✅ *Auto Status View ON!*');
    }
    if (arg === 'off') {
        await setSetting('autoStatusRead', false);
        return reply('❌ *Auto Status View OFF*');
    }

    return reply('❓ Usage: `.autostatus on` or `.autostatus off`');
});

// ── .autolike ─────────────────────────────────────────────────
cmd({
    pattern: 'autolike',
    alias: ['autoreact', 'statusreact'],
    desc: 'Toggle auto react to statuses + change emoji',
    category: 'settings',
    react: '💚',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only command!');

    const current   = getSetting('autoStatusLike');
    const likeEmoji = getSetting('autoStatusEmoji') || '❤️';

    // No args — show status
    if (!q) {
        return reply(
            `💚 *Auto Status React*\n\n` +
            `Status:  *${isEnabled(current) ? 'ON ✅' : 'OFF ❌'}*\n` +
            `Emoji:   *${likeEmoji}*\n\n` +
            `*Usage:*\n` +
            `.autolike on\n` +
            `.autolike off\n` +
            `.autolike emoji 💜`
        );
    }

    const arg = q.trim();
    const argLower = arg.toLowerCase();

    // Toggle on/off
    if (argLower === 'on') {
        await setSetting('autoStatusLike', true);
        return reply(`✅ *Auto React ON!*\nBot will react ${likeEmoji} to every status.`);
    }
    if (argLower === 'off') {
        await setSetting('autoStatusLike', false);
        return reply('❌ *Auto React OFF*');
    }

    // Change emoji — .autolike emoji 💜
    if (argLower.startsWith('emoji')) {
        const parts = arg.split(/\s+/);
        const newEmoji = parts[1];

        if (!newEmoji) {
            return reply(`❓ Usage: \`.autolike emoji 💜\`\nCurrent emoji: ${likeEmoji}`);
        }
        if (!isSingleEmoji(newEmoji)) {
            return reply(`❌ *Invalid emoji!*\nSend a single emoji only.\nExample: \`.autolike emoji 💜\``);
        }

        await setSetting('autoStatusEmoji', newEmoji);
        return reply(`✅ *React emoji changed to ${newEmoji}*\nSaved to database.`);
    }

    return reply(
        `❓ Unknown option.\n\n` +
        `Usage:\n` +
        `.autolike on/off\n` +
        `.autolike emoji 💜`
    );
});
