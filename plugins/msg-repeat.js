// plugins/msg-repeat.js — SHAVIYA-XMD V2 | FULLY FIXED
// ✅ Fix 1: mention repeat — @tag eka repeat වෙනවිට number spam නොවෙනවා
// ✅ Fix 2: group mention — kauru hari mention karala repeat (once per person)
// ✅ Fix 3: delay configurable — spam ban avoid
// ✅ Fix 4: isOwner + isSudo දෙකම allow
// ✅ Fix 5: .mention command — group eke everyone tag repeat

const { cmd } = require('../command');

// ══════════════════════════════════════════════════════════════
//  .msg — text repeat (Owner/Sudo only)
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'msg',
    desc:     'Send a message multiple times (Owner/Sudo only)',
    category: 'owner',
    react:    '🔁',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, isSudo, q }) => {

    // ✅ Fix 4: isOwner OR isSudo
    if (!isOwner && !isSudo) return reply('🚫 *Owner/Sudo only command!*');

    try {
        if (!q || !q.includes(',')) {
            return reply(
                `❌ *Format:* .msg text,count\n` +
                `*Example:* .msg Hello,5\n` +
                `_Max 100 messages_`
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
            // ✅ Fix 3: 800ms delay — spam ban avoid
            if (i < count - 1) await new Promise(r => setTimeout(r, 800));
        }

        await reply(`✅ *Done! Sent ${count} messages.*`);

    } catch (e) {
        console.error('[MSG-REPEAT ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});

// ══════════════════════════════════════════════════════════════
// ✅ Fix 5: .mention — group eke members mention කරලා repeat
// Usage: .mention Hello,3   → "Hello @user1 @user2..." 3 times
// Usage: .mention Hello     → once, everyone mention
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'mention',
    desc:     'Mention all group members with a message (Owner/Sudo only)',
    category: 'owner',
    react:    '📢',
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, isSudo, q, isGroup }) => {

    if (!isOwner && !isSudo) return reply('🚫 *Owner/Sudo only command!*');
    if (!isGroup) return reply('❌ *Group eke විතරයි use කරන්න පුළුවන්.*');

    try {
        // parse: text,count  OR just text
        let message = q || "👋";
        let count   = 1;

        if (q && q.includes(',')) {
            const commaIdx = q.lastIndexOf(',');
            const maybeCount = parseInt(q.substring(commaIdx + 1).trim());
            if (!isNaN(maybeCount) && maybeCount > 0) {
                message = q.substring(0, commaIdx).trim() || "👋";
                count   = Math.min(maybeCount, 10); // mention max 10 times
            }
        }

        // group metadata — member list
        const groupMeta    = await conn.groupMetadata(from);
        const participants = groupMeta.participants.map(p => p.id);

        if (!participants.length) return reply('❌ *Members හමු නොවිණි.*');

        await reply(`✅ *Mentioning ${participants.length} members ×${count}...*`);

        for (let i = 0; i < count; i++) {
            // ✅ Fix 1 & 2: mention array — @number spam නෑ, proper tag
            await conn.sendMessage(from, {
                text: `${message}\n\n` + participants.map(id => `@${id.split('@')[0]}`).join(' '),
                mentions: participants
            });
            if (i < count - 1) await new Promise(r => setTimeout(r, 1500));
        }

        await reply(`✅ *Done! Mentioned ${participants.length} members ×${count}.*`);

    } catch (e) {
        console.error('[MENTION ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});
