// ============================================================
//  msg-repeat.js — SHAVIYA-XMD V2
//  Send a message multiple times (Owner Only)
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');

cmd({
    pattern:  'msg',
    desc:     'Send a message multiple times (Owner Only)',
    category: 'owner',
    react:    '🔁',
    filename: __filename
},
async (conn, mek, m, { from, reply, isCreator, q }) => {
    if (!isCreator) return reply('🚫 *Owner only command!*');

    try {
        if (!q || !q.includes(',')) {
            return reply(
                `❌ *Format:* .msg text,count\n` +
                `*Example:* .msg Hello,5\n` +
                `_Max 100 messages at once_`
            );
        }

        const commaIdx  = q.indexOf(',');
        const message   = q.substring(0, commaIdx).trim();
        const countStr  = q.substring(commaIdx + 1).trim();
        const count     = parseInt(countStr);

        if (!message) return reply('❌ *Message cannot be empty!*');

        if (isNaN(count) || count < 1 || count > 100) {
            return reply('❌ *Count must be between 1–100!*');
        }

        for (let i = 0; i < count; i++) {
            await conn.sendMessage(from, { text: message });
            if (i < count - 1) await new Promise(r => setTimeout(r, 500));
        }

    } catch (e) {
        console.error('[MSG-REPEAT ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});
