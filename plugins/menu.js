const { cmd } = require("../command");

// ============================================
// CONFIGURATION
// ============================================
const BOT_NAME = "SHAVIYA-XMD";
const VERSION = "V2.0";
const YEAR = "2026";
const POSTER_URL = "https://files.catbox.moe/f18ceb.jpg";

// Random emoji reactions
const reactions = ["👑","💎","🔥","⚡","🌟","✨","🎬","🚀","💫","🎭","🏆","🎯","💠","🌈","🎪","⚜️","🔱","💎","⭐","🌙"];
const randomReact = () => reactions[Math.floor(Math.random() * reactions.length)];

// ============================================
// MENU DATA - ORGANIZED BY CATEGORY
// ============================================

const MENUS = {
    main: {
        title: "Sʜᴀᴠɪʏᴀ-Xᴍᴅ V2 ",
        icon: "👑"
    },
    
    download: {
        name: "📥 DOWNLOAD MENU",
        icon: "📥",
        commands: [
            { cmd: ".song", alias: "audio, play", desc: "YouTube Song Download" },
            { cmd: ".video", alias: "ytv, ytdown", desc: "YouTube Video Download" },
            { cmd: ".tiktok", alias: "tt, ttdl", desc: "TikTok Download" },
            { cmd: ".fb", alias: "fbdl, facebook", desc: "Facebook Download" },
            { cmd: ".instagram", alias: "ig, insta", desc: "Instagram Download" },
            { cmd: ".twitter", alias: "twt, x", desc: "Twitter/X Download" },
            { cmd: ".apk", alias: "android, af", desc: "APK Download" },
            { cmd: ".gdrive", alias: "gd", desc: "Google Drive Download" },
            { cmd: ".mega", alias: "mega", desc: "Mega Download" },
            { cmd: ".download", alias: "downurl", desc: "Universal Download" },
            { cmd: ".ud", alias: "usersdrive, udrive", desc: "UsersDrive Download" },
            { cmd: ".upload", alias: "tourl, catbox", desc: "Media to URL Upload" },
            { cmd: ".mediafire", alias: "mf", desc: "MediaFire Files And All Download" },
            { cmd: ".imgbb", alias: "img2url, uploadimg", desc: "Image to ImgBB URL" }
        ]
    },
    
    movie: {
        name: "🎬 MOVIE HUB MENU",
        icon: "🎬",
        commands: [
            { cmd: ".movie", alias: "cinetv, cinesubz", desc: "Main Movie Download" },
            { cmd: ".pirate", alias: "piratebay", desc: "Pirate Movies" },
            { cmd: ".piratelk", alias: "plk", desc: "PirateLK Movies" },
            { cmd: ".dinka", alias: "dk, movie1", desc: "Dinka Movies" },
            { cmd: ".sinhalasub", alias: "ss", desc: "Sinhala Sub Movies" },
            { cmd: ".moviesub", alias: "ms, submovie", desc: "MovieSub" },
            { cmd: ".moviesublk", alias: "msub", desc: "MovieSubLK" },
            { cmd: ".pupilmv", alias: "pupil", desc: "PupilMV" },
            { cmd: ".baiscope", alias: "bs", desc: "Baiscope Movies" },
            { cmd: ".lakvision", alias: "laktv, lk", desc: "LakVision TV" },
            { cmd: ".sayura", alias: "sc, movie8", desc: "Sayura Cinema" },
            { cmd: ".anime", alias: "ac2, anime2", desc: "SL Anime Club" },
            { cmd: ".cinejid", alias: "cinegroup", desc: "Cine Group JID" }
        ]
    },
    
    ai: {
        name: "🤖 AI & TOOLS MENU",
        icon: "🤖",
        commands: [
            { cmd: ".ai", alias: "ask, gpt, chatgpt", desc: "AI Assistant (Multi-API)" },
            { cmd: ".copilot", alias: "cop, ai2", desc: "Microsoft Copilot AI" },
            { cmd: ".poem", alias: "kaviya, kavi", desc: "AI Poem Generator 📜" },
            { cmd: ".story", alias: "aistory, tale", desc: "AI Story Generator 📖" },
            { cmd: ".meme", alias: "makememe, memegen", desc: "Meme Generator 😂" },
            { cmd: ".randmeme", alias: "rm", desc: "Random Reddit Meme 🎲" },
            { cmd: ".fakechat", alias: "fc, fakewhatsapp", desc: "Fake Chat Screenshot 💬" },
            { cmd: ".text2img", alias: "genimg, imagine", desc: "Text to Image" },
            { cmd: ".sss", alias: "screenshot, webshot", desc: "Website Screenshot 📸" },
            { cmd: ".ocr", alias: "readtext, img2text", desc: "Image to Text (OCR) 🔤" },
            { cmd: ".stt", alias: "voice2text, transcribe", desc: "Voice Note to Text 🎙️" },
            { cmd: ".qr", alias: "qrcode, genqr", desc: "QR Code Generator 📷" },
            { cmd: ".qrscan", alias: "readqr, scanqr", desc: "QR Code Scanner 🔍" },
            { cmd: ".compress", alias: "comp, compimg", desc: "Image/Video Compressor 🗜️" },
            { cmd: ".cricket", alias: "cric, score", desc: "Live Cricket Scores 🏏" },
            { cmd: ".trt", alias: "translate", desc: "Translate Text" },
            { cmd: ".tts", alias: "text2speech", desc: "Text to Speech v1" },
            { cmd: ".tts2", alias: "tts2", desc: "Text to Speech v2" },
            { cmd: ".tts3", alias: "tts3", desc: "Text to Speech v3" },
            { cmd: ".jid", alias: "getjid", desc: "Get JID" },
            { cmd: ".getpp", alias: "getdp, fullpp", desc: "Get Profile Picture" },
            { cmd: ".vv", alias: "viewonce, retrieve", desc: "View Once Open" },
            { cmd: ".forward", alias: "fw, fwd", desc: "Forward Message" },
            { cmd: ".send", alias: "sendme, save", desc: "Send/Save Status" },
            { cmd: ".creact", alias: "massreact, chr", desc: "Mass React" },
            { cmd: ".v2s", alias: "vtomp3, video2mp3", desc: "Video to MP3" }
        ]
    },
    
    group: {
        name: "👥 GROUP MENU",
        icon: "👥",
        commands: [
            { cmd: ".add", alias: "a, invite", desc: "Add Member" },
            { cmd: ".kick", alias: "remove", desc: "Kick Member" },
            { cmd: ".promote", alias: "setadmin", desc: "Promote to Admin" },
            { cmd: ".demote", alias: "unadmin", desc: "Demote Admin" },
            { cmd: ".admins", alias: "listadmin", desc: "List All Admins" },
            { cmd: ".userinfo", alias: "user, profile", desc: "Member Profile" },
            { cmd: ".tagall", alias: "mentionall, everyone", desc: "Tag All Members" },
            { cmd: ".tagadmin", alias: "tagadmins", desc: "Tag All Admins" },
            { cmd: ".hidetag", alias: "hidetag", desc: "Silent Tag All" },
            { cmd: ".mute", alias: "mute", desc: "Mute Group" },
            { cmd: ".unmute", alias: "unmute", desc: "Unmute Group" },
            { cmd: ".lock", alias: "lock", desc: "Lock Group" },
            { cmd: ".unlock", alias: "unlock", desc: "Unlock Group" },
            { cmd: ".gname", alias: "setname", desc: "Change Group Name" },
            { cmd: ".groupdesc", alias: "setdesc", desc: "Change Description" },
            { cmd: ".groupinfo", alias: "ginfo", desc: "Group Info" },
            { cmd: ".grouplink", alias: "getlink", desc: "Get Invite Link" },
            { cmd: ".getpic", alias: "grouppp", desc: "Group Profile Pic" },
            { cmd: ".poll", alias: "poll", desc: "Create Poll" },
            { cmd: ".del", alias: "delete", desc: "Delete Message" },
            { cmd: ".setwelcome", alias: "setwelcome", desc: "Set Welcome Msg" },
            { cmd: ".setgoodbye", alias: "setgoodbye", desc: "Set Goodbye Msg" }
        ]
    },
    
    settings: {
        name: "⚙️ SETTINGS MENU",
        icon: "⚙️",
        commands: [
            { cmd: ".setname", alias: "setbotname, footer", desc: "Set Bot Name" },
            { cmd: ".setthumb", alias: "thumburl", desc: "Set Thumbnail URL" },
            { cmd: ".setprefix", alias: "docprefix", desc: "Set Caption Prefix" },
            { cmd: ".setfilepre", alias: "filenamepre", desc: "Set File Name Prefix" },
            { cmd: ".moviedoc", alias: "posterthumb", desc: "Movie Poster as Thumb" },
            { cmd: ".antidelete", alias: "antidel", desc: "Anti Delete Messages" },
            { cmd: ".button", alias: "btnmode", desc: "Button Mode Toggle" },
            { cmd: ".moviesettings", alias: "msettings", desc: "View Movie Settings" }
        ]
    },
    
    access: {
        name: "💎 ACCESS CONTROL",
        icon: "💎",
        commands: [
            { cmd: ".setmode", alias: "mode", desc: "Set Bot Mode (public/private)" },
            { cmd: ".mymode", alias: "botmode", desc: "Check Current Mode" },
            { cmd: ".addpremium", alias: "ap", desc: "Add Premium User" },
            { cmd: ".removepremium", alias: "rp, delpremium", desc: "Remove Premium" },
            { cmd: ".premiumlist", alias: "plist", desc: "List Premium Users" },
            { cmd: ".addsudo", alias: "setsudo, sudoadd", desc: "Add Sudo User" },
            { cmd: ".removesudo", alias: "delsudo, unsudo", desc: "Remove Sudo" },
            { cmd: ".sudolist", alias: "listsudo, sudo", desc: "List Sudo Users" },
            { cmd: ".mysudo", alias: "sudostatus", desc: "My Sudo Status" }
        ]
    },
    
    owner: {
        name: "👑 OWNER MENU",
        icon: "👑",
        commands: [
            { cmd: ".owner", alias: "ownerinfo", desc: "Owner Information" },
            { cmd: ".block", alias: "block", desc: "Block User" },
            { cmd: ".unblock", alias: "unblock", desc: "Unblock User" },
            { cmd: ".pair", alias: "code, login", desc: "Get Session Code" },
            { cmd: ".restart", alias: "reboot, rst", desc: "Restart Bot" },
            { cmd: ".broadcast", alias: "bc", desc: "Broadcast Message" },
            { cmd: ".join", alias: "joingroup", desc: "Join Group via Link" },
            { cmd: ".leave", alias: "leavegroup", desc: "Leave Group" }
        ]
    },
    
    system: {
        name: "⚡ SYSTEM MENU",
        icon: "⚡",
        commands: [
            { cmd: ".alive", alias: "alive", desc: "Bot Alive Check" },
            { cmd: ".ping", alias: "ping", desc: "Bot Ping v1" },
            { cmd: ".ping2", alias: "ping2", desc: "Bot Ping v2" },
            { cmd: ".system", alias: "status, botinfo", desc: "System Stats" },
            { cmd: ".menu", alias: "panel, help", desc: "Show This Menu" },
            { cmd: ".support", alias: "support", desc: "Support Group Link" },
            { cmd: ".donate", alias: "donate", desc: "Donation Information" }
        ]
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format menu content with proper WhatsApp limits
 * WhatsApp message limit: ~4096 characters per message
 */
function formatMenuContent(title, commands, icon, userName, footer) {
    let content = `╔══════════════════════════════╗\n`;
    content += `▌  ${icon} *${title}* ${icon}  ▐\n`;
    content += `╚══════════════════════════════╝\n\n`;
    content += `👤 *User:* ${userName}\n`;
    content += `🤖 *Bot:* ${BOT_NAME} ${VERSION}\n`;
    content += `⚡ *Status:* Online ✅\n\n`;
    content += `┌─⊷ *COMMANDS LIST*\n`;
    
    for (const cmd of commands) {
        content += `│\n`;
        content += `│ 🔹 *${cmd.cmd}*\n`;
        content += `│    ↳ ${cmd.alias}\n`;
        content += `│    📝 ${cmd.desc}\n`;
    }
    
    content += `│\n`;
    content += `└──────────────────────────────\n\n`;
    content += `${footer}\n`;
    content += `> ✨ *${BOT_NAME} · PREMIUM EDITION*`;
    
    return content;
}

/**
 * Create main menu (optimized for WhatsApp)
 */
function createMainMenu(userName) {
    const menuItems = [
        { num: "1", icon: "📥", name: "DOWNLOAD MENU" },
        { num: "2", icon: "🎬", name: "MOVIE HUB MENU" },
        { num: "3", icon: "🤖", name: "AI & TOOLS MENU" },
        { num: "4", icon: "👥", name: "GROUP MENU" },
        { num: "5", icon: "⚙️", name: "SETTINGS MENU" },
        { num: "6", icon: "💎", name: "ACCESS CONTROL" },
        { num: "7", icon: "👑", name: "OWNER MENU" },
        { num: "8", icon: "⚡", name: "SYSTEM MENU" }
    ];
    
    let menu = `╔══════════════════════════════╗\n`;
    menu += `▌  👑 *${BOT_NAME} ${VERSION}* 👑  ▐\n`;
    menu += `╚══════════════════════════════╝\n\n`;
    menu += `┌─⊷ *USER INFORMATION*\n`;
    menu += `│ 👤 *Name:* ${userName}\n`;
    menu += `│ 🤖 *Bot:* ${BOT_NAME}\n`;
    menu += `│ 🧩 *Prefix:* [ . ]\n`;
    menu += `│ 💎 *Version:* ${VERSION} · ${YEAR}\n`;
    menu += `│ ⚡ *Status:* Online ✅\n`;
    menu += `└──────────────────────────────\n\n`;
    menu += `┌─⊷ *SELECT CATEGORY*\n`;
    
    for (const item of menuItems) {
        menu += `│\n`;
        menu += `│ ${item.num}. ${item.icon} *${item.name}*\n`;
    }
    
    menu += `│\n`;
    menu += `└──────────────────────────────\n\n`;
    menu += `💡 *Reply with number (1 - 8)*\n`;
    menu += `⏳ *Menu expires in 5 minutes*\n\n`;
    menu += `> ✨ *${BOT_NAME} · PREMIUM EDITION*`;
    
    return menu;
}

// ============================================
// MAIN MENU COMMAND
// ============================================

cmd({
    pattern: "menu",
    alias: ["panel", "help", "commands", "cmds"],
    desc: "Show interactive premium menu",
    category: "main",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, pushname, reply }) => {
    try {
        const userName = m.pushName || pushname || "User";
        
        // Auto react to menu command
        await conn.sendMessage(from, {
            react: { text: randomReact(), key: mek.key }
        });

        const mainMenu = createMainMenu(userName);
        
        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: 'shavi',
                newsletterName: `${BOT_NAME} ${VERSION} PREMIUM`,
                serverMessageId: 143
            }
        };

        const fakeVCard = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: `👑 ${BOT_NAME} ${VERSION} PREMIUM`,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME} ${VERSION}\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
                }
            }
        };

        // Send main menu with image
        let sentMsg;
        try {
            sentMsg = await conn.sendMessage(from, {
                image: { url: POSTER_URL },
                caption: mainMenu,
                contextInfo: contextInfo
            }, { quoted: fakeVCard });
        } catch (e) {
            sentMsg = await conn.sendMessage(from, {
                text: mainMenu,
                contextInfo: contextInfo
            }, { quoted: fakeVCard });
        }

        const messageID = sentMsg.key.id;

        // ============================================
        // REPLY HANDLER FOR SUB-MENUS
        // ============================================
        
        const handler = async (msgData) => {
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

                const isReplyToMenu = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;
                if (!isReplyToMenu) return;

                const receivedText = (
                    receivedMsg.message.conversation ||
                    receivedMsg.message.extendedTextMessage?.text || ""
                ).trim();

                const senderID = receivedMsg.key.remoteJid;
                
                // Auto react
                await conn.sendMessage(senderID, {
                    react: { text: randomReact(), key: receivedMsg.key }
                });

                // Handle menu selection
                let subMenuContent = null;
                let subMenuTitle = "";
                let subMenuIcon = "";
                let subMenuCommands = [];

                switch(receivedText) {
                    case "1":
                        subMenuTitle = MENUS.download.name;
                        subMenuIcon = MENUS.download.icon;
                        subMenuCommands = MENUS.download.commands;
                        break;
                    case "2":
                        subMenuTitle = MENUS.movie.name;
                        subMenuIcon = MENUS.movie.icon;
                        subMenuCommands = MENUS.movie.commands;
                        break;
                    case "3":
                        subMenuTitle = MENUS.ai.name;
                        subMenuIcon = MENUS.ai.icon;
                        subMenuCommands = MENUS.ai.commands;
                        break;
                    case "4":
                        subMenuTitle = MENUS.group.name;
                        subMenuIcon = MENUS.group.icon;
                        subMenuCommands = MENUS.group.commands;
                        break;
                    case "5":
                        subMenuTitle = MENUS.settings.name;
                        subMenuIcon = MENUS.settings.icon;
                        subMenuCommands = MENUS.settings.commands;
                        break;
                    case "6":
                        subMenuTitle = MENUS.access.name;
                        subMenuIcon = MENUS.access.icon;
                        subMenuCommands = MENUS.access.commands;
                        break;
                    case "7":
                        subMenuTitle = MENUS.owner.name;
                        subMenuIcon = MENUS.owner.icon;
                        subMenuCommands = MENUS.owner.commands;
                        break;
                    case "8":
                        subMenuTitle = MENUS.system.name;
                        subMenuIcon = MENUS.system.icon;
                        subMenuCommands = MENUS.system.commands;
                        break;
                    default:
                        // Invalid selection - show error
                        const errorMenu = `╔══════════════════════════════╗\n`;
                        const errorMenu2 = `▌  ❌ *INVALID OPTION* ❌  ▐\n`;
                        const errorMenu3 = `╚══════════════════════════════╝\n\n`;
                        const errorMenu4 = `*Please reply with a number 1 - 8*\n\n`;
                        const errorMenu5 = `1️⃣ 📥 Download Menu\n2️⃣ 🎬 Movie Hub Menu\n3️⃣ 🤖 AI & Tools Menu\n4️⃣ 👥 Group Menu\n5️⃣ ⚙️ Settings Menu\n6️⃣ 💎 Access Control\n7️⃣ 👑 Owner Menu\n8️⃣ ⚡ System Menu\n\n`;
                        const errorMenu6 = `> ✨ *${BOT_NAME} · PREMIUM EDITION*`;
                        
                        await conn.sendMessage(senderID, {
                            text: errorMenu + errorMenu2 + errorMenu3 + errorMenu4 + errorMenu5 + errorMenu6,
                            contextInfo: contextInfo
                        }, { quoted: fakeVCard });
                        return;
                }

                // Format and send sub-menu
                if (subMenuCommands.length > 0) {
                    const footer = `💡 *Commands are case-sensitive*\n📝 *Use with prefix: .*\n⏱️ *Menu timeout: 5 minutes*`;
                    const subMenu = formatMenuContent(subMenuTitle, subMenuCommands, subMenuIcon, userName, footer);
                    
                    // Split if too long (WhatsApp limit ~4096 chars)
                    if (subMenu.length > 4000) {
                        const chunks = [];
                        let currentChunk = "";
                        const lines = subMenu.split('\n');
                        
                        for (const line of lines) {
                            if ((currentChunk + line + '\n').length > 3800) {
                                chunks.push(currentChunk);
                                currentChunk = line + '\n';
                            } else {
                                currentChunk += line + '\n';
                            }
                        }
                        if (currentChunk) chunks.push(currentChunk);
                        
                        for (let i = 0; i < chunks.length; i++) {
                            const chunkText = chunks[i] + (i < chunks.length - 1 ? `\n\n📄 *Page ${i + 1}/${chunks.length}*` : "");
                            try {
                                await conn.sendMessage(senderID, {
                                    image: { url: POSTER_URL },
                                    caption: chunkText,
                                    contextInfo: contextInfo
                                }, { quoted: fakeVCard });
                            } catch (e) {
                                await conn.sendMessage(senderID, {
                                    text: chunkText,
                                    contextInfo: contextInfo
                                }, { quoted: fakeVCard });
                            }
                        }
                    } else {
                        try {
                            await conn.sendMessage(senderID, {
                                image: { url: POSTER_URL },
                                caption: subMenu,
                                contextInfo: contextInfo
                            }, { quoted: fakeVCard });
                        } catch (e) {
                            await conn.sendMessage(senderID, {
                                text: subMenu,
                                contextInfo: contextInfo
                            }, { quoted: fakeVCard });
                        }
                    }
                }

            } catch (e) {
                console.log('[MENU HANDLER ERROR]:', e);
            }
        };

        conn.ev.on("messages.upsert", handler);
        
        // Auto remove listener after 5 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
        }, 300000);

    } catch (e) {
        console.error('[MENU ERROR]:', e);
        reply("❌ Menu display error. Please try again later.");
    }
});

// ============================================
// QUICK MENU COMMANDS
// ============================================

cmd({
    pattern: "downloadmenu",
    alias: ["dlmenu", "dmenu"],
    desc: "Show download menu",
    category: "main",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    const userName = m.pushName || pushname || "User";
    const footer = `💡 *Use commands with prefix .*\n🎯 *Quick access to downloads*`;
    const menu = formatMenuContent(MENUS.download.name, MENUS.download.commands, MENUS.download.icon, userName, footer);
    
    try {
        await conn.sendMessage(from, {
            image: { url: POSTER_URL },
            caption: menu
        }, { quoted: m });
    } catch (e) {
        await reply(menu);
    }
});

cmd({
    pattern: "moviemenu",
    alias: ["movmenu", "mmenu"],
    desc: "Show movie hub menu",
    category: "main",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    const userName = m.pushName || pushname || "User";
    const footer = `🎬 *All movie sites in one place*\n📝 *Type .movie <name> to search*`;
    const menu = formatMenuContent(MENUS.movie.name, MENUS.movie.commands, MENUS.movie.icon, userName, footer);
    
    try {
        await conn.sendMessage(from, {
            image: { url: POSTER_URL },
            caption: menu
        }, { quoted: m });
    } catch (e) {
        await reply(menu);
    }
});

cmd({
    pattern: "groupmenu",
    alias: ["gmenu", "groupcmd"],
    desc: "Show group management menu",
    category: "main",
    react: "👥",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    const userName = m.pushName || pushname || "User";
    const footer = `👥 *Group management commands*\n⚠️ *Admin privileges required for some commands*`;
    const menu = formatMenuContent(MENUS.group.name, MENUS.group.commands, MENUS.group.icon, userName, footer);
    
    try {
        await conn.sendMessage(from, {
            image: { url: POSTER_URL },
            caption: menu
        }, { quoted: m });
    } catch (e) {
        await reply(menu);
    }
});

cmd({
    pattern: "toolsmenu",
    alias: ["toolmenu", "aimenu"],
    desc: "Show AI & tools menu",
    category: "main",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    const userName = m.pushName || pushname || "User";
    const footer = `🤖 *AI powered tools*\n✨ *Try .ai <question> or .text2img <prompt>*`;
    const menu = formatMenuContent(MENUS.ai.name, MENUS.ai.commands, MENUS.ai.icon, userName, footer);
    
    try {
        await conn.sendMessage(from, {
            image: { url: POSTER_URL },
            caption: menu
        }, { quoted: m });
    } catch (e) {
        await reply(menu);
    }
});

// ============================================
// BOT INFO & SYSTEM COMMANDS
// ============================================

cmd({
    pattern: "system",
    alias: ["status", "botinfo", "info"],
    desc: "Show bot system information",
    category: "main",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const memoryUsage = process.memoryUsage();
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    
    const systemInfo = `╔══════════════════════════════╗\n`;
    systemInfo += `▌  ⚡ *SYSTEM INFORMATION* ⚡  ▐\n`;
    systemInfo += `╚══════════════════════════════╝\n\n`;
    systemInfo += `┌─⊷ *BOT DETAILS*\n`;
    systemInfo += `│ 🤖 *Name:* ${BOT_NAME}\n`;
    systemInfo += `│ 📦 *Version:* ${VERSION}\n`;
    systemInfo += `│ 🧩 *Prefix:* .\n`;
    systemInfo += `│ ⚡ *Status:* Online ✅\n`;
    systemInfo += `└──────────────────────────────\n\n`;
    systemInfo += `┌─⊷ *UPTIME*\n`;
    systemInfo += `│ ⏱️ ${days}d ${hours}h ${minutes}m ${seconds}s\n`;
    systemInfo += `└──────────────────────────────\n\n`;
    systemInfo += `┌─⊷ *MEMORY USAGE*\n`;
    systemInfo += `│ 💾 Heap: ${heapUsed}MB / ${heapTotal}MB\n`;
    systemInfo += `└──────────────────────────────\n\n`;
    systemInfo += `> ✨ *${BOT_NAME} · PREMIUM EDITION*`;
    
    reply(systemInfo);
});

cmd({
    pattern: "alive",
    alias: ["ping", "check"],
    desc: "Check if bot is alive",
    category: "main",
    react: "💚",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const start = Date.now();
    await reply("🟢 *Bot is Alive!*");
    const end = Date.now();
    const responseTime = end - start;
    
    await conn.sendMessage(from, {
        text: `✅ *${BOT_NAME} is Online!*\n\n⚡ *Response Time:* ${responseTime}ms\n💫 *SHAVIYA-XMD*`
    });
});

cmd({
    pattern: "support",
    alias: ["group", "gc"],
    desc: "Get support group link",
    category: "main",
    react: "💬",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const supportMsg = `💬 *SUPPORT GROUP*\n\n` +
                       `Join our official support group for:\n` +
                       `• Bot updates\n` +
                       `• Help & support\n` +
                       `• Feature requests\n\n` +
                       `🔗 *Link:* https://chat.whatsapp.com/YourSupportLink\n\n` +
                       `> ✨ *${BOT_NAME} · PREMIUM EDITION*`;
    reply(supportMsg);
});

cmd({
    pattern: "donate",
    alias: ["supportme", "coffee"],
    desc: "Support the developer",
    category: "main",
    react: "☕",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const donateMsg = `☕ *SUPPORT THE DEVELOPER*\n\n` +
                      `If you enjoy using ${BOT_NAME}, consider supporting:\n\n` +
                      `💎 *Donation Methods:*\n` +
                      `   • PayPal: @shaviya\n` +
                      `   • UPI: shaviya@okhdfcbank\n` +
                      `   • Crypto: BTC/ETH/USDT\n\n` +
                      `✨ Your support keeps the bot alive!\n\n` +
                      `> 💫 *${BOT_NAME} · PREMIUM EDITION*`;
    reply(donateMsg);
});
