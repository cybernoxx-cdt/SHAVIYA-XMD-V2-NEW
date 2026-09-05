// ============================================================
//  cinesubz2.js — SHAVIYA-XMD V2
//  Adapted for Cinesubz Movie Downloader (WhiteShadow API)
//  ✅ Numbered Reply System
//  ✅ 720p direct download ONLY — no 480p guessing, no broken links
//  🔧 Fix: removed unreliable quality-swap regex (was causing KB-size files)
//  🔧 Fix: removed extra quality-selection step (API only gives one real file)
//  🔧 Fix: download uses proper Referer/User-Agent headers (CDN hotlink protection)
//  🔧 Fix: link validity checked via small stream-sniff, not full-body download
//  🔧 Fix: reply listener detects replies reliably (stanzaId + id match)
//  🔧 Fix: type:'append' messages ignored
//  🔧 Fix: listener memory leak protection (processing lock + auto-cleanup timers)
//  🔧 Fix: bot number reply works (fromMe check removed)
// ============================================================

const { cmd } = require('../command');
const axios    = require('axios');

// node-fetch dynamic import (CommonJS safe)
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// ─────────────────────────────────────────────────────
// WhiteShadow Cinesubz API config
// ─────────────────────────────────────────────────────
const CINESUBZ_API_KEY     = 'e76n2P';
const CINESUBZ_SEARCH_URL  = 'https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-search';
const CINESUBZ_EXTRACT_URL = 'https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-extract';

// Cinesubz CDN links (sonic-cloud, evostream, etc.) need a proper
// Referer + User-Agent — without them they silently return a tiny
// error page instead of the real video.
const CINESUBZ_REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Referer': 'https://cinesubz.net/',
    'Accept': '*/*'
};

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
// ─────────────────────────────────────────────────────
function isReplyTo(incomingMsg, targetKeyId) {
    const msg = incomingMsg?.message;
    if (!msg) return false;

    const matchCtx = (ctx) => ctx?.stanzaId && ctx.stanzaId === targetKeyId;

    if (matchCtx(msg.extendedTextMessage?.contextInfo)) return true;
    if (matchCtx(msg.imageMessage?.contextInfo))    return true;
    if (matchCtx(msg.videoMessage?.contextInfo))    return true;
    if (matchCtx(msg.audioMessage?.contextInfo))    return true;
    if (matchCtx(msg.documentMessage?.contextInfo)) return true;
    if (matchCtx(msg.stickerMessage?.contextInfo))  return true;

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

    const direct = (
        msg.extendedTextMessage?.text ||
        msg.conversation ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        ''
    ).trim();
    if (direct) return direct;

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
// HELPER: URL එකේ embed වී තියෙන real quality එක detect කරනවා
// ─────────────────────────────────────────────────────
function detectQuality(url) {
    if (!url) return '720p';
    if (/2160p|4k/i.test(url))  return '4K';
    if (/1080p/i.test(url))     return '1080p';
    if (/720p/i.test(url))      return '720p';
    if (/480p/i.test(url))      return '480p';
    if (/360p/i.test(url))      return '360p';
    return '720p';
}

// ─────────────────────────────────────────────────────
// HELPER: link එක ඇත්තටම video file එකක්ද, KB size broken/error
// page එකක්ද කියලා confirm කරනවා. Stream එකෙන් පළමු ~64KB විතරක්
// sniff කරලා stop කරනවා — server Range header honor නොකළත්
// (movie multi-GB ගානක් තියෙන නිසා) full body එක wait වෙන්නෙ නෑ.
// ─────────────────────────────────────────────────────
async function checkVideoLink(url, timeoutMs = 15000) {
    let response;
    try {
        response = await axios.get(url, {
            timeout: timeoutMs,
            maxRedirects: 5,
            responseType: 'stream',
            headers: { ...CINESUBZ_REQUEST_HEADERS, Range: 'bytes=0-65535' },
            validateStatus: s => s < 500
        });
    } catch {
        return { ok: false, sizeMB: null, contentType: null, looksValid: false };
    }

    const contentType   = (response.headers?.['content-type'] || '').toLowerCase();
    const contentRange   = response.headers?.['content-range']; // "bytes 0-65535/734003200"
    const contentLength  = response.headers?.['content-length'];

    let sizeMB = null;
    if (contentRange) {
        const m = contentRange.match(/\/(\d+)$/);
        if (m) sizeMB = parseInt(m[1]) / (1024 * 1024);
    } else if (contentLength && response.status === 200) {
        sizeMB = parseInt(contentLength) / (1024 * 1024);
    }

    const MAX_SNIFF_BYTES = 65536;
    const chunks = [];
    let received = 0;

    await new Promise((resolve) => {
        const stream = response.data;
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(safetyTimer);
            try { stream.destroy(); } catch {}
            resolve();
        };
        const safetyTimer = setTimeout(finish, 8000); // never wait more than 8s to sniff

        stream.on('data', (chunk) => {
            chunks.push(chunk);
            received += chunk.length;
            if (received >= MAX_SNIFF_BYTES) finish();
        });
        stream.on('end', finish);
        stream.on('error', finish);
    });

    const buf = Buffer.concat(chunks);
    const sniff = buf.toString('latin1', 0, Math.min(buf.length, 512)).toLowerCase();
    const looksLikeError = sniff.includes('<html') || sniff.includes('<!doctype') ||
                            sniff.includes('"success"') || sniff.includes('"error"') ||
                            sniff.includes('not found') || sniff.includes('forbidden');

    const looksValid = response.status < 400 && !looksLikeError && buf.length > 1000 &&
                        (sizeMB === null || sizeMB >= 5);

    return { ok: true, sizeMB, contentType, looksValid };
}

// ─────────────────────────────────────────────────────
// HELPER: video එක proper headers එක්කම fetch කරලා stream
// එකක් විදිහට ලබාදෙනවා (hotlink protection bypass)
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
// CINESUBZ MOVIE SEARCH & DOWNLOAD (.cz2) — 720p ONLY
// =================================================
cmd({
    pattern:  'cz2',
    alias:    ['cinesubz2'],
    react:    '🎬',
    desc:     'Search and Download movies from Cinesubz (720p)',
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
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> 🎥 720p Quality\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });

        const listMsgId = listMsg?.key?.id;
        if (!listMsgId) {
            return reply('❌ *Internal error: message key ලැබුණේ නැත. නැවත උත්සාහ කරන්න.*');
        }

        // ── Step 3: Movie selection listener ──
        let movieProcessing = false;

        const movieListener = async (update) => {
            if (update.type === 'append') return;

            const msgs = update?.messages;
            if (!Array.isArray(msgs) || msgs.length === 0) return;

            for (const inMsg of msgs) {
                if (!inMsg?.message) continue;
                if (inMsg.key?.remoteJid !== from) continue;
                if (!isReplyTo(inMsg, listMsgId)) continue;
                if (movieProcessing) return;

                const userReply     = getReplyText(inMsg);
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
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

                // ── Step 4: Extract download link ──
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

                // ── Step 5: Pick the best mp4 link ──
                const directVideo = extData.results.find(v => v.is_direct_mp4 === true)
                                 || extData.results.find(v => v.type === 'mp4' && v.link?.includes('.mp4'))
                                 || extData.results.find(v => v.link?.includes('.mp4'))
                                 || extData.results[0];
                const baseLink = directVideo?.link;

                if (!baseLink || !baseLink.startsWith('http')) {
                    return conn.sendMessage(from,
                        { text: '❌ *Valid Download Link ලබාගත නොහැක.*' },
                        { quoted: inMsg }
                    );
                }

                const quality = detectQuality(baseLink);

                // ── Step 6: Validate the link BEFORE attempting download ──
                await conn.sendMessage(from, { react: { text: '🔎', key: inMsg.key } });
                const check = await checkVideoLink(baseLink);

                if (!check.ok || !check.looksValid) {
                    await conn.sendMessage(from, { react: { text: '❌', key: inMsg.key } });
                    return conn.sendMessage(from,
                        { text: '❌ *Link එක broken/expire වී ඇත.*\n_වෙනත් movie එකක් උත්සාහ කරන්න._' },
                        { quoted: FakeVCard }
                    );
                }
                if (check.sizeMB && check.sizeMB > 1950) {
                    await conn.sendMessage(from, { react: { text: '❌', key: inMsg.key } });
                    return conn.sendMessage(from,
                        { text: `❌ *File too large: ${check.sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.` },
                        { quoted: FakeVCard }
                    );
                }

                // ── Step 7: Download & send ──
                const shortTitle = (selectedMovie.title || 'Movie')
                    .substring(0, 30)
                    .replace(/[^a-zA-Z0-9 ]/g, '')
                    .trim();

                await conn.sendMessage(from, { react: { text: '📥', key: inMsg.key } });
                await conn.sendMessage(from,
                    { text: `⬇️ *Downloading ${shortTitle} (${quality})...*\n_WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` },
                    { quoted: FakeVCard }
                );

                const captionText =
                    `🎬 *${selectedMovie.title || shortTitle}* [${quality}]\n\n` +
                    `> 👤 Downloaded by: ${pushname}\n` +
                    `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                try {
                    const videoStream = await getVideoStream(baseLink);
                    await conn.sendMessage(from, {
                        document:  { stream: videoStream },
                        mimetype:  'video/mp4',
                        fileName:  `${shortTitle} - ${quality}.mp4`,
                        caption:   captionText
                    }, { quoted: FakeVCard });

                    await conn.sendMessage(from, { react: { text: '✅', key: inMsg.key } });
                } catch (dlErr) {
                    await conn.sendMessage(from, { react: { text: '❌', key: inMsg.key } });
                    await conn.sendMessage(from,
                        { text: `❌ *Download Failed!*\n_${dlErr.message}_` },
                        { quoted: FakeVCard }
                    );
                }
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
// CINESUBZ DIRECT DOWNLOAD (.cz_dl) — internal utility
// Usage: .cz_dl Title || https://direct.mp4.link
// =================================================
cmd({
    pattern:  'cz_dl',
    alias:    [],
    react:    '⬇️',
    desc:     'Download movie from a direct link (internal)',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, reply }) => {
    try {
        if (!q || !q.includes('||')) return;

        const parts = q.split(' || ');
        if (parts.length < 2) return;

        const [title, originalUrl] = parts;
        if (!originalUrl?.startsWith('http')) return reply('❌ *Invalid URL*');

        await conn.sendMessage(from, { react: { text: '🔎', key: mek.key } });
        const check = await checkVideoLink(originalUrl);
        if (!check.ok || !check.looksValid) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('❌ *Link එක broken/expire වී ඇත (file size ඉතා කුඩායි).*\n_වෙනත් link එකක් උත්සාහ කරන්න._');
        }
        if (check.sizeMB && check.sizeMB > 1950) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *File too large: ${check.sizeMB.toFixed(1)} MB*\nWhatsApp 2GB limit exceed කර ඇත.`);
        }

        const quality = detectQuality(originalUrl);

        await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });
        await conn.sendMessage(from,
            { text: `⬇️ *Downloading ${title} (${quality})...*\n_WhatsApp upload වීමට ටික වේලාවක් ගතවේ._` },
            { quoted: FakeVCard }
        );

        const captionText =
            `🎬 *${title}* [${quality}]\n\n` +
            `> 👤 Downloaded by: ${pushname}\n` +
            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        try {
            const videoStream = await getVideoStream(originalUrl);
            await conn.sendMessage(from, {
                document:  { stream: videoStream },
                mimetype:  'video/mp4',
                fileName:  `${title} - ${quality}.mp4`,
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
