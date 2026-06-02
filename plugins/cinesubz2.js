// ============================================================
//  cinesubz2.js — SHAVIYA-XMD V2
//  ✅ FULLY FIXED: Multi number reply support
//  🔧 Fix: Global single listener (ev.off bug bypassed)
//  🔧 Fix: 1 2 3 / 1,2,3 / 1-3 / single — all formats work
//  🔧 Fix: Bot number (BH numbers) reply works
//  🔧 Fix: Each movie sent separately
// ============================================================

const { cmd } = require('../command');
const axios    = require('axios');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

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
// HELPER: stanzaId ගැනීම — සියලු message types
// ─────────────────────────────────────────────────────
function getStanzaId(inMsg) {
    const msg = inMsg?.message;
    if (!msg) return null;

    const checks = [
        msg.extendedTextMessage?.contextInfo,
        msg.imageMessage?.contextInfo,
        msg.videoMessage?.contextInfo,
        msg.audioMessage?.contextInfo,
        msg.documentMessage?.contextInfo,
        msg.stickerMessage?.contextInfo,
    ];
    for (const ctx of checks) {
        if (ctx?.stanzaId) return ctx.stanzaId;
    }

    const inner = msg.ephemeralMessage?.message
               || msg.viewOnceMessage?.message
               || msg.viewOnceMessageV2?.message;
    if (inner) {
        for (const key of Object.keys(inner)) {
            if (inner[key]?.contextInfo?.stanzaId) return inner[key].contextInfo.stanzaId;
        }
    }
    return null;
}

function getMsgText(inMsg) {
    const msg = inMsg?.message;
    if (!msg) return '';
    return (
        msg.extendedTextMessage?.text ||
        msg.conversation ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.ephemeralMessage?.message?.extendedTextMessage?.text ||
        msg.ephemeralMessage?.message?.conversation ||
        ''
    ).trim();
}

// ─────────────────────────────────────────────────────
// HELPER: Multi-number parse
//   "1"       → [0]
//   "1 3 5"   → [0,2,4]
//   "1,2,3"   → [0,1,2]
//   "1-3"     → [0,1,2]
//   Mixed ok: "1,3 5" → [0,2,4]
// ─────────────────────────────────────────────────────
function parseNumbers(txt, max) {
    const indices = new Set();

    // range: "2-5"
    const rangeMatch = txt.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
        const a = parseInt(rangeMatch[1]);
        const b = parseInt(rangeMatch[2]);
        for (let n = Math.min(a, b); n <= Math.max(a, b); n++) {
            if (n >= 1 && n <= max) indices.add(n - 1);
        }
        return [...indices];
    }

    // space/comma separated
    const parts = txt.split(/[\s,，]+/);
    for (const p of parts) {
        const n = parseInt(p);
        if (!isNaN(n) && n >= 1 && n <= max) indices.add(n - 1);
    }
    return [...indices];
}

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

// ──────────────────────────────────────────────────────
// HELPER: Movie download links ගෙනල්ලා quality msg යවනවා
// ──────────────────────────────────────────────────────
async function sendQualityPrompt(conn, jid, movie, inMsg, pushname) {
    let extData;
    try {
        extData = await safeFetch(
            `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movie.id}&type=mv`
        );
    } catch (e) {
        await conn.sendMessage(jid,
            { text: `❌ *"${movie.title}" — Details API Error:* ${e.message}` },
            { quoted: inMsg }
        );
        return;
    }

    if (!extData?.status || !Array.isArray(extData?.data) || extData.data.length === 0) {
        await conn.sendMessage(jid,
            { text: `❌ *"${movie.title}" — Download Links ලබාගත නොහැක.*` },
            { quoted: inMsg }
        );
        return;
    }

    const directVideo = extData.data.find(v => v.is_direct_mp4 === true)
                     || extData.data.find(v => v.link?.includes('.mp4'))
                     || extData.data[0];
    const baseLink = directVideo?.link;

    if (!baseLink) {
        await conn.sendMessage(jid,
            { text: `❌ *"${movie.title}" — Valid Link නැත.*` },
            { quoted: inMsg }
        );
        return;
    }

    const qualityList = [
        { label: '🎥 480p (SD)', quality: '480p' },
        { label: '🎥 720p (HD)', quality: '720p' }
    ];

    let qualityText = `🎬 *${movie.title || 'Unknown'}*\n\n`;
    qualityText += `📅 *Year:* ${movie.year || 'N/A'}\n`;
    qualityText += `🎭 *Genres:* ${movie.genres || 'N/A'}\n`;
    qualityText += `⭐ *IMDB:* ${movie.imdb || 'N/A'}\n\n`;
    qualityText += `👇 *Quality Reply කරන්න*\n\n`;
    qualityList.forEach((q, i) => { qualityText += `*${i + 1}.* ${q.label}\n`; });
    qualityText += `\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

    const posterUrl = movie.img || movie.poster || movie.thumbnail;
    let qualityMsg;
    try {
        qualityMsg = posterUrl
            ? await conn.sendMessage(jid, { image: { url: posterUrl }, caption: qualityText }, { quoted: inMsg })
            : await conn.sendMessage(jid, { text: qualityText }, { quoted: inMsg });
    } catch {
        qualityMsg = await conn.sendMessage(jid, { text: qualityText }, { quoted: inMsg });
    }

    const qMsgId = qualityMsg?.key?.id;
    if (!qMsgId) return;

    // Register quality session
    const qTimer = setTimeout(() => sessions.delete(qMsgId), 10 * 60 * 1000);
    sessions.set(qMsgId, {
        type: 'quality_select',
        from: jid,
        conn,
        pushname,
        timer: qTimer,
        data: { movie, baseLink, qualityList }
    });
}

// ══════════════════════════════════════════════════════
//  GLOBAL SESSION STORE
// ══════════════════════════════════════════════════════
const sessions = new Map();
let globalListenerAttached = false;

function attachGlobal(conn) {
    if (globalListenerAttached) return;
    globalListenerAttached = true;

    conn.ev.on('messages.upsert', async (update) => {
        if (update.type === 'append') return;
        const msgs = update?.messages;
        if (!Array.isArray(msgs)) return;

        for (const inMsg of msgs) {
            try {
                if (!inMsg?.message) continue;

                const stanzaId = getStanzaId(inMsg);
                if (!stanzaId) continue;

                const session = sessions.get(stanzaId);
                if (!session) continue;

                const jid = inMsg.key?.remoteJid;
                if (jid !== session.from) continue;

                const txt = getMsgText(inMsg);
                if (!txt) continue;

                // ── Movie selection ──
                if (session.type === 'movie_select') {
                    const list = session.data.topResults;
                    const indices = parseNumbers(txt, list.length);

                    if (indices.length === 0) {
                        await conn.sendMessage(jid,
                            { text: `❌ *වැරදි! 1 සිට ${list.length} දක්වා reply කරන්න.*\n_උදා: 1 · 1 3 · 1,2,3 · 1-3_` },
                            { quoted: inMsg }
                        );
                        continue; // listener live
                    }

                    // Valid — remove session
                    clearTimeout(session.timer);
                    sessions.delete(stanzaId);

                    await conn.sendMessage(jid, { react: { text: '🎬', key: inMsg.key } });

                    // Each selected movie → quality prompt
                    for (const idx of indices) {
                        await sendQualityPrompt(conn, jid, list[idx], inMsg, session.pushname);
                    }
                }

                // ── Quality selection ──
                else if (session.type === 'quality_select') {
                    const { movie, baseLink, qualityList } = session.data;
                    const indices = parseNumbers(txt, qualityList.length);

                    if (indices.length === 0) {
                        await conn.sendMessage(jid,
                            { text: '❌ *වැරදි! 1 හෝ 2 reply කරන්න.*\n_480p=1 · 720p=2 · දෙකම=1 2_' },
                            { quoted: inMsg }
                        );
                        continue;
                    }

                    clearTimeout(session.timer);
                    sessions.delete(stanzaId);

                    const shortTitle = (movie.title || 'Movie')
                        .substring(0, 30)
                        .replace(/[^a-zA-Z0-9 ]/g, '')
                        .trim();

                    await conn.sendMessage(jid, { react: { text: '📥', key: inMsg.key } });

                    for (const idx of indices) {
                        const chosenQuality = qualityList[idx].quality;

                        await conn.sendMessage(jid,
                            { text: `⬇️ *Downloading ${shortTitle} (${chosenQuality})...*\n_Upload වීමට ටික වේලාවක් ගත විය හැක._` },
                            { quoted: FakeVCard }
                        );

                        let finalUrl = baseLink;
                        if (chosenQuality === '480p') finalUrl = baseLink.replace(/(1080p|1080|720p|720)/gi, '480p');
                        else if (chosenQuality === '720p') finalUrl = baseLink.replace(/(1080p|1080|480p|480)/gi, '720p');

                        try {
                            const headRes = await axios.head(finalUrl, { timeout: 10000 });
                            const len = headRes.headers?.['content-length'];
                            if (len && parseInt(len) / (1024 * 1024) > 1950) {
                                await conn.sendMessage(jid,
                                    { text: `❌ *${chosenQuality} — File too large! WhatsApp 2GB limit exceed.*` },
                                    { quoted: FakeVCard }
                                );
                                continue;
                            }
                        } catch { /* skip */ }

                        const captionText =
                            `🎬 *${movie.title || shortTitle}* [${chosenQuality}]\n\n` +
                            `> 👤 Downloaded by: ${session.pushname}\n` +
                            `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                        try {
                            await conn.sendMessage(jid, {
                                document:  { url: finalUrl },
                                mimetype:  'video/mp4',
                                fileName:  `${shortTitle} - ${chosenQuality}.mp4`,
                                caption:   captionText
                            }, { quoted: FakeVCard });
                            await conn.sendMessage(jid, { react: { text: '✅', key: inMsg.key } });
                        } catch (dlErr) {
                            await conn.sendMessage(jid, { react: { text: '❌', key: inMsg.key } });
                            await conn.sendMessage(jid,
                                { text: `❌ *${chosenQuality} Download Failed!*\n_${dlErr.message}_` },
                                { quoted: FakeVCard }
                            );
                        }
                    }
                }

            } catch (e) {
                console.error('[CZ2 GLOBAL HANDLER]', e.message);
            }
        }
    });
}

// ══════════════════════════════════════════════════════
//  .cz2 COMMAND
// ══════════════════════════════════════════════════════
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
        if (!q) return reply('🎬 *කරුණාකර Movie නම ලබා දෙන්න!*\n_උදා: .cz2 batman_');

        attachGlobal(conn);

        const query = q.trim();
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let data;
        try {
            data = await safeFetch(
                `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`
            );
        } catch (e) {
            return reply(`❌ *Search API Error:* ${e.message}`);
        }

        if (!data?.status || !Array.isArray(data?.data) || data.data.length === 0) {
            return reply('❌ *සමාවෙන්න, Movies හමුවූයේ නැත.*');
        }

        const topResults = data.data.slice(0, 10);

        let listText = `🎬 *CINESUBZ MOVIE SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n👤 *User:* ${pushname}\n\n👇 *අංකය Reply කරන්න*\n_(Multiple: 1 3 · 1,2,3 · 1-3)_\n\n`;
        topResults.forEach((mv, i) => {
            listText += `*${i + 1}.* ${mv.title || 'Unknown'} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> *Reply with 1 - ${topResults.length}*\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });
        const listMsgId = listMsg?.key?.id;
        if (!listMsgId) return reply('❌ *Internal error. නැවත උත්සාහ කරන්න.*');

        // Clean old sessions for this chat
        for (const [id, ses] of sessions.entries()) {
            if (ses.from === from) {
                clearTimeout(ses.timer);
                sessions.delete(id);
            }
        }

        // Register session (10 min)
        const timer = setTimeout(() => sessions.delete(listMsgId), 10 * 60 * 1000);
        sessions.set(listMsgId, {
            type: 'movie_select',
            from,
            conn,
            pushname,
            timer,
            data: { topResults }
        });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[CZ2 CMD ERROR]', e);
        reply('⚠️ *Error:* ' + e.message);
    }
});


// ══════════════════════════════════════════════════════
//  .cz_dl DIRECT DOWNLOAD COMMAND
// ══════════════════════════════════════════════════════
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
            { text: `⬇️ *Downloading ${title} (${quality})...*` },
            { quoted: FakeVCard }
        );

        let finalUrl = originalUrl;
        if (quality === '480p') finalUrl = originalUrl.replace(/(1080p|1080|720p|720)/gi, '480p');
        else if (quality === '720p') finalUrl = originalUrl.replace(/(1080p|1080|480p|480)/gi, '720p');

        try {
            const headRes = await axios.head(finalUrl, { timeout: 10000 });
            const len = headRes.headers?.['content-length'];
            if (len && parseInt(len) / (1024 * 1024) > 1950) {
                return reply(`❌ *File too large! WhatsApp 2GB limit exceed.*`);
            }
        } catch { /* skip */ }

        await conn.sendMessage(from, {
            document:  { url: finalUrl },
            mimetype:  'video/mp4',
            fileName:  `${title} - ${quality}.mp4`,
            caption:   `🎬 *${title}* [${quality}]\n\n> 👤 Downloaded by: ${pushname}\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[CZ_DL ERROR]', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Download Failed!*');
    }
});
