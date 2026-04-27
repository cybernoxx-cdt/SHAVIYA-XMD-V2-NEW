const config = require('../config')
const {cmd , commands} = require('../command')
const os = require("os")
const {runtime} = require('../lib/functions')

cmd({
    pattern: "system",
    react: "🌖",
    alias: ["uptime" ,"runtime"],
    desc: "Check uptime",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, quoted, reply}) => {
    try{
        let status = `
*╭─「 👑 Sʜᴀᴠɪʏᴀ Xᴍᴅ BOT INFO 」─*
*│ 📌 CREATOR : Sʜᴀᴠɪʏᴀ*
*│ 📟 Version: 2.0.0*
*│ 🧬 Uptime: ${runtime(process.uptime())}*
*│ 📈 RAM Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB*
*│ 🕯️ Platform: heroku*
*│ ⚙️ Hostname: ${os.hostname()}*
*╰──────────────●●►*
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ  Sʜᴀᴠɪʏᴀ Xᴍᴅ
`
        await conn.sendMessage(from, { image: { url: config.ALIVE_IMG }, caption: status }, { quoted: mek });
    } catch(e) {
        console.log(e);
        reply(`${e}`);
    }
});
