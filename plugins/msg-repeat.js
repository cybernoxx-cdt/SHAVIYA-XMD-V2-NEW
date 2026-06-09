// ============================================================
//  msg-repeat.js — SHAVIYA-XMD V2
//  Send a message multiple times (Owner Only)
//  FIXED: isCreator → isOwner (matches what index.js passes)
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
async (conn, mek, m, { from, reply, isOwner, q }) => {
    // ✅ FIX: use isOwner (index.js passes isOwner, NOT isCreator)
    if (!isOwner) return reply('🚫 *Owner only command!*');

    try {
        if (!q || !q.includes(',')) {
            return reply(
                `❌ *Format:* .msg text,count\n` +
                `*Example:* .msg Hello,5\n` +
                `_Max 100 messages at once_`
            );
        }

        const commaIdx = q.lastIndexOf(',');
        const message  = q.substring(0, commaIdx).trim();
        const countStr = q.substring(commaIdx + 1).trim();
        const count    = parseInt(countStr);

        if (!message) return reply('❌ *Message cannot be empty!*');

        if (isNaN(count) || count < 1 || count > 100) {
            return reply('❌ *Count must be between 1–100!*');
        }

        await reply(`✅ *Sending* "${message}" *×${count}...*`);

        for (let i = 0; i < count; i++) {
            await conn.sendMessage(from, { text: message });
            if (i < count - 1) await new Promise(r => setTimeout(r, 500));
        }

        await reply(`✅ *Done! Sent ${count} messages.*`);

    } catch (e) {
        console.error('[MSG-REPEAT ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});
