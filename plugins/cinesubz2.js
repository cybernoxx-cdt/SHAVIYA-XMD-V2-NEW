// ============================================================
//  cinesubz2.js — SHAVIYA-XMD V2
//  Adapted for Cinesubz Movie Downloader
//  ✅ Numbered Reply System (Deep Fixed)
//  🔧 Fix: reply listener now properly detects replies
//  🔧 Fix: API response parsing hardened
//  🔧 Fix: stanzaId match using both id fields
//  🔧 Fix: type:'append' messages ignored
//  🔧 Fix: listener memory leak protection
//  🔧 Fix: image fallback when no poster
//  🔧 Fix: bot number reply now works (fromMe check removed)
// ============================================================

const { cmd } = require('../command');
const axios    = require('axios');

// node-fetch dynamic import (CommonJS safe)
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// FakeVCard — quoted header
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

// ─────────────────────────────────────────────────────
// HELPER: reply message හඳුනාගැනීම (deep fix)
//   Baileys reply context: contextInfo.stanzaId
//   නමුත් හෙළනිලිය: key.id vs stanzaId offset වෙනවා
//   ඒ නිසා BOTH id + stanzaId check කරනවා
// ─────────────────────────────────────────────────────
function isReplyTo(incomingMsg, targetKeyId) {
    const msg = incomingMsg?.message;
    if (!msg) return false;

    // Helper: check any contextInfo object
    const matchCtx = (ctx) => ctx?.stanzaId && ctx.stanzaId === targetKeyId;

    // extendedTextMessage — text reply
    if (matchCtx(msg.extendedTextMessage?.contextInfo)) return true;

    // imageMessage, videoMessage, audioMessage, documentMessage, stickerMessage
    if (matchCtx(msg.imageMessage?.contextInfo))    return true;
    if (matchCtx(msg.videoMessage?.contextInfo))    return true;
    if (matchCtx(msg.audioMessage?.contextInfo))    return true;
    if (matchCtx(msg.documentMessage?.contextInfo)) return true;
    if (matchCtx(msg.stickerMessage?.contextInfo))  return true;

    // ✅ Fix: ephemeralMessage / viewOnceMessage wrapping (bot number reply edge case)
    const inner = msg.ephemeralMessage?.message
               || msg.viewOnceMessage?.message
               || msg.viewOnceMessageV2?.message;
    if (inner) {
        for (const key of Object.keys(inner)) {
            if (matchCtx(inner[key]?.contextInfo)) return true;
        }
    }

    return false;
}

// ─────────────────────────────────────────────────────
// HELPER: reply message text ගැනීම
// ─────────────────────────────────────────────────────
function getReplyText(incomingMsg) {
    const msg = incomingMsg?.message;
    if (!msg) return '';

    // Direct text types
    const direct = (
        msg.extendedTextMessage?.text ||
        msg.conversation ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        ''
    ).trim();
    if (direct) return direct;

    // ✅ Fix: ephemeralMessage wrapping (bot number reply edge case)
    const inner = msg.ephemeralMessage?.message;
    if (inner) {
        return (
            inner.extendedTextMessage?.text ||
            inner.conversation ||
            ''
        ).trim();
    }

    return '';
}

// ─────────────────────────────────────────────────────
// HELPER: safe JSON fetch with timeout
// ─────────────────────────────────────────────────────
async function safeFetch(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}


// =================================================
// 1. CINESUBZ MOVIE SEARCH COMMAND (.cz2)
// =================================================
cmd({
    pattern:  'cz2',
    alias:    ['cinesubz2'],
    react:    '🎬',
    desc:     'Search and Download movies from Cinesubz',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) {
            return reply('🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz2 batman_');
        }

        const query = q.trim();
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // ── Step 1: Search ──
        let data;
        try {
            data = await safeFetch(
                `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`
            );
        } catch (e) {
            return reply(`❌ *Search API Error:* ${e.message}\n_API offline හෝ network issue_`);
        }

        if (!data?.status || !Array.isArray(data?.data) || data.data.length === 0) {
            return reply('❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*');
        }

        const topResults = data.data.slice(0, 10);

        // ── Step 2: List message ──
        let listText = `🎬 *CINESUBZ MOVIE SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n👤 *User:* ${pushname}\n\n👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
        topResults.forEach((mv, i) => {
            listText += `*${i + 1}.* ${mv.title || 'Unknown'} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        // FakeVCard quoted ලෙස යවනවා — reply context reliable
        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });

        // listMsg.key.id — listener match කරන්නේ මෙය
        const listMsgId = listMsg?.key?.id;
        if (!listMsgId) {
            return reply('❌ *Internal error: message key ලැබුණේ නැත. නැවත උත්සාහ කරන්න.*');
        }

        // ── Step 3: Movie selection listener ──
        // ✅ Fix: "one-shot listener" bug fix
        //    movieListenerDone flag use නොකරනවා — ඒ නිසා first valid reply ලැබුනාම
        //    listener kill වෙලා ඊළඟ reply ට no response වෙනවා.
        //    Fix: movieProcessing lock use කරනවා — process වෙද්දී duplicate block කරනවා,
        //    complete/fail වූ ගමන් listener off කරනවා. Invalid reply ලැබුනොත් error දෙලා
        //    listener live තියෙනවා — user නැවත reply කරන්න පුළුවන්.
        let movieProcessing = false; // process වෙද්දී lock — duplicate fires block

        const movieListener = async (update) => {
            // type === 'append' (history sync) messages ignore
            if (update.type === 'append') return;

            const msgs = update?.messages;
            if (!Array.isArray(msgs) || msgs.length === 0) return;

            for (const inMsg of msgs) {
                if (!inMsg?.message) continue;

                // same chat check
                if (inMsg.key?.remoteJid !== from) continue;

                // reply to listMsg check
                if (!isReplyTo(inMsg, listMsgId)) continue;

                // process වෙද්දී duplicate fire ignore
                if (movieProcessing) return;

                const userReply     = getReplyText(inMsg);
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                    // ✅ Invalid number — error දෙලා listener live තියෙනවා
                    //    user නැවත වෙන number reply කරන්න පුළුවන්
                    await conn.sendMessage(from,
                        { text: '❌ *වැරදි අංකයක්! 1 සිට ' + topResults.length + ' දක්වා reply කරන්න.*' },
                        { quoted: inMsg }
                    );
                    return;
                }

                // ── Valid number — lock + listener off ──
                movieProcessing = true;
                conn.ev.off('messages.upsert', movieListener);

                const selectedMovie = topResults[selectedIndex];
                await conn.sendMessage(from, { react: { text: '🎬', key: inMsg.key } });

                // ── Step 4: Extract download links ──
                let extData;
                try {
                    extData = await safeFetch(
                        `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`
                    );
                } catch (e) {
                    return conn.sendMessage(from,
                        { text: `❌ *Details API Error:* ${e.message}` },
                        { quoted: inMsg }
                    );
                }

                if (!extData?.status || !Array.isArray(extData?.data) || extData.data.length === 0) {
                    return conn.sendMessage(from,
                        { text: '❌ *මෙම චිත්‍රපටියේ Download Links ලබාගත නොහැක.*' },
                        { quoted: inMsg }
                    );
                }

                // ── Step 5: Pick best link ──
                // is_direct_mp4 field නෑ නම් first link use කරනවා
                const directVideo = extData.data.find(v => v.is_direct_mp4 === true)
                                 || extData.data.find(v => v.link?.includes('.mp4'))
                                 || extData.data[0];
                const baseLink = directVideo?.link;

                if (!baseLink) {
                    return conn.sendMessage(from,
                        { text: '❌ *Valid Download Link ලබාගත නොහැක.*' },
                        { quoted: inMsg }
                    );
                }

                // ── Step 6: Quality selection ──
                const qualityList = [
                    { label: '🎥 480p (SD)', quality: '480p' },
                    { label: '🎥 720p (HD)', quality: '720p' }
                ];

                let qualityText = `🎬 *${selectedMovie.title || 'Unknown'}*\n\n`;
                qualityText += `📅 *Year:* ${selectedMovie.year || 'N/A'}\n`;
                qualityText += `🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n`;
                qualityText += `⭐ *IMDB:* ${selectedMovie.imdb || 'N/A'}\n\n`;
                qualityText += `👇 *ඔබට අවශ්‍ය Quality එකේ අංකය Reply කරන්න*\n\n`;
                qualityList.forEach((q, i) => {
                    qualityText += `*${i + 1}.* ${q.label}\n`;
                });
                qualityText += `\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                // Poster image හෝ text only
                let qualityMsg;
                const posterUrl = selectedMovie.img || selectedMovie.poster || selectedMovie.thumbnail;

                try {
                    if (posterUrl) {
                        qualityMsg = await conn.sendMessage(from, {
                            image: { url: posterUrl },
                            caption: qualityText
                        }, { quoted: inMsg });
                    } else {
                        qualityMsg = await conn.sendMessage(from,
                            { text: qualityText },
                            { quoted: inMsg }
                        );
                    }
                } catch {
                    // image load fail — text fallback
                    qualityMsg = await conn.sendMessage(from,
                        { text: qualityText },
                        { quoted: inMsg }
                    );
                }

                const qualityMsgId = qualityMsg?.key?.id;
                if (!qualityMsgId) return;

                // ── Step 7: Quality selection listener ──
                // ✅ Fix: same one-shot listener bug fix — processing lock use කරනවා
                let qualityProcessing = false;

                const qualityListener = async (update2) => {
                    if (update2.type === 'append') return;

                    const msgs2 = update2?.messages;
                    if (!Array.isArray(msgs2) || msgs2.length === 0) return;

                    for (const qMsg of msgs2) {
                        if (!qMsg?.message) continue;
                        if (qMsg.key?.remoteJid !== from) continue;
                        if (!isReplyTo(qMsg, qualityMsgId)) continue;
                        if (qualityProcessing) return;

                        const qReply  = getReplyText(qMsg);
                        const qIndex  = parseInt(qReply) - 1;

                        if (isNaN(qIndex) || qIndex < 0 || qIndex >= qualityList.length) {
                            // ✅ Invalid — error දෙලා listener live, user නැවත reply කරන්න පුළුවන්
                            await conn.sendMessage(from,
                                { text: '❌ *වැරදි අංකයක්! 1 හෝ 2 reply කරන්න.*' },
                                { quoted: qMsg }
                            );
                            return;
                        }

                        qualityProcessing = true;
                        conn.ev.off('messages.upsert', qualityListener);

                        const chosenQuality = qualityList[qIndex].quality;
                        const shortTitle    = (selectedMovie.title || 'Movie')
                            .substring(0, 30)
                            .replace(/[^a-zA-Z0-9 ]/g, '')
                            .trim();

                        await conn.sendMessage(from, { react: { text: '📥', key: qMsg.key } });
                        await conn.sendMessage(from,
                            { text: `⬇️ *Downloading ${shortTitle} (${chosenQuality})...*\n_WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` },
                            { quoted: FakeVCard }
                        );

                        // Quality URL replace
                        let finalUrl = baseLink;
                        if (chosenQuality === '480p') {
                            finalUrl = baseLink.replace(/(1080p|1080|720p|720)/gi, '480p');
                        } else if (chosenQuality === '720p') {
                            finalUrl = baseLink.replace(/(1080p|1080|480p|480)/gi, '720p');
                        }

                        // File size check
                        try {
                            const headRes = await axios.head(finalUrl, { timeout: 10000 });
                            const len     = headRes.headers?.['content-length'];
                            if (len) {
                                const sizeMB = parseInt(len) / (1024 * 1024);
                                if (sizeMB > 1950) {
                                    await conn.sendMessage(from, { react: { text: '❌', key: qMsg.key } });
                                    return conn.sendMessage(from,
                                        { text: `❌ *File too large: ${sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.` },
                                        { quoted: FakeVCard }
                                    );
                                }
                            }
                        } catch {
                            // head check fail — proceed anyway
                        }

                        // Send as document
                        const captionText =
                            `🎬 *${selectedMovie.title || shortTitle}* [${chosenQuality}]\n\n` +
                            `> 👤 Downloaded by: ${pushname}\n` +
                            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                        try {
                            await conn.sendMessage(from, {
                                document:  { url: finalUrl },
                                mimetype:  'video/mp4',
                                fileName:  `${shortTitle} - ${chosenQuality}.mp4`,
                                caption:   captionText
                            }, { quoted: FakeVCard });

                            await conn.sendMessage(from, { react: { text: '✅', key: qMsg.key } });
                        } catch (dlErr) {
                            await conn.sendMessage(from, { react: { text: '❌', key: qMsg.key } });
                            await conn.sendMessage(from,
                                { text: `❌ *Download Failed!*\n_${dlErr.message}_` },
                                { quoted: FakeVCard }
                            );
                        }
                    }
                };

                conn.ev.on('messages.upsert', qualityListener);
                setTimeout(() => {
                    if (!qualityProcessing) {
                        conn.ev.off('messages.upsert', qualityListener);
                    }
                }, 180000); // 3 min timeout
            }
        };

        conn.ev.on('messages.upsert', movieListener);
        setTimeout(() => {
            if (!movieProcessing) {
                conn.ev.off('messages.upsert', movieListener);
            }
        }, 180000); // 3 min timeout

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[CINESUBZ2 SEARCH ERROR]', e);
        reply('⚠️ *Error:* ' + e.message);
    }
});


// =================================================
// 2. CINESUBZ DIRECT DOWNLOAD (.cz_dl)
// =================================================
cmd({
    pattern:  'cz_dl',
    alias:    [],
    react:    '⬇️',
    desc:     'Download movie direct link (internal)',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, reply }) => {
    try {
        if (!q || !q.includes('||')) return;

        const parts = q.split(' || ');
        if (parts.length < 3) return;

        const [title, quality, originalUrl] = parts;
        if (!originalUrl?.startsWith('http')) return reply('❌ *Invalid URL*');

        await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });
        await conn.sendMessage(from,
            { text: `⬇️ *Downloading ${title} (${quality})...*\n_WhatsApp upload වීමට ටික වේලාවක් ගතවේ._` },
            { quoted: FakeVCard }
        );

        let finalUrl = originalUrl;
        if (quality === '480p') {
            finalUrl = originalUrl.replace(/(1080p|1080|720p|720)/gi, '480p');
        } else if (quality === '720p') {
            finalUrl = originalUrl.replace(/(1080p|1080|480p|480)/gi, '720p');
        }

        try {
            const headRes = await axios.head(finalUrl, { timeout: 10000 });
            const len     = headRes.headers?.['content-length'];
            if (len) {
                const sizeMB = parseInt(len) / (1024 * 1024);
                if (sizeMB > 1950) {
                    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                    return reply(`❌ *File too large: ${sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.`);
                }
            }
        } catch { /* skip */ }

        const captionText =
            `🎬 *${title}* [${quality}]\n\n` +
            `> 👤 Downloaded by: ${pushname}\n` +
            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        await conn.sendMessage(from, {
            document:  { url: finalUrl },
            mimetype:  'video/mp4',
            fileName:  `${title} - ${quality}.mp4`,
            caption:   captionText
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[CINESUBZ DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Download Failed! Link දෝෂ සහිතයි හෝ Expire වී ඇත.*');
    }
});
