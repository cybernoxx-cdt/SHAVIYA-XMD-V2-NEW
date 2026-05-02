// ============================================================
//  cinesubz.js — SHAVIYA-XMD V2  (Shaviya Cinema Edition)
//  ✅ Numbered Reply System (No Buttons)
//  ✅ Memory Crash Fixed (Stream-safe download)
//  ✅ Listener Leak Fixed (sender + stanza double check)
//  ✅ Sender Check Bug Fixed (Group + DM both work)
//  ✅ TV Series Support Added (type=tv auto detect)
//  ✅ Reply Detection Fixed (all message types + array loop)
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
//  HELPER: Normalize JID (strip :xx device suffix)
// ─────────────────────────────────────────────────────────────
function normJid(jid = '') {
    return jid.split(':')[0].split('@')[0];
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Extract plain text from ANY message type
// ─────────────────────────────────────────────────────────────
function getMsgText(msg) {
    if (!msg?.message) return '';
    const m = msg.message;
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.buttonsResponseMessage?.selectedButtonId ||
        m.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ''
    ).trim();
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Get stanzaId (which message is being replied to)
// ─────────────────────────────────────────────────────────────
function getStanzaId(msg) {
    if (!msg?.message) return null;
    const m = msg.message;
    return (
        m.extendedTextMessage?.contextInfo?.stanzaId ||
        m.imageMessage?.contextInfo?.stanzaId ||
        m.videoMessage?.contextInfo?.stanzaId ||
        null
    );
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Get sender JID
// ─────────────────────────────────────────────────────────────
function getMsgSender(msg) {
    return normJid(msg?.key?.participant || msg?.key?.remoteJid || '');
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Stream-safe size check
// ─────────────────────────────────────────────────────────────
async function checkFileSize(url, limitMB = 1800) {
    try {
        const head = await axios.head(url, { timeout: 8000 });
        const cl = head.headers['content-length'];
        if (!cl) return { ok: true, sizeMB: null };
        const sizeMB = parseInt(cl) / (1024 * 1024);
        if (sizeMB > limitMB) return { ok: false, sizeMB };
        return { ok: true, sizeMB };
    } catch {
        return { ok: true, sizeMB: null };
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

// ─────────────────────────────────────────────────────────────
//  HELPER: Detect content type (movie vs tv)
// ─────────────────────────────────────────────────────────────
function detectContentType(item) {
    if (!item) return 'mv';
    const t = (item.type || item.content_type || '').toLowerCase();
    if (t.includes('tv') || t.includes('series') || t.includes('show')) return 'tv';
    if (item.episodes || item.seasons) return 'tv';
    return 'mv';
}

// =================================================
// 1. CINESUBZ SEARCH COMMAND (.cz2)
// =================================================
cmd({
    pattern:  'cz2',
    alias:    ['cinesubz2'],
    react:    '🔍',
    desc:     'Search and Download movies/TV series from Cinesubz',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) return reply("🎬 *කරුණාකර Movie/Series නම ලබා දෙන්න!*\n_උදා: .cz2 batman_");

        const query     = q.trim();
        const senderJid = normJid(sender);

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // ── Search API ─────────────────────────────────────
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const res  = await fetch(searchUrl);
        const data = await res.json();

        if (!data.status || !data.data || data.data.length === 0) {
            return reply("❌ *සමාවෙන්න, ඒ නමින් Movies/Series කිසිවක් හමුවූයේ නැත.*");
        }

        const topResults = data.data.slice(0, 10);

        let listText  = `🎬 *SHAVIYA CINEMA — SEARCH RESULTS*\n\n`;
            listText += `🔍 *සෙව්වේ:* ${query}\n👤 *User:* ${pushname}\n\n`;
            listText += `👇 *ඔබට අවශ්‍ය ෆිල්ම් / Series එකේ අංකය Reply කරන්න*\n\n`;
        topResults.forEach((mv, i) => {
            const icon = detectContentType(mv) === 'tv' ? '📺' : '🎬';
            listText += `*${i + 1}.* ${icon} ${mv.title} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

        const listMsg   = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });
        const listMsgId = listMsg.key.id;

        // ── STEP 1 listener — Movie selection ──────────────
        let movieListenerDone = false;

        const movieListener = async (update) => {
            if (movieListenerDone) return;

            // ✅ Loop ALL messages — not just [0]
            for (const replyMsg of (update.messages || [])) {
                if (!replyMsg?.message) continue;
                if (replyMsg.key?.fromMe) continue;

                // Must REPLY to our list message
                if (getStanzaId(replyMsg) !== listMsgId) continue;

                // Must be same sender
                if (getMsgSender(replyMsg) !== senderJid) continue;

                const userReply     = getMsgText(replyMsg);
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                    conn.sendMessage(from,
                        { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" },
                        { quoted: replyMsg });
                    return;
                }

                // Lock immediately
                movieListenerDone = true;
                conn.ev.off('messages.upsert', movieListener);
                clearTimeout(movieTimeout);

                const selectedMovie = topResults[selectedIndex];
                const contentType   = detectContentType(selectedMovie);

                try {
                    await conn.sendMessage(from, { react: { text: "🔄", key: replyMsg.key } });

                    // ── Fetch download links ──────────────────
                    const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=${contentType}`;
                    const extRes  = await fetch(extractUrl);
                    const extData = await extRes.json();

                    if (!extData.status || !extData.data || extData.data.length === 0) {
                        conn.sendMessage(from,
                            { text: `❌ *${contentType === 'tv' ? 'TV Series' : 'Movie'} Direct Links ලබාගත නොහැක.*\n_ටිකක් ඉඳලා try කරන්න._` },
                            { quoted: replyMsg });
                        return;
                    }

                    const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                    const baseLink    = directVideo.link;

                    // ── Quality selection menu ────────────────
                    const qualityList = [
                        { label: "🎥 480p  (SD)", quality: "480p" },
                        { label: "🎥 720p  (HD)", quality: "720p" }
                    ];

                    const typeLabel  = contentType === 'tv' ? '📺 TV Series' : '🎬 Movie';
                    let qualityText  = `${typeLabel}: *${selectedMovie.title}*\n\n`;
                        qualityText += `📅 *Year:*   ${selectedMovie.year   || 'N/A'}\n`;
                        qualityText += `🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n`;
                        qualityText += `⭐ *IMDB:*   ${selectedMovie.imdb   || 'N/A'}\n\n`;
                        qualityText += `👇 *Quality අංකය Reply කරන්න*\n\n`;
                    qualityList.forEach((ql, i) => { qualityText += `*${i + 1}.* ${ql.label}\n`; });
                        qualityText += `\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`;

                    const qualityMsg   = await conn.sendMessage(from, {
                        image:   { url: selectedMovie.img },
                        caption: qualityText
                    }, { quoted: replyMsg });
                    const qualityMsgId = qualityMsg.key.id;

                    // ── STEP 2 listener — Quality selection ──
                    let qualityListenerDone = false;

                    const qualityListener = async (update2) => {
                        if (qualityListenerDone) return;

                        for (const qMsg of (update2.messages || [])) {
                            if (!qMsg?.message) continue;
                            if (qMsg.key?.fromMe) continue;

                            if (getStanzaId(qMsg) !== qualityMsgId) continue;
                            if (getMsgSender(qMsg) !== senderJid) continue;

                            const qUserReply     = getMsgText(qMsg);
                            const qSelectedIndex = parseInt(qUserReply) - 1;

                            if (isNaN(qSelectedIndex) || qSelectedIndex < 0 || qSelectedIndex >= qualityList.length) {
                                conn.sendMessage(from,
                                    { text: "❌ *වැරදි අංකයක්! 1 හෝ 2 reply කරන්න.*" },
                                    { quoted: qMsg });
                                return;
                            }

                            qualityListenerDone = true;
                            conn.ev.off('messages.upsert', qualityListener);
                            clearTimeout(qualityTimeout);

                            const chosenQuality = qualityList[qSelectedIndex].quality;
                            const shortTitle    = selectedMovie.title.substring(0, 25)
                                                    .replace(/[^a-zA-Z0-9 ]/g, "").trim();
                            const finalUrl      = buildQualityUrl(baseLink, chosenQuality);

                            await conn.sendMessage(from, { react: { text: "📥", key: qMsg.key } });

                            // Size check
                            const sizeCheck = await checkFileSize(finalUrl, 1800);
                            if (!sizeCheck.ok) {
                                await conn.sendMessage(from, { react: { text: "❌", key: qMsg.key } });
                                conn.sendMessage(from, {
                                    text: `❌ *File WhatsApp Limit ඉක්මවා ඇත!*\n` +
                                          `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` +
                                          `⚠️ 1800MB+ Heroku crash කරවනවා.`
                                }, { quoted: FakeVCard });
                                return;
                            }

                            conn.sendMessage(from, {
                                text: `⬇️ *Downloading: ${shortTitle}* [${chosenQuality}]\n` +
                                      `${sizeCheck.sizeMB ? `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` : ''}` +
                                      `_Upload වීමට ටික වේලාවක් ගත විය හැක..._`
                            }, { quoted: FakeVCard });

                            // Send video (stream-safe)
                            try {
                                await conn.sendMessage(from, {
                                    video:    { url: finalUrl },
                                    mimetype: 'video/mp4',
                                    caption:  `🎬 *${selectedMovie.title}* [${chosenQuality}]\n> 👤 Sʜᴀᴠɪʏᴀ Xᴍᴅ\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`,
                                    fileName: `${shortTitle} - ${chosenQuality}.mp4`
                                }, { quoted: FakeVCard });

                                conn.sendMessage(from, { react: { text: "✅", key: qMsg.key } });

                            } catch (dlErr) {
                                console.error('[CINESUBZ UPLOAD ERROR]', dlErr.message);
                                conn.sendMessage(from, { react: { text: "❌", key: qMsg.key } });

                                // Fallback: document
                                try {
                                    await conn.sendMessage(from, {
                                        document: { url: finalUrl },
                                        mimetype: 'video/mp4',
                                        fileName: `${shortTitle} - ${chosenQuality}.mp4`,
                                        caption:  `🎬 *${selectedMovie.title}* [${chosenQuality}]\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`
                                    }, { quoted: FakeVCard });
                                    conn.sendMessage(from, { react: { text: "✅", key: qMsg.key } });
                                } catch (fbErr) {
                                    conn.sendMessage(from,
                                        { text: `❌ *Download Failed!*\n${fbErr.message}` },
                                        { quoted: FakeVCard });
                                }
                            }

                            return;
                        }
                    };

                    conn.ev.on('messages.upsert', qualityListener);
                    const qualityTimeout = setTimeout(() => {
                        if (!qualityListenerDone) {
                            qualityListenerDone = true;
                            conn.ev.off('messages.upsert', qualityListener);
                            conn.sendMessage(from,
                                { text: "⏰ *Timeout. .cz2 command නැවත භාවිතා කරන්න.*" },
                                { quoted: FakeVCard });
                        }
                    }, 90000);

                } catch (e) {
                    console.error("[CINESUBZ DETAILS ERROR]", e);
                    conn.sendMessage(from,
                        { text: `⚠️ *Error:* ${e.message}` },
                        { quoted: replyMsg });
                }

                return;
            }
        };

        conn.ev.on('messages.upsert', movieListener);
        const movieTimeout = setTimeout(() => {
            if (!movieListenerDone) {
                movieListenerDone = true;
                conn.ev.off('messages.upsert', movieListener);
            }
        }, 90000);

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

        const parts       = q.split(' || ');
        const title       = parts[0]?.trim();
        const quality     = parts[1]?.trim();
        const originalUrl = parts[2]?.trim();
        if (!originalUrl) return;

        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

        const finalUrl  = buildQualityUrl(originalUrl, quality);
        const sizeCheck = await checkFileSize(finalUrl, 1800);

        if (!sizeCheck.ok) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`❌ *File Size Limit Exceeded!*\n📦 ${sizeCheck.sizeMB.toFixed(0)} MB — 1800MB limit.`);
        }

        conn.sendMessage(from, {
            text: `⬇️ *Downloading ${title} [${quality}]...*\n` +
                  `${sizeCheck.sizeMB ? `📦 *Size:* ${sizeCheck.sizeMB.toFixed(0)} MB\n` : ''}` +
                  `_Upload වීමට ටික වේලාවක් ගත විය හැක..._`
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, {
            video:    { url: finalUrl },
            mimetype: 'video/mp4',
            caption:  `🎬 *${title}* [${quality}]\n> 👤 Sʜᴀᴠɪʏᴀ Xᴍᴅ\n> Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️`,
            fileName: `${title} - ${quality}.mp4`
        }, { quoted: FakeVCard });

        conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error('[CINESUBZ DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply('❌ *Download Failed!* ලින්ක් expire/invalid වී ඇත.');
    }
});
