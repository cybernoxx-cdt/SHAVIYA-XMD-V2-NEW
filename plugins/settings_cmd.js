// ============================================
//   plugins/settings_cmd.js
//   setfooter, setthumb, setprefix, setfname,
//   moviedoc, button toggle
// ============================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── SET FOOTER ────────────────────────────────
cmd({
    pattern: 'setfooter',
    alias: ['botname'],
    desc: 'Set bot footer text',
    category: 'settings',
    react: '🖊️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply(`🖊️ *Current footer:* ${getSetting('footer', sessionId)}\n\nUsage: .setfooter My Bot Name`);

    await setSetting('footer', q, sessionId);
    reply(`✅ *Footer set to:* ${q}`);
});

// ── SET THUMB ─────────────────────────────────
cmd({
    pattern: 'setthumb',
    alias: ['thumburl'],
    desc: 'Set doc thumbnail URL',
    category: 'settings',
    react: '🖼️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply(`🖼️ *Current thumb:* ${getSetting('thumb', sessionId) || 'Not set'}\n\nUsage: .setthumb https://...`);

    await setSetting('thumb', q, sessionId);
    reply(`✅ *Thumbnail URL saved!*`);
});

// ── SET PREFIX ────────────────────────────────
cmd({
    pattern: 'setprefix',
    alias: ['docprefix'],
    desc: 'Set caption prefix',
    category: 'settings',
    react: '🔤',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply(`🔤 *Current prefix:* ${getSetting('prefix', sessionId) || 'Not set'}\n\nUsage: .setprefix 🎬`);

    await setSetting('prefix', q, sessionId);
    reply(`✅ *Caption prefix set to:* ${q}`);
});

// ── SET FNAME ─────────────────────────────────
cmd({
    pattern: 'setfname',
    desc: 'Set file name prefix',
    category: 'settings',
    react: '📝',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');
    if (!q) return reply(`📝 *Current fname:* ${getSetting('fname', sessionId) || 'Not set'}\n\nUsage: .setfname SHAVIYA`);

    await setSetting('fname', q, sessionId);
    reply(`✅ *File name prefix set to:* ${q}`);
});

// ── MOVIE DOC ─────────────────────────────────
cmd({
    pattern: 'moviedoc',
    desc: 'Toggle movie poster as doc thumbnail',
    category: 'settings',
    react: '🎬',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');

    if (!q) {
        const current = getSetting('moviedoc', sessionId);
        return reply(`🎬 *Moviedoc* is: *${current ? 'ON ✅' : 'OFF ❌'}*\n\nUsage: .moviedoc on / off`);
    }

    if (q === 'on') {
        await setSetting('moviedoc', true, sessionId);
        reply('✅ *Moviedoc ON* - Movie poster used as thumbnail!');
    } else if (q === 'off') {
        await setSetting('moviedoc', false, sessionId);
        reply('❌ *Moviedoc OFF*');
    } else {
        reply('Usage: .moviedoc on / off');
    }
});

// ── BUTTON TOGGLE ─────────────────────────────
cmd({
    pattern: 'button',
    alias: ['btnmode'],
    desc: 'Toggle button mode',
    category: 'settings',
    react: '🔘',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ Owner only!');

    if (!q) {
        const current = getSetting('button', sessionId);
        return reply(`🔘 *Button mode* is: *${current ? 'ON ✅' : 'OFF ❌'}*\n\nUsage: .button on / off`);
    }

    if (q === 'on') {
        await setSetting('button', true, sessionId);
        reply('✅ *Button mode ON!*');
    } else if (q === 'off') {
        await setSetting('button', false, sessionId);
        reply('❌ *Button mode OFF*');
    } else {
        reply('Usage: .button on / off');
    }
});
