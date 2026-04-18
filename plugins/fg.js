const axios = require('axios');
const { cmd, commands } = require('../command')
const config = require('../config')


const siteUrl = "api-web-shadow-v1.vercel.app";
const shaviya_footer = "> 𝙎𝙃𝘼𝙑𝙄𝙔𝘼-𝙓𝙈𝘿 ⚜️"

cmd({
    pattern: "fitgirl",
    alias: ['fg'],
    desc: "Search and download pcgames.",
    react: "🌪️",
    category: "download",
    use: '.fitgirl <GAME NAME>',
    filename: __filename
}, async (conn, mek, m, {from, reply, q}) => {
  
  const react = async (msgKey, emoji) => {
        try {
            await conn.sendMessage(from, { react: { text: emoji, key: msgKey } });
        } catch (reactE) {
            await reply("❌ React send error: " + reactE.message);
            console.log("❌ React send error: " + reactE.message);
        }
    }
  
  try {
   const {data} = await axios.get( siteUrl + '/api/pcgame/fitgirl/search?query=' + encodeURIComponent(q));
   
   let list = "❏  \` ꜱʜᴀᴅᴏᴡ ᴍᴏᴠɪᴇ x ᴵᴺᶜ 🔥 Ｆɪᴛ Ｇɪʀʟ Ｐᴄ Ｇᴀᴍᴇꜱ Ｓᴇᴀʀᴄʜ\`*\n\n*❏ \`ʀᴇᴘʟʏ ɴᴜᴍʙᴇʀꜱ\` ☭*\n\n";
   data.result.forEach((m, i) => { 
      list += `*${i + 1} | | ${m.title}*\n`
   });
   
   const listMsg = await conn.sendMessage(from, { text: list + shaviya_footer }, {quoted: mek});
   const listMsgId = listMsg.key.id;
   
   const handler = async (update) => {
     const msg = update?.messages?.[0];
     if (!msg?.message) return;
     const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
     const isReplyToList = msg?.message?.extendedTextMessage?.contextInfo?.stanzaId === listMsgId && msg.key.remoteJid === from;
     if (!isReplyToList) return;
     const index = parseInt(text.trim()) - 1;
     if (isNaN(index) || index < 0 || index >= data.result.length) return reply("*❌ Invalid number please enter to list 👆*"
             );
             
     await react(msg.key, '✅');
     const chosen = data.result[index];
     
     const respa = await axios.get(`${siteUrl}/api/pcgame/fitgirl/info?url=${encodeURIComponent(chosen.link)}`)
     const response = respa.data;
     
     let partslist = "";
     response.result.parts.forEach((qua, q) => { 
      partslist += `*${q + 1} | | ${qua.name}*\n`
     });
     
     const partsSend = await conn.sendMessage(from, {
      image: {url: response.result.image},
      caption: `Title: ${response.result.title}\nCompanies: ${response.result.companies}\nLanguages: ${response.result.languages}\nOriginal size: ${response.result.original_size}\n\nＲeply Ｂelow Ｎumber Ｔo Ｄownload Ｇame part 👀\n\n${partslist}\n\n${shaviya_footer}`
     }, {quoted: mek});
     const partsMsgId = partsSend.key.id;
     
     const partsHandler = async(tUpdate) => {
       const tMsg = tUpdate?.messages?.[0];
       if (!tMsg?.message) return;
       const tText = tMsg.message?.conversation || tMsg.message?.extendedTextMessage?.text;
       const isReplyToType = tMsg?.message?.extendedTextMessage?.contextInfo?.stanzaId === partsMsgId && tMsg.key.remoteJid === from;
       if (!isReplyToType) return;
              
       const tIndex = parseInt(tText.trim()) - 1;
       if (isNaN(tIndex) || tIndex < 0 || tIndex >= response.result.parts.length) return reply("❌ Invalid number please enter valid number.");
       await react(tMsg.key, '✅'); 
       
       const parts_chosen = response.result.parts[tIndex];
       
       await conn.sendMessage(from, {
        document: { url: parts_chosen.directLink },
        mimetype: 'application/vnd.rar',
        fileName: parts_chosen.filename
       }, { quoted: mek });
       
       conn.ev.off("messages.upsert", partsHandler);  
       conn.ev.off("messages.upsert", handler);
     }
     conn.ev.on("messages.upsert", partsHandler);
   }
   conn.ev.on("messages.upsert", handler);
  } catch (e) {
    console.log("❌ Error: " + e.message);
    return reply("❌ Error: " + e.message)
  }
});
