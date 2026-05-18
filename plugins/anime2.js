// ============================================================
//  animeclub.js — SHAVIYA-XMD V2
//  🎌 Anime Downloader Plugin — animeclubdl.zone.id
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd } = require('../command');
const axios   = require('axios');

// ─── API ─────────────────────────────────────────────────────
const API_BASE   = 'https://animeclubdl.zone.id/api';
const SEARCH_API = (q)         => `${API_BASE}/search?q=${encodeURIComponent(q)}`;
const INFO_API   = (url)       => `${API_BASE}/info?url=${encodeURIComponent(url)}`;
const BYPASS_API = (link, ref) => `${API_BASE}/bypass?link=${encodeURIComponent(link)}&referer=${encodeURIComponent(ref || '')}`;

// ─── SESSION STORE ───────────────────────────────────────────
if (!global._animeSearchSessions) global._animeSearchSessions = new Map();
if (!global._animeEpSessions)     global._animeEpSessions     = new Map();

// ─── FakeVCard ───────────────────────────────────────────────
const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra · SHAVIYA-XMD V2',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

// ─── HELPERS ─────────────────────────────────────────────────
function sKey(from, sender) {
    return `${from}::${sender}`;
}

function trimTitle(t, max = 45) {
    return t && t.length > max ? t.slice(0, max) + '…' : (t || 'Unknown');
}

async function apiGet(url) {
    const res = await axios.get(url, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36' }
    });
    return res.data;
}

// ─────────────────────────────────────────────────────────────
// NUMBERED REPLY ROUTER  (on:'text')
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:            /^[0-9]+$/,
    on:                 'text',
    fromMe:             false,
    desc:               '',
    category:           'anime-internal',
    dontAddCommandList: true,
    filename:           __filename
},
async (conn, mek, m, { from, sender, body }) => {
    const num    = parseInt(body.trim());
    const key    = sKey(from, sender);
    const stanza = mek.message?.extendedTextMessage?.contextInfo?.stanzaId || null;

    // ── Step 2: Episode selection ──
    const epSess = global._animeEpSessions.get(key);
    if (epSess && epSess.msgId === stanza) {
        global._animeEpSessions.delete(key);
        return await doDownload(conn, mek, from, sender, epSess, num);
    }

    // ── Step 1: Anime selection ──
    const srSess = global._animeSearchSessions.get(key);
    if (!srSess || srSess.msgId !== stanza) return;
    global._animeSearchSessions.delete(key);
    await doAnimeInfo(conn, mek, from, sender, srSess, num);
});

// ─────────────────────────────────────────────────────────────
// .anime — MAIN COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'anime2',
    alias:    ['an2'],
    react:    '🎌',
    desc:     'Search & Download Anime from AnimeClub',
    category: 'anime',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) return reply(
            '🎌 *Anime නමක් දෙන්න!*\n\n'
            + '_Example:_ `.anime naruto`\n\n'
            + '*How it works:*\n'
            + '1️⃣ `.anime <name>` type කරන්න\n'
            + '2️⃣ List ලැබෙනවා → Anime අංකය reply කරන්න\n'
            + '3️⃣ Episodes list → Episode අංකය reply කරන්න\n'
            + '4️⃣ Auto Download! ✅'
        );

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const data    = await apiGet(SEARCH_API(q));
        const results = Array.isArray(data)
            ? data
            : (data.results || data.data || data.items || []);

        if (!results.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *"${q}" ගැන Anime හමු නොවිණි.*`);
        }

        const top = results.slice(0, 10);

        let text  = `🎌 *ANIMECLUB SEARCH*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `🔍 *Search:* ${q}\n`;
            text += `👤 *User:* ${pushname}\n`;
            text += `📦 *Found:* ${top.length} results\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            text += `👇 *Anime අංකය Reply කරන්න*\n\n`;

        top.forEach((item, i) => {
            const title = trimTitle(item.title || item.name || `Anime ${i + 1}`);
            const year  = item.year || item.released || '';
            const type  = item.type || item.format   || '';
            const eps   = item.episodes || item.totalEpisodes || '';
            const meta  = [type, year, eps ? `${eps} eps` : ''].filter(Boolean).join(' · ');
            text += `*${i + 1}.* ${title}\n`;
            if (meta) text += `     📌 _${meta}_\n`;
            text += '\n';
        });

        text += `> ⏱️ Reply timeout: 2 mins\n`;
        text += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        const sent = await conn.sendMessage(from, { text }, { quoted: FakeVCard });
        const key  = sKey(from, sender);

        global._animeSearchSessions.set(key, {
            msgId: sent.key.id,
            results: top,
            pushname
        });

        setTimeout(() => {
            const s = global._animeSearchSessions.get(key);
            if (s && s.msgId === sent.key.id) global._animeSearchSessions.delete(key);
        }, 120000);

        await conn.sendMessage(from, { react: { text: '🎌', key: mek.key } });

    } catch (e) {
        console.error('[ANIME SEARCH ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Search Failed!*\n_' + e.message + '_');
    }
});

// ─────────────────────────────────────────────────────────────
// doAnimeInfo — Fetch info after anime selected
// ─────────────────────────────────────────────────────────────
async function doAnimeInfo(conn, mek, from, sender, session, num) {
    const { results, pushname } = session;

    if (isNaN(num) || num < 1 || num > results.length) {
        return conn.sendMessage(from, {
            text: `❌ *1 ත් ${results.length} ත් අතර අංකයක් ලබා දෙන්න!*`
        }, { quoted: mek });
    }

    const anime    = results[num - 1];
    const animeUrl = anime.url || anime.link || anime.href || '';

    await conn.sendMessage(from, { react: { text: '🔄', key: mek.key } });
    await conn.sendMessage(from, {
        text: `🔄 *"${trimTitle(anime.title || anime.name, 50)}" ගැන Details ලබා ගනිමින්...*`
    }, { quoted: FakeVCard });

    try {
        if (!animeUrl) throw new Error('Anime URL හමු නොවිණි');

        const info   = await apiGet(INFO_API(animeUrl));
        const epList = info.episodes || info.episodeList || info.data?.episodes || [];

        const title    = info.title || anime.title || anime.name || 'Unknown';
        const cover    = info.thumbnail || info.image || anime.image || info.cover || null;
        const type     = info.type   || anime.type   || (epList.length ? 'Series' : 'Movie');
        const status   = info.status || anime.status || '';
        const year     = info.year   || anime.year   || anime.released || '';
        const genre    = Array.isArray(info.genre || info.genres)
                            ? (info.genre || info.genres).join(', ')
                            : (info.genre || info.genres || '');
        const rating   = info.rating || info.score   || '';
        const synopsis = info.description || info.synopsis || info.summary || '';

        let text = `🎌 *${title}*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        if (type)   text += `🎬 *Type:* ${type}\n`;
        if (status) text += `📡 *Status:* ${status}\n`;
        if (year)   text += `📅 *Year:* ${year}\n`;
        if (genre)  text += `🏷️ *Genre:* ${genre}\n`;
        if (rating) text += `⭐ *Rating:* ${rating}\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n`;

        if (synopsis) {
            const s = synopsis.length > 220 ? synopsis.slice(0, 220) + '...' : synopsis;
            text += `📝 *Synopsis:*\n${s}\n\n`;
        }

        const key = sKey(from, sender);

        if (!epList.length) {
            // ── Movie / Single ──
            text += `👇 *Reply* *1* *to Download*\n\n`;
            text += `*1.* 🎬 ${trimTitle(title)} — Download\n\n`;
            text += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

            const sent = cover
                ? await conn.sendMessage(from, { image: { url: cover }, caption: text }, { quoted: FakeVCard })
                : await conn.sendMessage(from, { text }, { quoted: FakeVCard });

            const dlUrl = info.downloadUrl || info.link || info.url || animeUrl;

            global._animeEpSessions.set(key, {
                msgId: sent.key.id,
                isMovie: true,
                animeTitle: title,
                downloadUrl: dlUrl,
                referer: animeUrl,
                pushname
            });

        } else {
            // ── Series ──
            const showEps = epList.slice(0, 30);

            text += `📺 *Total Episodes:* ${epList.length}\n\n`;
            text += `👇 *Episode අංකය Reply කරන්න*\n\n`;

            showEps.forEach((ep, i) => {
                const epTitle = ep.title || ep.name || `Episode ${ep.number || i + 1}`;
                text += `*${i + 1}.* ${trimTitle(epTitle)}\n`;
            });

            if (epList.length > 30) {
                text += `\n_...and ${epList.length - 30} more episodes._\n`;
            }

            text += `\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

            const sent = cover
                ? await conn.sendMessage(from, { image: { url: cover }, caption: text }, { quoted: FakeVCard })
                : await conn.sendMessage(from, { text }, { quoted: FakeVCard });

            global._animeEpSessions.set(key, {
                msgId: sent.key.id,
                isMovie: false,
                animeTitle: title,
                episodes: showEps,
                referer: animeUrl,
                pushname
            });
        }

        setTimeout(() => {
            const s = global._animeEpSessions.get(key);
            if (s) global._animeEpSessions.delete(key);
        }, 120000);

    } catch (e) {
        console.error('[ANIME INFO ERROR]', e.message);
        conn.sendMessage(from, {
            text: `❌ *Info ලබා ගැනීමට නොහැකි විය!*\n_${e.message}_`
        }, { quoted: mek });
    }
}

// ─────────────────────────────────────────────────────────────
// doDownload — Bypass + send file
// ─────────────────────────────────────────────────────────────
async function doDownload(conn, mek, from, sender, session, num) {
    const { isMovie, animeTitle, downloadUrl, episodes, referer, pushname } = session;

    if (!isMovie) {
        if (isNaN(num) || num < 1 || num > episodes.length) {
            return conn.sendMessage(from, {
                text: `❌ *1 ත් ${episodes.length} ත් අතර Episode අංකයක් ලබා දෙන්න!*`
            }, { quoted: mek });
        }
    }

    await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });

    try {
        let dlLink, epTitle;

        if (isMovie) {
            dlLink  = downloadUrl;
            epTitle = animeTitle;
        } else {
            const ep = episodes[num - 1];
            epTitle  = ep.title || ep.name || `Episode ${num}`;
            dlLink   = ep.url || ep.link || ep.downloadUrl || ep.href || '';
        }

        if (!dlLink) throw new Error('Download link හමු නොවිණි');

        await conn.sendMessage(from, {
            text: `⏳ *Bypassing & Downloading...*\n\n🎌 *${trimTitle(animeTitle, 50)}*\n📺 *${trimTitle(epTitle, 40)}*\n\n_Upload වීමට ටිකක් ඉවසන්න..._`
        }, { quoted: FakeVCard });

        // Bypass
        const bypass   = await apiGet(BYPASS_API(dlLink, referer));
        const finalUrl = bypass.url || bypass.link || bypass.directUrl
                         || bypass.downloadUrl || bypass.data?.url || dlLink;

        // Size check
        try {
            const head   = await axios.head(finalUrl, { timeout: 10000 });
            const sizeMB = parseInt(head.headers['content-length'] || 0) / (1024 * 1024);
            if (sizeMB > 1950) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return conn.sendMessage(from, {
                    text: `❌ *File 2GB+ ඇත! (${sizeMB.toFixed(1)} MB)*\nWhatsApp හරහා Send කළ නොහැක.`
                }, { quoted: FakeVCard });
            }
        } catch (_) { /* skip */ }

        const safeFile = `${animeTitle} - ${epTitle}`.replace(/[^\w\s\-().]/g, '').slice(0, 60);

        const caption = `🎌 *${animeTitle}*\n`
            + `📺 *${epTitle}*\n\n`
            + `> 👤 Downloaded by: ${pushname}\n`
            + `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        await conn.sendMessage(from, {
            document: { url: finalUrl },
            mimetype: 'video/mp4',
            fileName: `${safeFile}.mp4`,
            caption
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[ANIME DOWNLOAD ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        conn.sendMessage(from, {
            text: `❌ *Download Failed!*\n_${e.message}_`
        }, { quoted: mek });
    }
}
