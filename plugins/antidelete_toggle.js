// ============================================
//   plugins/antidelete_toggle.js
// ============================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

cmd({
    pattern: 'antidelete',
    alias: ['antidel'],
    desc: 'Toggle anti-delete messages on/off',
    category: 'settings',
    react: '🛡️',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ Owner only command!');

    if (!q) {
        const current = getSetting('antidelete');
        return reply(`🛡️ *Antidelete* is currently: *${current ? 'ON ✅' : 'OFF ❌'}*\n\nUsage: .antidelete on / off`);
    }

    if (q === 'on') {
        setSetting('antidelete', true);
        reply('✅ *Antidelete ON* - Deleted messages will be shown!');
    } else if (q === 'off') {
        setSetting('antidelete', false);
        reply('❌ *Antidelete OFF* - Disabled.');
    } else {
        reply('Usage: .antidelete on / off');
    }
});
