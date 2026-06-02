const { cmd } = require('../command');

const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Hiruka",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`
        }
    }
};

cmd({
    pattern: "online",
    alias: ["ranuonline", "onlinemembers", "active"],
    desc: "Show online group members",
    category: "group",
    react: "🟢",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, isAdmins, isOwner, fromMe, reply }) => {
    try {

        if (!isGroup) {
            return reply("❌ This command can only be used in groups.");
        }

        if (!isAdmins && !isOwner && !fromMe) {
            return reply("🚫 Admin or Owner only command.");
        }

        await reply("🔍 Scanning online members...");

        const metadata = await conn.groupMetadata(from);
        const onlineUsers = new Set();

        const presenceHandler = (update) => {
            if (!update.presences) return;

            for (const jid in update.presences) {
                const presence = update.presences[jid];

                if (
                    presence.lastKnownPresence === "available" ||
                    presence.lastKnownPresence === "composing" ||
                    presence.lastKnownPresence === "recording"
                ) {
                    onlineUsers.add(jid);
                }
            }
        };

        conn.ev.on("presence.update", presenceHandler);

        // Subscribe all members
        for (const member of metadata.participants) {
            try {
                await conn.presenceSubscribe(member.id);
            } catch (e) {}
        }

        // Wait 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));

        conn.ev.off("presence.update", presenceHandler);

        if (onlineUsers.size < 1) {
            return reply(
                "⚠️ No online members detected.\n\nWhatsApp privacy settings may hide presence."
            );
        }

        const users = [...onlineUsers];

        let text = `🟢 *ONLINE MEMBERS*\n`;
        text += `👥 ${users.length}/${metadata.participants.length}\n\n`;

        users.forEach((jid, i) => {
            text += `${i + 1}. @${jid.split("@")[0]}\n`;
        });

        text += `\n> © SHAVIYA-XMD V2`;

        await conn.sendMessage(
            from,
            {
                text,
                mentions: users
            },
            {
                quoted: fakevCard
            }
        );

    } catch (err) {
        console.error(err);
        reply(`❌ Error:\n${err.message}`);
    }
});
