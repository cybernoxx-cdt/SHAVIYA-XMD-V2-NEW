// ============================================================
//  cinesubz.js — SHAVIYA-XMD V2
//  Adapted for Cinesubz Movie Downloader
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
        listText += `\n> **Reply with 1 - ${topResults.length}**\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        // List එක යැවීම
        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });

        // ==========================================
        // REPLY LISTENER (අංකය අල්ලා ගැනීමේ කොටස)
        // ==========================================
        const listener = async (update) => {
            const replyMsg = update.messages[0];
            if (!replyMsg || !replyMsg.message) return;

            const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
            const isReplyToBot = replyContext?.stanzaId === listMsg.key.id;

            if (isReplyToBot) {
                const userReply = replyMsg.message.extendedTextMessage.text.trim();
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                    return conn.sendMessage(from, { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" }, { quoted: replyMsg });
                }

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

                    const caption = `🎬 *${selectedMovie.title}*\n\n📅 *Year:* ${selectedMovie.year}\n🎭 *Genres:* ${selectedMovie.genres}\n⭐ *IMDB:* ${selectedMovie.imdb}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;
                    const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                    // Buttons (Baileys standard structure)
                    const buttons = [
                        { buttonId: `.cz_dl ${shortTitle} || 480p || ${baseLink}`, buttonText: { displayText: "🎥 480p (SD)" }, type: 1 },
                        { buttonId: `.cz_dl ${shortTitle} || 720p || ${baseLink}`, buttonText: { displayText: "🎥 720p (HD)" }, type: 1 }
                    ];

                    await conn.sendMessage(from, {
                        image: { url: selectedMovie.img },
                        caption: caption,
                        footer: '© Mr Savendra · SHAVIYA-XMD V2',
                        buttons: buttons,
                        headerType: 4
                    }, { quoted: replyMsg });
                    
                    // Listener එක අයින් කරනවා
                    conn.ev.off('messages.upsert', listener);

                } catch (e) {
                    console.error("[CINESUBZ DETAILS ERROR]", e);
                    reply('⚠️ Error fetching details: ' + e.message);
                }
            }
        };

        conn.ev.on('messages.upsert', listener);
        
        // විනාඩි 2කින් listener එක auto අයින් වෙනවා (RAM පිරෙන එක නවත්තන්න)
        setTimeout(() => { conn.ev.off('messages.upsert', listener); }, 120000); 

    } catch (e) {
        console.error('[CINESUBZ SEARCH ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});


// =================================================
// 2. CINESUBZ MOVIE DOWNLOAD COMMAND (.cz_dl)
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

        // URL එකේ Quality එක වෙනස් කිරීම (720p -> 480p වගේ)
        let finalUrl = originalUrl;
        if (quality === '480p') {
            finalUrl = originalUrl.replace(/(720p|1080p|1080|720)/i, '480p');
        } else if (quality === '720p') {
            finalUrl = originalUrl.replace(/(480p|1080p|1080|480)/i, '720p');
        }
        
        // 1. File Size එක පරීක්ෂා කිරීම (2GB Limit Check)
        try {
            const headRes = await axios.head(finalUrl);
            if (headRes && headRes.headers['content-length']) {
                const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                // 1.95 GB (1950 MB) ට වඩා වැඩි නම් නවත්වනවා (WhatsApp limit)
                if (sizeMB > 1950) { 
                    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                    return reply(`❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.`);
                }
            }
        } catch (headErr) {
            console.log("[SIZE CHECK SKIP] Proceeding with direct upload...");
        }

        // 2. WhatsApp එකට Direct URL එකෙන් Document එකක් විදියට යැවීම
        const captionText = `🎬 *${title}* [${quality}]\n\n> 👤 Downloaded by: ${pushname}\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        await conn.sendMessage(from, {
            document: { url: finalUrl }, // කෙලින්ම URL එකෙන් Stream කරනවා (No storage issue)
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
