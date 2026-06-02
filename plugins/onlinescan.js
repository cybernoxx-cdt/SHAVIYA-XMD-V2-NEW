// ============================================================
//  online-scan.js — SHAVIYA-XMD V2
//  ✅ Adapted for SHAVIYA-XMD base
//  🔧 isAdmins/isGroup manually checked (index.js pass නොකරන නිසා)
// ============================================================

const { cmd } = require('../command');

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern:  'online',
    alias:    ['onlinemembers', 'onlinep', 'active', 'whosonline'],
    desc:     'Check who is online in the group',
    category: 'group',
    react:    '🟢',
    filename: __filename
},
async (conn, mek, m, { from, sender, isOwner, reply }) => {
    try {
        // Group check
        if (!from.endsWith('@g.us')) {
            return reply('❌ *මෙම command group ඇතුළෙ පමණයි use කළ හැකි!*');
        }

        // Admin/Owner check — manually fetch group metadata
        const groupMeta = await conn.groupMetadata(from);
        const admins = groupMeta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);

        const isAdmin = admins.includes(sender);

        if (!isOwner && !isAdmin) {
            return reply('🚫 *Owner හෝ Admin විතරක් use කළ හැකිය!*');
        }

        await reply('🔄 *SHAVIYA-XMD Scanning online members...*\n_15-20 seconds ගත වේ._');

        const onlineMembers = new Set();
        const participants  = groupMeta.participants;

        // Subscribe to all participant presences
        const presencePromises = participants.map(p =>
            conn.presenceSubscribe(p.id)
                .then(() => conn.sendPresenceUpdate('composing', p.id))
                .catch(() => {}) // individual fail ignore
        );
        await Promise.all(presencePromises);

        // Presence update handler
        const presenceHandler = ({ presences }) => {
            for (const id in presences) {
                const state = presences[id]?.lastKnownPresence;
                if (['available', 'composing', 'recording', 'online'].includes(state)) {
                    onlineMembers.add(id);
                }
            }
        };

        conn.ev.on('presence.update', presenceHandler);

        // 3 checks × 5s = 15s scan
        let checksDone = 0;
        const interval = setInterval(async () => {
            checksDone++;
            if (checksDone < 3) return;

            clearInterval(interval);
            conn.ev.off('presence.update', presenceHandler);

            if (onlineMembers.size === 0) {
                return reply('⚠️ *Online members detect කළ නොහැකිවිය.*\n_ඔවුන් presence hide කර ඇති විය හැකිය._');
            }

            const onlineArray = Array.from(onlineMembers);
            const onlineList  = onlineArray
                .map((id, i) => `${i + 1}. @${id.split('@')[0]}`)
                .join('\n');

            const msg =
                `🟢 *Online Members* (${onlineArray.length}/${participants.length})\n\n` +
                `${onlineList}\n\n` +
                `> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮 🔥`;

            await conn.sendMessage(from, {
                text:     msg,
                mentions: onlineArray
            }, { quoted: FakeVCard });

        }, 5000);

    } catch (e) {
        console.error('[ONLINE SCAN ERROR]', e);
        reply(`❌ *Error:* ${e.message}`);
    }
});
