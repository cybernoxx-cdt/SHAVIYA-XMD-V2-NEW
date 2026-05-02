// ============================================================
//  cinesubz.js — SHAVIYA-XMD V2  (Shaviya Cinema Edition)
//  ✅ Numbered Reply System (No Buttons)
//  ✅ Memory Crash Fixed (Stream-safe download)
//  ✅ Listener Leak Fixed (sender + stanza double check)
// ============================================================

const { cmd } = require('../command');
const axios = require('axios');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: 'Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

// ─────────────────────────────────────────────────────────────
//  HELPER: Stream-safe size check
//  Returns { ok: true, sizeMB } or { ok: false, sizeMB, reason }
// ─────────────────────────────────────────────────────────────
async function checkFileSize(url, limitMB = 750) {
    try {
        const head = await axios.head(url, { timeout: 8000 });
        const cl = head.headers['content-length'];
        if (!cl) return { ok: true, sizeMB: null }; // unknown — let it try
        const sizeMB = parseInt(cl) / (1024 * 1024);
        if (sizeMB > limitMB) return { ok: false, sizeMB };
        return { ok: true, sizeMB };
    } catch {
        return { ok: true, sizeMB: null }; // HEAD failed — let it try
    }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Build final URL by swapping quality token
// ─────────────────────────────────────────────────────────────
function buildQualityUrl(baseLink, quality) {
    if (quality === '480p') return baseLink.replace(/(1080p|1080|720p|720)/i, '480p');
    if (quality === '720p') return baseLink.replace(/(1080p|1080|480p|480)/i, '720p');
    return baseLink;
}

// =================================================
// 1. CINESUBZ MOVIE SEARCH COMMAND (.cz2)
// =================================================
cmd({
    pattern:  'cz2',
    alias:    ['cinesubz2'],
    react:    '🔍',
    desc:     'Search and Download movies from Cinesubz (Shaviya Cinema)',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) return reply("🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz2 batman_");

        const query = q.trim();
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // ── Search ──────────────────────────────────────────
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const res  = await fetch(searchUrl);
        const data = await res.json();

        if (!data.status || !data.data || data.data.length === 0) {
            return reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
        }

        const topResults = data.data.slice(0, 10);

        let listText = `🎬 *SHAVIYA CINEMA — MOVIE SEARCH*\n\n`;
        listText    += `🔍 *සෙව්වේ:* ${query}\n👤 *User:* ${pushname}\n\n`;
        listText    += `👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
        topResults.forEach((mv, i) => {
            listText += `*${i + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });

        // ── STEP 1: Movie selection listener ────────────────
        let movieListenerDone = false;

        const movieListener = async (update) => {
            // Prevent double-fire
            if (movieListenerDone) return;

            const replyMsg = update.messages?.[0];
            if (!replyMsg?.message) return;

            // Must be a reply to our list message AND from the same sender
            const ctx = replyMsg.message.extendedTextMessage?.contextInfo;
            if (ctx?.stanzaId !== listMsg.key.id) return;
            if ((replyMsg.key.participant || replyMsg.key.remoteJid) !== sender &&
                replyMsg.key.remoteJid !== sender) return;

            const userReply    = replyMsg.message.extendedTextMessage?.text?.trim();
            const selectedIndex = parseInt(userReply) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                return conn.sendMessage(from,
                    { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" },
                    { quoted: replyMsg });
            }

            // Lock & cleanup movie listener immediately
            movieListenerDone = true;
            conn.ev.off('messages.upsert', movieListener);
            clearTimeout(movieTimeout);

            const selectedMovie = topResults[selectedIndex];

            try {
                await conn.sendMessage(from, { react: { text: "🔄", key: replyMsg.key } });

                // ── Fetch links ──────────────────────────────
                const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`;
                const extRes  = await fetch(extractUrl);
                const extData = await extRes.json();

                if (!extData.status || !extData.data || extData.data.length === 0) {
                    return conn.sendMessage(from,
                        { text: "❌ *මෙම චිත්‍රපටියේ Direct Links ලබාගත නොහැක.*" },
                        { quoted: replyMsg });
                }

                const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                const baseLink    = directVideo.link;

                // ── Quality menu ─────────────────────────────
                const qualityList = [
                    { label: "🎥 480p  (SD)", quality: "480p" },
                    { label: "🎥 720p  (HD)", quality: "720p" }
                ];

                let qualityText  = `🎬 *${selectedMovie.title}*\n\n`;
                    qualityText += `📅 *Year:*   ${selectedMovie.year   || 'N/A'}\n`;
                    qualityText += `🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n`;
                    qualityText += `⭐ *IMDB:*   ${selectedMovie.imdb   || 'N/A'}\n\n`;
                    qualityText += `👇 *ඔබට අවශ්‍ය Quality එකේ අංකය Reply කරන්න*\n\n`;
                qualityList.forEach((q, i) => { qualityText += `*${i + 1}.* ${q.label}\n`; });
                    qualityText += `\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

                const qualityMsg = await conn.sendMessage(from, {
                    image:   { url: selectedMovie.img },
                    caption: qualityText
                }, { quoted: replyMsg });

                // ── STEP 2: Quality selection listener ───────
                let qualityListenerDone = false;

                const qualityListener = async (update2) => {
                    if (qualityListenerDone) return;

                    const qMsg = update2.messages?.[0];
                    if (!qMsg?.message) return;

                    const qCtx = qMsg.message.extendedTextMessage?.contextInfo;
                    if (qCtx?.stanzaId !== qualityMsg.key.id) return;
                    if ((qMsg.key.participant || qMsg.key.remoteJid) !== sender &&
                        qMsg.key.remoteJid !== sender) return;

                    const qUserReply    = qMsg.message.extendedTextMessage?.text?.trim();
                    const qSelectedIndex = parseInt(qUserReply) - 1;

                    if (isNaN(qSelectedIndex) || qSelectedIndex < 0 || qSelectedIndex >= qualityList.length) {
                        return conn.sendMessage(from,
                            { text: "❌ *වැරදි අංකයක්! 1 හෝ 2 reply කරන්න.*" },
                            { quoted: qMsg });
                    }

                    // Lock & cleanup quality listener immediately
                    qualityListenerDone = true;
                    conn.ev.off('messages.upsert', qualityListener);
                    clearTimeout(qualityTimeout);

                    const chosenQuality = qualityList[qSelectedIndex].quality;
                    const shortTitle    = selectedMovie.title.substring(0, 25)
                                            .replace(/[^a-zA-Z0-9 ]/g, "").trim();
                    const finalUrl      = buildQualityUrl(baseLink, chosenQuality);

                    await conn.sendMessage(from, { react: { text: "📥", key: qMsg.key } });

                    // ── Size check (750 MB safe limit for Heroku) ──
                    const sizeCheck = await checkFileSize(finalUrl, 750);
                    if (!sizeCheck.ok) {
                        await conn.sendMessage(from, { react: { text: "❌", key: qMsg.key } });
                        return conn.sendMessage(from, {
                            text: `❌ *File එක WhatsApp Limit ඉක්මවා ඇත!*\n` +
                                  `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` +
                                  `⚠️ Heroku RAM crash වෙන නිසා 750MB+ files skip කරනවා.`
                        }, { quoted: FakeVCard });
                    }

                    await conn.sendMessage(from, {
                        text: `⬇️ *Downloading: ${shortTitle}* [${chosenQuality}]\n` +
                              `${sizeCheck.sizeMB ? `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` : ''}` +
                              `_Upload වීමට ටික වේලාවක් ගත විය හැක..._`
                    }, { quoted: FakeVCard });

                    // ── Stream-safe document send ─────────────
                    // Baileys streams from URL — avoid buffering entire file in RAM
                    try {
                        const captionText =
                            `🎬 *${selectedMovie.title}* [${chosenQuality}]\n\n` +
                            `> 👤 Downloaded by: ${pushname}\n` +
                            `> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

                        await conn.sendMessage(from, {
                            video:    { url: finalUrl },   // ✅ stream-safe (NOT document)
                            mimetype: 'video/mp4',
                            caption:  captionText,
                            fileName: `${shortTitle} - ${chosenQuality}.mp4`
                        }, { quoted: FakeVCard });

                        await conn.sendMessage(from, { react: { text: "✅", key: qMsg.key } });

                    } catch (dlErr) {
                        console.error('[CINESUBZ UPLOAD ERROR]', dlErr.message);
                        await conn.sendMessage(from, { react: { text: "❌", key: qMsg.key } });

                        // Fallback — send as document if video upload fails
                        try {
                            await conn.sendMessage(from, {
                                document: { url: finalUrl },
                                mimetype: 'video/mp4',
                                fileName: `${shortTitle} - ${chosenQuality}.mp4`,
                                caption:  `🎬 *${selectedMovie.title}* [${chosenQuality}]\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`
                            }, { quoted: FakeVCard });
                            await conn.sendMessage(from, { react: { text: "✅", key: qMsg.key } });
                        } catch (fbErr) {
                            conn.sendMessage(from,
                                { text: `❌ *Download Failed!*\nError: ${fbErr.message}` },
                                { quoted: FakeVCard });
                        }
                    }
                };

                conn.ev.on('messages.upsert', qualityListener);
                const qualityTimeout = setTimeout(() => {
                    if (!qualityListenerDone) {
                        qualityListenerDone = true;
                        conn.ev.off('messages.upsert', qualityListener);
                        conn.sendMessage(from,
                            { text: "⏰ *Quality selection timeout. කරුණාකර නැවත .cz2 command භාවිතා කරන්න.*" },
                            { quoted: FakeVCard });
                    }
                }, 90000); // 90 seconds

            } catch (e) {
                console.error("[CINESUBZ DETAILS ERROR]", e);
                conn.sendMessage(from,
                    { text: `⚠️ *Error fetching details:* ${e.message}` },
                    { quoted: replyMsg });
            }
        };

        conn.ev.on('messages.upsert', movieListener);
        const movieTimeout = setTimeout(() => {
            if (!movieListenerDone) {
                movieListenerDone = true;
                conn.ev.off('messages.upsert', movieListener);
            }
        }, 90000); // 90 seconds

    } catch (e) {
        console.error('[CINESUBZ SEARCH ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});


// =================================================
// 2. STANDALONE DOWNLOAD COMMAND (.cz_dl)
// =================================================
cmd({
    pattern:  'cz_dl',
    alias:    [],
    react:    '⬇️',
    desc:     'Download movie direct link (standalone)',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q || !q.includes('||')) return;

        const parts = q.split(' || ');
        const title       = parts[0]?.trim();
        const quality     = parts[1]?.trim();
        const originalUrl = parts[2]?.trim();
        if (!originalUrl) return;

        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

        const finalUrl  = buildQualityUrl(originalUrl, quality);
        const sizeCheck = await checkFileSize(finalUrl, 750);

        if (!sizeCheck.ok) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ *File Size Limit Exceeded!*\n📦 ${sizeCheck.sizeMB.toFixed(0)} MB — 750MB limit.\nHeroku RAM crash වෙනවා.`);
        }

        await conn.sendMessage(from, {
            text: `⬇️ *Downloading ${title} [${quality}]...*\n` +
                  `${sizeCheck.sizeMB ? `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` : ''}` +
                  `_Upload වීමට ටික වේලාවක් ගත විය හැක..._`
        }, { quoted: FakeVCard });

        const captionText =
            `🎬 *${title}* [${quality}]\n\n` +
            `> 👤 Downloaded by: Sʜᴀᴠɪʏᴀ Xᴍᴅ\n` +
            `> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

        await conn.sendMessage(from, {
            video:    { url: finalUrl },
            mimetype: 'video/mp4',
            caption:  captionText,
            fileName: `${title} - ${quality}.mp4`
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('[CINESUBZ DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply('❌ *Download Failed!* ලින්ක් expire/invalid වී ඇත.');
    }
});
