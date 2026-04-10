const { cmd } = require("../command");
const axios = require("axios");
const sharp = require("sharp");

// ───────── CONFIGURATION ─────────
const API_KEY = "darkshan-75704c1b"; // Your Sayura Search API Key
const FOOTER = "✫☘ 𝐇𝐚𝐬𝐢𝐲𝐚-𝐌𝐃 𝐗𝐇𝐀𝐌𝐒𝐓𝐄𝐑 ☘";

/**
 * Thumbnail එකක් සාදා Buffer එකක් ලෙස ලබාදීම
 */
async function makeThumbnail(url) {
    try {
        if (!url) return null;
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        return null;
    }
}

/**
 * Multi-Reply Smart Waiter (Infinity Reply Logic)
 */
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");

            // අංකයක් ද යන්න පරීක්ෂා කිරීම
            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text)) {
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        // විනාඩි 10ක් යනකම් රිප්ලයි බලාපොරොත්තු වේ
        setTimeout(() => { 
            conn.ev.off("messages.upsert", handler); 
            resolve(null);
        }, 600000); 
    });
}

cmd(
  {
    pattern: "xhamster",
    alias: ["xh", "xhdl"],
    react: "🔞",
    desc: "xHamster Downloader with Infinity Reply Support",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender }) => {
    try {
      let query = q ? q.trim() : "";
      if (!query) return reply("❌ Please provide a link or search query.");

      // --- කෙලින්ම ලින්ක් එකක් ලබාදුන් විට ---
      if (query.includes("xhamster.com")) {
          return await handleDownload(bot, from, query, "xHamster Video", null, mek);
      }

      // --- 1. සෙවුම් ප්‍රතිඵල ලබාගැනීම (Search) ---
      const searchRes = await axios.get(`https://sayuradark-api-two.vercel.app/api/other/xhamster/search?apikey=${API_KEY}&q=${encodeURIComponent(query)}`);
      const results = searchRes.data?.result;
      
      if (!results || results.length === 0) return reply("❌ No results found on xHamster.");

      let listText = "🔞 *𝐇𝐀𝐒𝐈𝐘𝐀-𝐌𝐃 𝐗𝐇𝐀𝐌𝐒𝐓𝐄𝐑*\n\n";
      results.slice(0, 10).forEach((v, i) => { 
          listText += `*${i + 1}.* ${v.title}\n\n`; 
      });
      
      const sentSearch = await bot.sendMessage(from, { 
          text: listText + `අංකය Reply කර වීඩියෝව ලබාගන්න.\n\n*(ඔබට අවශ්‍ය අංක එකින් එක Reply කර ඕනෑම වීඩියෝ ප්‍රමාණයක් ලබාගත හැක)*` 
      }, { quoted: mek });

      // --- INFINITY REPLY LOOP ---
      // යූසර් මැසේජ් එකට රිප්ලයි කරන සෑම වතාවකම ක්‍රියාත්මක වේ.
      const startFlow = async () => {
          while (true) {
              const selection = await waitForReply(bot, from, sender, sentSearch.key.id);
              
              if (!selection) break; // කාලය ඉකුත් වූ පසු නතර වේ.

              const idx = parseInt(selection.text) - 1;
              const selected = results[idx];

              if (selected) {
                  // වීඩියෝව ඩවුන්ලෝඩ් කර යැවීම (Background එකේ සිදුවේ)
                  handleDownload(bot, from, selected.url, selected.title, selected.thumbnail, selection.msg);
              } else {
                  bot.sendMessage(from, { text: "❌ Invalid number. Please select between 1-10." }, { quoted: selection.msg });
              }
          }
      };

      startFlow();

    } catch (err) {
      console.error(err);
      reply(`❌ Error: ${err.message}`);
    }

    /**
     * ඩවුන්ලෝඩ් කර යැවීමේ ප්‍රධාන ශ්‍රිතය
     */
    async function handleDownload(conn, from, videoUrl, videoTitle, thumbUrl, quotedMek) {
      try {
        await conn.sendMessage(from, { react: { text: "⏳", key: quotedMek.key } });
        
        // --- API එකෙන් ඩවුන්ලෝඩ් ලින්ක් ලබාගැනීම ---
        const dlRes = await axios.get(`https://api.xte.web.id/v1/download/xv?url=${encodeURIComponent(videoUrl)}`);
        
        if (!dlRes.data.status || !dlRes.data.result) {
            return conn.sendMessage(from, { text: "❌ API Error: Could not fetch download link." }, { quoted: quotedMek });
        }

        const data = dlRes.data.result;
        // JSON structure එකට අනුව පළමු ලින්ක් එක ලබාගනී
        const dlLink = data.links && data.links.length > 0 ? data.links[0].url : null;
        const finalTitle = data.title || videoTitle;
        const finalThumb = data.thumbnail || thumbUrl;

        if (!dlLink) return conn.sendMessage(from, { text: "❌ Download link not found." }, { quoted: quotedMek });

        await conn.sendMessage(from, { react: { text: "📥", key: quotedMek.key } });

        // Thumbnail එක සකසා ගැනීම
        const docThumb = await makeThumbnail(finalThumb);

        // --- වීඩියෝව Document එකක් ලෙස යැවීම (Quality ආරක්ෂා වේ) ---
        await conn.sendMessage(from, {
            document: { url: dlLink },
            mimetype: "video/mp4",
            fileName: `${finalTitle.replace(/[<>:"/\\|?*]/g, "")}.mp4`,
            jpegThumbnail: docThumb,
            caption: `✅ *Download complete*\n🎬 *Title:* ${finalTitle}\n\n${FOOTER}`
        }, { quoted: quotedMek });

        await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });

      } catch (e) {
        console.error(e);
        conn.sendMessage(from, { text: "❌ Error processing download." }, { quoted: quotedMek });
      }
    }
  }
);
