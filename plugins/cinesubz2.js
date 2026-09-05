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

// ─────────────────────────────────────────────────────
// WhiteShadow Cinesubz API config
// ─────────────────────────────────────────────────────
const CINESUBZ_API_KEY    = 'e76n2P';
const CINESUBZ_SEARCH_URL = 'https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-search';
const CINESUBZ_EXTRACT_URL = 'https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-extract';

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

// ─────────────────────────────────────────────────────
// HELPER: URL එකේ ඇත්තටම embed වී තියෙන quality එක detect කරනවා
// (filename patterns: 2160p/4K, 1080p, 720p, 480p, 360p)
// ─────────────────────────────────────────────────────
function detectQuality(url) {
    if (!url) return null;
    if (/2160p|4k/i.test(url))  return '4K';
    if (/1080p/i.test(url))     return '1080p';
    if (/720p/i.test(url))      return '720p';
    if (/480p/i.test(url))      return '480p';
    if (/360p/i.test(url))      return '360p';
    return null;
}

// ─────────────────────────────────────────────────────
// Cinesubz CDN links (sonic-cloud, evostream, etc.) often need a
// proper Referer + User-Agent — without them they silently return
// a tiny error page instead of the real video (this is the actual
// cause of "KB size" downloads, not just wrong-quality guessing).
// ─────────────────────────────────────────────────────
const CINESUBZ_REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Referer': 'https://cinesubz.net/',
    'Accept': '*/*'
};

// ─────────────────────────────────────────────────────
// HELPER: link එක ඇත්තටම video file එකක්ද, KB size broken/error
// page එකක්ද කියලා confirm කරන්න actual headers යොදාගෙන ranged
// GET එකකින් bytes කිහිපයක් fetch කරලා sniff කරනවා (HEAD request
// එකකට වඩා reliable — CDN එක HEAD වලට වෙනස් විදිහට behave වෙන්නත් පුළුවන්)
// ─────────────────────────────────────────────────────
async function checkVideoLink(url, timeoutMs = 15000) {
    try {
        const res = await axios.get(url, {
            timeout: timeoutMs,
            maxRedirects: 5,
            responseType: 'arraybuffer',
            headers: { ...CINESUBZ_REQUEST_HEADERS, Range: 'bytes=0-65535' },
            validateStatus: s => s < 500
        });

        const buf          = Buffer.from(res.data || []);
        const contentType  = (res.headers?.['content-type'] || '').toLowerCase();
        const contentRange = res.headers?.['content-range']; // e.g. "bytes 0-65535/734003200"

        let sizeMB = null;
        if (contentRange) {
            const m = contentRange.match(/\/(\d+)$/);
            if (m) sizeMB = parseInt(m[1]) / (1024 * 1024);
        } else if (res.headers?.['content-length'] && res.status === 200) {
            sizeMB = parseInt(res.headers['content-length']) / (1024 * 1024);
        }

        // Real video bytes won't look like an HTML/JSON error page
        const sniff = buf.toString('latin1', 0, Math.min(buf.length, 512)).toLowerCase();
        const looksLikeError = sniff.includes('<html') || sniff.includes('<!doctype') ||
                                sniff.includes('"success"') || sniff.includes('"error"') ||
                                sniff.includes('not found') || sniff.includes('forbidden');

        const looksValid = res.status < 400 && !looksLikeError && buf.length > 1000 &&
                            (sizeMB === null || sizeMB >= 5);

        return { ok: true, sizeMB, contentType, looksValid };
    } catch {
        return { ok: false, sizeMB: null, contentType: null, looksValid: false };
    }
}

// ─────────────────────────────────────────────────────
// HELPER: video එක Baileys ට direct url එකක් විදිහට දෙනවා වෙනුවට,
// අපිම proper headers (Referer/User-Agent) එක්කම fetch කරලා
// stream එකක් විදිහට ලබාදෙනවා — hotlink-protected CDN links
// වලින් KB size error page එනවට හේතුව මෙයයි.
// ─────────────────────────────────────────────────────
async function getVideoStream(url) {
    const res = await axios.get(url, {
        responseType: 'stream',
        maxRedirects: 5,
        headers: CINESUBZ_REQUEST_HEADERS
    });
    return res.data;
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

        // ── Step 1: Search (WhiteShadow Cinesubz API) ──
        let data;
        try {
            data = await safeFetch(
                `${CINESUBZ_SEARCH_URL}?q=${encodeURIComponent(query)}&apitoken=${CINESUBZ_API_KEY}`
            );
        } catch (e) {
            return reply(`❌ *Search API Error:* ${e.message}\n_API offline හෝ network issue_`);
        }

        if (!data?.success || !Array.isArray(data?.results) || data.results.length === 0) {
            return reply('❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*');
        }

        const topResults = data.results.slice(0, 10);

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

                // ── Step 4: Extract download links (WhiteShadow Cinesubz API) ──
                let extData;
                try {
                    extData = await safeFetch(
                        `${CINESUBZ_EXTRACT_URL}?id=${selectedMovie.id}&type=mv&apitoken=${CINESUBZ_API_KEY}`
                    );
                } catch (e) {
                    return conn.sendMessage(from,
                        { text: `❌ *Details API Error:* ${e.message}` },
                        { quoted: inMsg }
                    );
                }

                if (!extData?.success || !Array.isArray(extData?.results) || extData.results.length === 0) {
                    return conn.sendMessage(from,
                        { text: '❌ *මෙම චිත්‍රපටියේ Download Links ලබාගත නොහැක.*' },
                        { quoted: inMsg }
                    );
                }

                // ── Step 5: Pick best link ──
                // is_direct_mp4 field නෑ නම් first link use කරනවා
                const directVideo = extData.results.find(v => v.is_direct_mp4 === true)
                                 || extData.results.find(v => v.type === 'mp4' && v.link?.includes('.mp4'))
                                 || extData.results.find(v => v.link?.includes('.mp4'))
                                 || extData.results[0];
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

                        // Quality URL replace (guess) — then VALIDATE it actually exists
                        const actualQuality = detectQuality(baseLink) || 'Original';
                        let finalUrl = baseLink;
                        let usedQuality = actualQuality;

                        if (chosenQuality === '480p') {
                            finalUrl = baseLink.replace(/(1080p|1080|720p|720)/gi, '480p');
                        } else if (chosenQuality === '720p') {
                            finalUrl = baseLink.replace(/(1080p|1080|480p|480)/gi, '720p');
                        }

                        if (finalUrl !== baseLink) {
                            // requested quality is a guessed URL — confirm it's a real video, not a KB-size error page
                            const check = await checkVideoLink(finalUrl);
                            const validType = !check.contentType || /video|octet-stream|mp4/i.test(check.contentType);

                            if (!check.ok || !check.looksValid || !validType) {
                                // Guessed quality doesn't actually exist — fall back to the real link
                                finalUrl     = baseLink;
                                usedQuality  = actualQuality;
                                await conn.sendMessage(from,
                                    { text: `⚠️ *${chosenQuality} quality මෙම movie එකට නොමැත.*\n_ලබාගත හැකි quality (${actualQuality}) එකෙන් download කරමින්..._` },
                                    { quoted: qMsg }
                                );
                            } else {
                                usedQuality = chosenQuality;
                            }
                        }

                        // Final size check on the link we're actually going to send
                        const finalCheck = await checkVideoLink(finalUrl);
                        if (finalCheck.ok && !finalCheck.looksValid) {
                            await conn.sendMessage(from, { react: { text: '❌', key: qMsg.key } });
                            return conn.sendMessage(from,
                                { text: `❌ *Link එක broken/expire වී ඇත (file size ඉතා කුඩායි).*\n_වෙනත් movie එකක් උත්සාහ කරන්න._` },
                                { quoted: FakeVCard }
                            );
                        }
                        if (finalCheck.ok && finalCheck.sizeMB && finalCheck.sizeMB > 1950) {
                            await conn.sendMessage(from, { react: { text: '❌', key: qMsg.key } });
                            return conn.sendMessage(from,
                                { text: `❌ *File too large: ${finalCheck.sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.`,
                                }, { quoted: FakeVCard }
                            );
                        }

                        // Send as document
                        const captionText =
                            `🎬 *${selectedMovie.title || shortTitle}* [${usedQuality}]\n\n` +
                            `> 👤 Downloaded by: ${pushname}\n` +
                            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                        try {
                            const videoStream = await getVideoStream(finalUrl);
                            await conn.sendMessage(from, {
                                document:  { stream: videoStream },
                                mimetype:  'video/mp4',
                                fileName:  `${shortTitle} - ${usedQuality}.mp4`,
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
                // Auto-cleanup: 3 min timeout — off listener if user never replies
                const qualityTimer = setTimeout(() => {
                    if (!qualityProcessing) {
                        conn.ev.off('messages.upsert', qualityListener);
                    }
                }, 180000);
            }
        };

        conn.ev.on('messages.upsert', movieListener);
        // Auto-cleanup: 3 min timeout — off listener if user never replies
        setTimeout(() => {
            if (!movieProcessing) conn.ev.off('messages.upsert', movieListener);
        }, 180000);

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

        let usedQuality = quality;
        if (finalUrl !== originalUrl) {
            const check = await checkVideoLink(finalUrl);
            const validType = !check.contentType || /video|octet-stream|mp4/i.test(check.contentType);
            if (!check.ok || !check.looksValid || !validType) {
                // guessed quality URL doesn't actually exist — fall back to the real link
                finalUrl    = originalUrl;
                usedQuality = detectQuality(originalUrl) || 'Original';
                await conn.sendMessage(from,
                    { text: `⚠️ *${quality} quality මෙම movie එකට නොමැත.*\n_ලබාගත හැකි quality (${usedQuality}) එකෙන් download කරමින්..._` },
                    { quoted: FakeVCard }
                );
            }
        }

        const finalCheck = await checkVideoLink(finalUrl);
        if (finalCheck.ok && !finalCheck.looksValid) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('❌ *Link එක broken/expire වී ඇත (file size ඉතා කුඩායි).*\n_වෙනත් movie එකක් උත්සාහ කරන්න._');
        }
        if (finalCheck.ok && finalCheck.sizeMB && finalCheck.sizeMB > 1950) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *File too large: ${finalCheck.sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.`);
        }

        const captionText =
            `🎬 *${title}* [${usedQuality}]\n\n` +
            `> 👤 Downloaded by: ${pushname}\n` +
            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        try {
            const videoStream = await getVideoStream(finalUrl);
            await conn.sendMessage(from, {
                document:  { stream: videoStream },
                mimetype:  'video/mp4',
                fileName:  `${title} - ${usedQuality}.mp4`,
                caption:   captionText
            }, { quoted: FakeVCard });

            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        } catch (dlErr) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed!*\n_${dlErr.message}_`);
        }

    } catch (e) {
        console.error('[CINESUBZ DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Download Failed! Link දෝෂ සහිතයි හෝ Expire වී ඇත.*');
    }
});
