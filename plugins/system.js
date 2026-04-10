const {cmd , commands} = require('../command')
const os = require("os")
const {runtime} = require('../lib/functions')

cmd({
    pattern: "system",
    alias: ["status","botinfo"],
    desc: "check up time",
    category: "main",
    react: "📟",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{

let status =`
 ┏━━━━━━━━━━━━━━━━━━━━━┓
┃       ⚡ SYSTEM INFO ⚡
┗━━━━━━━━━━━━━━━━━━━━━┛

⏳ *Uptime*       : ${runtime(process.uptime())}
📟 *RAM Usage*    : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
🖥️ *Host Name*    : ${os.hostname()}
👨‍💻 *Owner*      : SHAVIYA TECH 💎
🧬 *Version*      : 2.0.0

┏━━━━━━━━━━━━━━━━━━━━━┓
┃  © POWERED BY SHAVIYA-XMD V2 💎
┗━━━━━━━━━━━━━━━━━━━━━┛
`
return reply(`${status}`)
}catch(e){
console.log(e)
reply(`${e}`)
}
})
