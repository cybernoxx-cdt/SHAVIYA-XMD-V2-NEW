// ============================================================
//  animeclub.js — SHAVIYA-XMD V2
//  🎌 Anime Downloader Plugin — animeclubdl.zone.id
//  ✅ Fixed: Listener stanzaId match + sender check cleaned
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd } = require('../command');
const axios   = require('axios');

// ─── API ─────────────────────────────────────────────────────
const API_BASE   = 'https://animeclubdl.zone.id/api';
const SEARCH_API = (q)         => `${API_BASE}/search?q=${encodeURIComponent(q)}`;
const INFO_API   = (url)       => `${API_BASE}/info?url=${encodeURIComponent(url)}`;
const BYPASS_API = (link, ref) => `${API_BASE}/bypass?link=${encodeURIComponent(link)}&referer=${encodeURIComponent(ref || '')}`;

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

// ─── getSender: group + DM safe ──────────────────────────────
function getSender(msg) {
    return msg.key.participant || msg.key.remoteJid;
}

// ─── isReplyTo: stanzaId check — cinesubz2 pattern ──────────
function isReplyTo(msg, targetId) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    return ctx?.stanzaId === targetId;
}

// ─── getText ─────────────────────────────────────────────────
function getText(msg) {
    return (
        msg.message?.extendedTextMessage?.text ||
        msg.message?.conversation ||
        msg.message?.imageMessage?.caption ||
        ''
    ).trim();
}

// ─────────────────────────────────────────────────────────────
// .anime — MAIN COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'anime2',
    alias:    ['anime', 'an'],
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

        const topResults = results.slice(0, 10);

        let listText = `🎌 *ANIMECLUB SEARCH*\n`;
            listText += `━━━━━━━━━━━━━━━━━━━━━\n`;
            listText += `🔍 *Search:* ${q}\n`;
            listText += `👤 *User:* ${pushname}\n`;
            listText += `📦 *Found:* ${topResults.length} results\n`;
            listText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            listText += `👇 *Anime අංකය Reply කරන්න*\n\n`;

        topResults.forEach((item, i) => {
            const title = trimTitle(item.title || item.name || `Anime ${i + 1}`);
            const year  = item.year || item.released || '';
            const type  = item.type || item.format   || '';
            const eps   = item.episodes || item.totalEpisodes || '';
            const meta  = [type, year, eps ? `${eps} eps` : ''].filter(Boolean).join(' · ');
            listText += `*${i + 1}.* ${title}\n`;
            if (meta) listText += `     📌 _${meta}_\n`;
            listText += '\n';
        });

        listText += `> Reply with 1 - ${topResults.length}\n`;
        listText += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        // ── List message send ──
        const listMsg = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });
        const listMsgId = listMsg.key.id;

        await conn.sendMessage(from, { react: { text: '🎌', key: mek.key } });

        // ─────────────────────────────────────────────────────
        // STEP 1 LISTENER — Anime selection
        // ─────────────────────────────────────────────────────
        const animeListener = async (update) => {
            const replyMsg = update.messages[0];
            if (!replyMsg?.message) return;

            // ✅ Must be reply to our list message
            if (!isReplyTo(replyMsg, listMsgId)) return;

            // ✅ Same chat
            if (replyMsg.key.remoteJid !== from) return;

            // ✅ Same sender
            if (getSender(replyMsg) !== sender) return;

            const userReply    = getText(replyMsg);
            const selectedIndex = parseInt(userReply) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                return conn.sendMessage(from, {
                    text: `❌ *1 ත් ${topResults.length} ත් අතර අංකයක් ලබා දෙන්න!*`
                }, { quoted: replyMsg });
            }

            // Remove listener immediately
            conn.ev.off('messages.upsert', animeListener);

            const anime    = topResults[selectedIndex];
            const animeUrl = anime.url || anime.link || anime.href || '';

            await conn.sendMessage(from, { react: { text: '🔄', key: replyMsg.key } });
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

                let infoText = `🎌 *${title}*\n`;
                    infoText += `━━━━━━━━━━━━━━━━━━━━━\n`;
                if (type)   infoText += `🎬 *Type:* ${type}\n`;
                if (status) infoText += `📡 *Status:* ${status}\n`;
                if (year)   infoText += `📅 *Year:* ${year}\n`;
                if (genre)  infoText += `🏷️ *Genre:* ${genre}\n`;
                if (rating) infoText += `⭐ *Rating:* ${rating}\n`;
                            infoText += `━━━━━━━━━━━━━━━━━━━━━\n`;

                if (synopsis) {
                    const s = synopsis.length > 220 ? synopsis.slice(0, 220) + '...' : synopsis;
                    infoText += `📝 *Synopsis:*\n${s}\n\n`;
                }

                // ── MOVIE ──────────────────────────────────────
                if (!epList.length) {
                    infoText += `👇 *Reply* *1* *to Download*\n\n`;
                    infoText += `*1.* 🎬 ${trimTitle(title)} — Download\n\n`;
                    infoText += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                    const infoMsg = cover
                        ? await conn.sendMessage(from, { image: { url: cover }, caption: infoText }, { quoted: FakeVCard })
                        : await conn.sendMessage(from, { text: infoText }, { quoted: FakeVCard });

                    const infoMsgId = infoMsg.key.id;
                    const dlUrl     = info.downloadUrl || info.link || info.url || animeUrl;

                    // ── STEP 2 LISTENER — Movie download ───────
                    const movieDlListener = async (update) => {
                        const dlMsg = update.messages[0];
                        if (!dlMsg?.message) return;

                        if (!isReplyTo(dlMsg, infoMsgId)) return;
                        if (dlMsg.key.remoteJid !== from) return;
                        if (getSender(dlMsg) !== sender) return;

                        if (parseInt(getText(dlMsg)) !== 1) return;

                        conn.ev.off('messages.upsert', movieDlListener);
                        await doDownload(conn, dlMsg, from, title, title, dlUrl, animeUrl);
                    };

                    conn.ev.on('messages.upsert', movieDlListener);
                    setTimeout(() => conn.ev.off('messages.upsert', movieDlListener), 120000);

                } else {
                    // ── SERIES ─────────────────────────────────
                    const showEps = epList.slice(0, 30);

                    infoText += `📺 *Total Episodes:* ${epList.length}\n\n`;
                    infoText += `👇 *Episode අංකය Reply කරන්න*\n\n`;

                    showEps.forEach((ep, i) => {
                        const epTitle = ep.title || ep.name || `Episode ${ep.number || i + 1}`;
                        infoText += `*${i + 1}.* ${trimTitle(epTitle)}\n`;
                    });

                    if (epList.length > 30) {
                        infoText += `\n_...and ${epList.length - 30} more episodes._\n`;
                    }
                    infoText += `\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                    const epListMsg = cover
                        ? await conn.sendMessage(from, { image: { url: cover }, caption: infoText }, { quoted: FakeVCard })
                        : await conn.sendMessage(from, { text: infoText }, { quoted: FakeVCard });

                    const epListMsgId = epListMsg.key.id;

                    // ── STEP 2 LISTENER — Episode selection ────
                    const epListener = async (update) => {
                        const epMsg = update.messages[0];
                        if (!epMsg?.message) return;

                        if (!isReplyTo(epMsg, epListMsgId)) return;
                        if (epMsg.key.remoteJid !== from) return;
                        if (getSender(epMsg) !== sender) return;

                        const epIndex = parseInt(getText(epMsg)) - 1;

                        if (isNaN(epIndex) || epIndex < 0 || epIndex >= showEps.length) {
                            return conn.sendMessage(from, {
                                text: `❌ *1 ත් ${showEps.length} ත් අතර Episode අංකයක් ලබා දෙන්න!*`
                            }, { quoted: epMsg });
                        }

                        conn.ev.off('messages.upsert', epListener);

                        const ep      = showEps[epIndex];
                        const epTitle = ep.title || ep.name || `Episode ${epIndex + 1}`;
                        const epUrl   = ep.url || ep.link || ep.downloadUrl || ep.href || '';

                        await doDownload(conn, epMsg, from, title, epTitle, epUrl, animeUrl);
                    };

                    conn.ev.on('messages.upsert', epListener);
                    setTimeout(() => conn.ev.off('messages.upsert', epListener), 120000);
                }

            } catch (e) {
                console.error('[ANIME INFO ERROR]', e.message);
                conn.sendMessage(from, {
                    text: `❌ *Info ලබා ගැනීමට නොහැකි විය!*\n_${e.message}_`
                }, { quoted: replyMsg });
            }
        };

        conn.ev.on('messages.upsert', animeListener);
        setTimeout(() => conn.ev.off('messages.upsert', animeListener), 120000);

    } catch (e) {
        console.error('[ANIME SEARCH ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Search Failed!*\n_' + e.message + '_');
    }
});

// ─────────────────────────────────────────────────────────────
// doDownload — Bypass + send file
// ─────────────────────────────────────────────────────────────
async function doDownload(conn, mek, from, animeTitle, epTitle, dlLink, referer) {
    await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });

    try {
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
        } catch (_) { /* skip size check */ }

        const safeFile = `${animeTitle} - ${epTitle}`.replace(/[^\w\s\-().]/g, '').slice(0, 60);

        const caption = `🎌 *${animeTitle}*\n`
            + `📺 *${epTitle}*\n\n`
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
