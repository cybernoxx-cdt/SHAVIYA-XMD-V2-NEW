// ============================================================
//  Ping.js — SHAVIYA-XMD V2
//  Simple Ping Command
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');
const config  = require('../config');

cmd({
    pattern:  'ping',
    alias:    ['speed', 'pong'],
    desc:     'Check bot response speed',
    category: 'main',
    react:    '🏓',
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const start = Date.now();
        const pong = await conn.sendMessage(from, {
            text: '*⏳ Calculating ping...*'
        }, { quoted: mek });

        const ping = Date.now() - start;

        await conn.sendMessage(from, {
            text: `🏓 *Pong!*\n⚡ `Response: ${ping}ms``,
            edit: pong.key
        });
    } catch (e) {
        console.error('[PING ERROR]', e);
        reply('⚠️ Ping error: ' + e.message);
    }
});
