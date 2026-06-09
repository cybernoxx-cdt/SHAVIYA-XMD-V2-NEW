// ============================================================
//  online.js — SHAVIYA-XMD V2
//  Check who is online in the group
//  Styled to match SHAVIYA-XMD menu.js style
//  © Mr Savendra
// ============================================================

const { cmd } = require('../command');

const OWNER_NUM = '94707085822';

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD\nORG:SHAVIYA BOT;\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUM}:+${OWNER_NUM}\nEND:VCARD`
        }
    }
};

const CTX = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '@newsletter',
        newsletterName: '© Mr Savendra',
        serverMessageId: 143
    }
};

cmd({
    pattern:  'online',
    alias:    ['onlinemembers', 'onlinep', 'activemembers', 'active'],
    desc:     'Check who is online in the group',
    category: 'group',
    react:    '🟢',
    filename: __filename
},
async (conn, mek, m, { from, sender, senderNumber, isOwner, reply }) => {
    try {
        // ── Group check ──
        const isGroup = from.endsWith('@g.us');
        if (!isGroup) return reply('❌ *This command can only be used in a group!*');

        // ── Admin check ──
        let isAdmins = false;
        let groupData;
        try {
            groupData = await conn.groupMetadata(from);
            const admins = groupData.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
            isAdmins = admins.some(id => id.includes(senderNumber));
        } catch (e) {
            return reply('❌ *Failed to fetch group info:* ' + e.message);
        }

        if (!isOwner && !isAdmins) {
            return reply('🚫 *Admins & Owner only command!*');
        }

        // ── Scanning message ── (menu style)
        const scanMsg =
            `╭─── [ *🟢 ᴏɴʟɪɴᴇ sᴄᴀɴɴᴇʀ* ] ────\n` +
            `│ 🔍 *sᴄᴀɴɴɪɴɢ ᴍᴇᴍʙᴇʀs...*\n` +
            `│ ⏳ *ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ 18 sᴇᴄᴏɴᴅs*\n` +
            `│ 👥 *ᴛᴏᴛᴀʟ:* ${groupData.participants.length} ᴍᴇᴍʙᴇʀs\n` +
            `╰──────────────────\n\n` +
            `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ-Xᴍᴅ*`;

        await conn.sendMessage(from, {
            text: scanMsg,
            contextInfo: CTX
        }, { quoted: FakeVCard });

        // ── Subscribe to presence ──
        const participants = groupData.participants.map(p => p.id);
        const onlineMembers = new Set();

        await Promise.allSettled(
            participants.map(id => conn.presenceSubscribe(id))
        );

        // ── Presence listener ──
        const presenceHandler = ({ id, presences }) => {
            for (const jid in presences) {
                const state = presences[jid]?.lastKnownPresence;
                if (['available', 'composing', 'recording'].includes(state)) {
                    onlineMembers.add(jid);
                }
            }
        };

        conn.ev.on('presence.update', presenceHandler);

        // ── Wait 18s ──
        await new Promise(r => setTimeout(r, 18000));
        conn.ev.off('presence.update', presenceHandler);

        // ── Build result ──
        if (onlineMembers.size === 0) {
            const noOneMsg =
                `╭─── [ *🟢 ᴏɴʟɪɴᴇ sᴄᴀɴɴᴇʀ* ] ────\n` +
                `│ ⚠️ *ɴᴏ ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀs ᴅᴇᴛᴇᴄᴛᴇᴅ*\n` +
                `│ 💡 *ᴛʜᴇʏ ᴍᴀʏ ʜᴀᴠᴇ ʜɪᴅᴅᴇɴ ᴘʀᴇsᴇɴᴄᴇ*\n` +
                `╰──────────────────\n\n` +
                `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ-Xᴍᴅ*`;

            return conn.sendMessage(from, {
                text: noOneMsg,
                contextInfo: CTX
            }, { quoted: FakeVCard });
        }

        const onlineArray = Array.from(onlineMembers);

        // Build member list in menu style
        let memberList = '';
        onlineArray.forEach((id, i) => {
            memberList += `│ *${i + 1}.* @${id.split('@')[0]}\n`;
        });

        const resultMsg =
            `╭─── [ *🟢 ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀs* ] ────\n` +
            `│ 👥 *ᴏɴʟɪɴᴇ:* ${onlineArray.length}/${groupData.participants.length}\n` +
            `│ 🏷️ *ɢʀᴏᴜᴘ:* ${groupData.subject || 'Group'}\n` +
            `╰──────────────────\n` +
            `╭─── [ *👤 ᴍᴇᴍʙᴇʀ ʟɪsᴛ* ] ────\n` +
            memberList +
            `╰──────────────────\n\n` +
            `> ⚡ *Prefix:* [ . ] · *${onlineArray.length} ᴏɴʟɪɴᴇ*\n` +
            `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ-Xᴍᴅ*`;

        await conn.sendMessage(from, {
            text:     resultMsg,
            mentions: onlineArray,
            contextInfo: { ...CTX, mentionedJid: onlineArray }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[ONLINE ERROR]', e.message);
        reply(`❌ *Error:* ${e.message}`);
    }
});
