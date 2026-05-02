// ============================================================
//  cinesubz.js — SHAVIYA-XMD V2
//  Adapted for Cinesubz Movie Downloader
//  ✅ Numbered Reply System (No Buttons)
// ============================================================

const { cmd } = require('../command');
const axios = require('axios');

// Fetch function for API requests
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Fake VCard (Alive.js එකේ තිබුණු විදියටම)
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra · SHAVIYA-XMD V2',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

// =================================================
// 1. CINESUBZ MOVIE SEARCH COMMAND (.cz)
// =================================================
cmd({
    pattern:  'cz2',
    alias:    ['cinesubz2'],
    react:    '🔍',
    desc:     'Search and Download movies from Cinesubz',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) {
            return reply("🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz batman_");
        }

        const query = q.trim();
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Vercel API එකෙන් Search කිරීම
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (!data.status || !data.data || data.data.length === 0) {
            return reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
        }

        // මුල් ප්‍රතිපල 10 වෙන්කර ගැනීම
        const topResults = data.data.slice(0, 10);
        let listText = `🎬 *CINESUBZ MOVIE SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n👤 *User:* ${pushname}\n\n👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
        
        topResults.forEach((mv, index) => {
            listText += `*${index + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

        // List එක යැවීම
        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });

        // ==========================================
        // MOVIE SELECTION LISTENER
        // ==========================================
        const movieListener = async (update) => {
            const replyMsg = update.messages[0];
            if (!replyMsg || !replyMsg.message) return;

            const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
            const isReplyToList = replyContext?.stanzaId === listMsg.key.id;

            if (!isReplyToList) return;

            const userReply = replyMsg.message.extendedTextMessage?.text?.trim();
            const selectedIndex = parseInt(userReply) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                return conn.sendMessage(from, { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" }, { quoted: replyMsg });
            }

            // Movie listener auto remove
            conn.ev.off('messages.upsert', movieListener);

            const selectedMovie = topResults[selectedIndex];

            try {
                await conn.sendMessage(from, { react: { text: "🎬", key: replyMsg.key } });

                // API එකෙන් Direct links ගැනීම
                const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`;
                const extRes = await fetch(extractUrl);
                const extData = await extRes.json();

                if (!extData.status || !extData.data || extData.data.length === 0) {
                    return conn.sendMessage(from, { text: "❌ *මෙම චිත්‍රපටියේ Direct Links ලබාගත නොහැක.*" }, { quoted: replyMsg });
                }

                // Direct MP4 ලින්ක් එකක් තෝරා ගැනීම
                const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                const baseLink = directVideo.link;

                // ==========================================
                // QUALITY SELECTION — NUMBERED REPLY
                // ==========================================
                const qualityList = [
                    { label: "🎥 480p (SD)", quality: "480p" },
                    { label: "🎥 720p (HD)", quality: "720p" }
                ];

                let qualityText = `🎬 *${selectedMovie.title}*\n\n`;
                qualityText += `📅 *Year:* ${selectedMovie.year || 'N/A'}\n`;
                qualityText += `🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n`;
                qualityText += `⭐ *IMDB:* ${selectedMovie.imdb || 'N/A'}\n\n`;
                qualityText += `👇 *ඔබට අවශ්‍ය Quality එකේ අංකය Reply කරන්න*\n\n`;

                qualityList.forEach((q, i) => {
                    qualityText += `*${i + 1}.* ${q.label}\n`;
                });

                qualityText += `\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

                // Movie image + quality list යැවීම
                const qualityMsg = await conn.sendMessage(from, {
                    image: { url: selectedMovie.img },
                    caption: qualityText
                }, { quoted: replyMsg });

                // ==========================================
                // QUALITY SELECTION LISTENER
                // ==========================================
                const qualityListener = async (update2) => {
                    const qReplyMsg = update2.messages[0];
                    if (!qReplyMsg || !qReplyMsg.message) return;

                    const qReplyContext = qReplyMsg.message.extendedTextMessage?.contextInfo;
                    const isReplyToQuality = qReplyContext?.stanzaId === qualityMsg.key.id;

                    if (!isReplyToQuality) return;

                    const qUserReply = qReplyMsg.message.extendedTextMessage?.text?.trim();
                    const qSelectedIndex = parseInt(qUserReply) - 1;

                    if (isNaN(qSelectedIndex) || qSelectedIndex < 0 || qSelectedIndex >= qualityList.length) {
                        return conn.sendMessage(from, { text: "❌ *වැරදි අංකයක්! 1 හෝ 2 reply කරන්න.*" }, { quoted: qReplyMsg });
                    }

                    // Quality listener auto remove
                    conn.ev.off('messages.upsert', qualityListener);

                    const chosenQuality = qualityList[qSelectedIndex].quality;
                    const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                    // Download command trigger කිරීම (cz_dl)
                    await conn.sendMessage(from, { react: { text: "📥", key: qReplyMsg.key } });
                    await conn.sendMessage(from, { text: `⬇️ *Downloading ${shortTitle} (${chosenQuality})...*\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: FakeVCard });

                    // URL quality replace
                    let finalUrl = baseLink;
                    if (chosenQuality === '480p') {
                        finalUrl = baseLink.replace(/(720p|1080p|1080|720)/i, '480p');
                    } else if (chosenQuality === '720p') {
                        finalUrl = baseLink.replace(/(480p|1080p|1080|480)/i, '720p');
                    }

                    // File size check
                    try {
                        const headRes = await axios.head(finalUrl);
                        if (headRes && headRes.headers['content-length']) {
                            const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                            if (sizeMB > 1950) {
                                await conn.sendMessage(from, { react: { text: "❌", key: qReplyMsg.key } });
                                return conn.sendMessage(from, { text: `❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.` }, { quoted: FakeVCard });
                            }
                        }
                    } catch (headErr) {
                        console.log("[SIZE CHECK SKIP] Proceeding with direct upload...");
                    }

                    // Direct upload
                    const captionText = `🎬 *${selectedMovie.title}* [${chosenQuality}]\n\n> 👤 Downloaded by: ${pushname}\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

                    await conn.sendMessage(from, {
                        document: { url: finalUrl },
                        mimetype: "video/mp4",
                        fileName: `${shortTitle} - ${chosenQuality}.mp4`,
                        caption: captionText
                    }, { quoted: FakeVCard });

                    await conn.sendMessage(from, { react: { text: "✅", key: qReplyMsg.key } });
                };

                conn.ev.on('messages.upsert', qualityListener);

                // Quality listener — 2 minutes timeout
                setTimeout(() => { conn.ev.off('messages.upsert', qualityListener); }, 120000);

            } catch (e) {
                console.error("[CINESUBZ DETAILS ERROR]", e);
                conn.sendMessage(from, { text: '⚠️ Error fetching details: ' + e.message }, { quoted: replyMsg });
            }
        };

        conn.ev.on('messages.upsert', movieListener);

        // Movie listener — 2 minutes timeout
        setTimeout(() => { conn.ev.off('messages.upsert', movieListener); }, 120000);

    } catch (e) {
        console.error('[CINESUBZ SEARCH ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});


// =================================================
// 2. CINESUBZ MOVIE DOWNLOAD COMMAND (.cz_dl)
//    (Direct use — standalone download command)
// =================================================
cmd({
    pattern:  'cz_dl',
    alias:    [],
    react:    '⬇️',
    desc:     'Download movie direct link',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q || !q.includes('||')) return;

        const [title, quality, originalUrl] = q.split(' || ');
        if (!originalUrl) return;

        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });
        await conn.sendMessage(from, { text: `⬇️ *Downloading ${title} (${quality})...*\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: FakeVCard });

        // URL quality replace
        let finalUrl = originalUrl;
        if (quality === '480p') {
            finalUrl = originalUrl.replace(/(720p|1080p|1080|720)/i, '480p');
        } else if (quality === '720p') {
            finalUrl = originalUrl.replace(/(480p|1080p|1080|480)/i, '720p');
        }

        // File size check
        try {
            const headRes = await axios.head(finalUrl);
            if (headRes && headRes.headers['content-length']) {
                const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                if (sizeMB > 1950) {
                    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                    return reply(`❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.`);
                }
            }
        } catch (headErr) {
            console.log("[SIZE CHECK SKIP] Proceeding with direct upload...");
        }

        // Direct upload
        const captionText = `🎬 *${title}* [${quality}]\n\n> 👤 Downloaded by: ${pushname}\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

        await conn.sendMessage(from, {
            document: { url: finalUrl },
            mimetype: "video/mp4",
            fileName: `${title} - ${quality}.mp4`,
            caption: captionText
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('[CINESUBZ DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply('❌ *Download Failed! ලින්ක් එක දෝෂ සහිතයි හෝ Expire වී ඇත.*');
    }
});
