const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

// ── Sʜᴀᴠɪʏᴀ Xᴍᴅ vCard Header ─────────────────────────────
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Sʜᴀᴠɪʏᴀ Xᴍᴅ\nORG:SHAVIYA XMD;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern:  "yt2",
    alias:    ["ytvideo2"],
    react:    "🎬",
    desc:     "Download YouTube videos in multiple qualities",
    category: "download",
    use:      ".video <title or link>",
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {
        // ── 1. Get query ──────────────────────────────────
        let query = q?.trim();

        if (!query && m?.quoted) {
            query =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text ||
                m.quoted.text;
        }

        if (!query) {
            return reply(
                `╔══════════════════════╗\n` +
                `║  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* ⚡  ║\n` +
                `╚══════════════════════╝\n\n` +
                `⚠️ *Usage:* .video <title or YouTube link>\n` +
                `📌 *Example:* .video Believer Imagine Dragons`
            );
        }

        // ── 2. Shorts link → normal link ──────────────────
        if (query.includes("youtube.com/shorts/")) {
            const videoId = query.split("/shorts/")[1].split(/[?&]/)[0];
            query = `https://www.youtube.com/watch?v=${videoId}`;
        }

        // ── 3. Search ─────────────────────────────────────
        await conn.sendMessage(from, {
            react: { text: '🔍', key: mek.key }
        });

        const search = await yts(query);
        if (!search.videos.length) {
            return reply(`❌ *No results found for:* _${query}_`);
        }

        const data   = search.videos[0];
        const ytUrl  = data.url;

        // ── 4. API download links ─────────────────────────
        const formats = {
            "240p":  `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(ytUrl)}&format=video&quality=240p`,
            "360p":  `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(ytUrl)}&format=video&quality=360p`,
            "480p":  `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(ytUrl)}&format=video&quality=480p`,
            "720p":  `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(ytUrl)}&format=video&quality=720p`,
        };

        // ── 5. Send selection menu ────────────────────────
        const caption =
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🎬 *Vɪᴅᴇᴏ*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

🎵 *Title* › ${data.title}
⏱️ *Duration* › ${data.timestamp}
📆 *Uploaded* › ${data.ago}
👁️ *Views* › ${data.views.toLocaleString()}
🔗 *Link* › ${data.url}

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
📌 *Reply with a number to download*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

🎞️ *Video File*
  ┣ *1* › 240p  📱
  ┣ *2* › 360p  📺
  ┣ *3* › 480p  🖥️
  ┗ *4* › 720p  🔥

📂 *Document File*
  ┣ *5* › 240p  📱
  ┣ *6* › 360p  📺
  ┣ *7* › 480p  🖥️
  ┗ *8* › 720p  🔥

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
> ⚡ *Powered by Sʜᴀᴠɪʏᴀ Xᴍᴅ*`;

        const sentMsg = await conn.sendMessage(from, {
            image:   { url: data.thumbnail },
            caption,
        }, { quoted: fakevCard });

        const messageID = sentMsg.key.id;

        // ── 6. Listen for reply ───────────────────────────
        const optionMap = {
            "1": { quality: "240p", isDoc: false },
            "2": { quality: "360p", isDoc: false },
            "3": { quality: "480p", isDoc: false },
            "4": { quality: "720p", isDoc: false },
            "5": { quality: "240p", isDoc: true  },
            "6": { quality: "360p", isDoc: true  },
            "7": { quality: "480p", isDoc: true  },
            "8": { quality: "720p", isDoc: true  },
        };

        const listener = async (msgData) => {
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message) return;

                const receivedText = (
                    receivedMsg.message.conversation ||
                    receivedMsg.message.extendedTextMessage?.text || ''
                ).trim();

                const senderID      = receivedMsg.key.remoteJid;
                const isReplyToBot  =
                    receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToBot || senderID !== from) return;

                const selected = optionMap[receivedText];
                if (!selected) {
                    return conn.sendMessage(senderID, {
                        text: `❌ *Invalid option!* Reply with a number between *1–8*`,
                    }, { quoted: receivedMsg });
                }

                // Remove listener after valid reply
                conn.ev.off("messages.upsert", listener);

                const { quality, isDoc } = selected;

                // React ⬇️ download starting
                await conn.sendMessage(senderID, {
                    react: { text: '⬇️', key: receivedMsg.key }
                });

                await conn.sendMessage(senderID, {
                    text: `⏳ *Downloading ${quality} ${isDoc ? 'document' : 'video'}...*\n_Please wait a moment_`
                }, { quoted: receivedMsg });

                const { data: apiRes } = await axios.get(formats[quality]);

                if (
                    !apiRes?.status ||
                    !apiRes?.results?.success ||
                    !apiRes.results.recommended?.dlurl
                ) {
                    await conn.sendMessage(senderID, {
                        react: { text: '❌', key: receivedMsg.key }
                    });
                    return conn.sendMessage(senderID, {
                        text: `❌ *Download failed for ${quality}!*\n_Try a different quality._`
                    }, { quoted: receivedMsg });
                }

                const downloadUrl = apiRes.results.recommended.dlurl;

                // React ⬆️ uploading
                await conn.sendMessage(senderID, {
                    react: { text: '⬆️', key: receivedMsg.key }
                });

                const sendCaption =
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ⚡ *Sʜᴀᴠɪʏᴀ Xᴍᴅ* · 🎬 *Vɪᴅᴇᴏ*
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

🎵 *${data.title}*
📊 *Quality:* ${quality}
${isDoc ? '📂 *Type:* Document' : '🎞️ *Type:* Video'}

> ⚡ *Powered by Sʜᴀᴠɪʏᴀ Xᴍᴅ*`;

                if (isDoc) {
                    await conn.sendMessage(senderID, {
                        document: { url: downloadUrl },
                        mimetype: "video/mp4",
                        fileName: `${data.title.replace(/[^\w\s]/gi, '').trim()}_${quality}.mp4`,
                        caption:  sendCaption,
                    }, { quoted: receivedMsg });
                } else {
                    await conn.sendMessage(senderID, {
                        video:    { url: downloadUrl },
                        mimetype: "video/mp4",
                        caption:  sendCaption,
                        ptt:      false,
                    }, { quoted: receivedMsg });
                }

                // React ✅ done
                await conn.sendMessage(senderID, {
                    react: { text: '✅', key: receivedMsg.key }
                });

            } catch (err) {
                console.error("[VIDEO LISTENER]", err.message);
            }
        };

        conn.ev.on("messages.upsert", listener);

        // Auto-remove listener after 3 minutes to prevent memory leak
        setTimeout(() => {
            conn.ev.off("messages.upsert", listener);
        }, 180_000);

    } catch (error) {
        console.error("[VIDEO CMD]", error.message);
        reply(`❌ *An error occurred!*\n_${error.message}_`);
    }
});
