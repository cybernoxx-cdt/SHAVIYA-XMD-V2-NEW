// ============================================================
//  animost.js — SHAVIYA-XMD V2
//  🎌 Anime Downloader Plugin — animost.zone.id
//  ✅ One-shot listener fix · Processing lock · Sender check
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd } = require('../command');
const axios   = require('axios');

// ─── API ─────────────────────────────────────────────────────
const API_BASE   = 'https://animost.zone.id/api';
const SEARCH_API = (q)   => `${API_BASE}/search?q=${encodeURIComponent(q)}`;

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

function getSender(msg) {
    return msg.key.participant || msg.key.remoteJid;
}

function isReplyTo(msg, targetId) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    return ctx?.stanzaId === targetId;
}

function getText(msg) {
    return (
        msg.message?.extendedTextMessage?.text ||
        msg.message?.conversation ||
        msg.message?.imageMessage?.caption ||
        ''
    ).trim();
}

// ─── Build quality buttons text ──────────────────────────────
// API response example per result:
//   { title, url/link, image/thumbnail, year, type,
//     downloads: [ { quality: '1080p', type: 'SUB', links: [{host:'PixelDrain', url:'...'}, ...] }, ... ] }
function buildQualityList(downloads) {
    if (!downloads || !downloads.length) return null;

    let text = '';
    let index = 1;
    const map = [];

    for (const dl of downloads) {
        const label = `${dl.quality || '?'} ${dl.type || ''}`.trim();
        for (const link of (dl.links || [dl])) {
            const host = link.host || link.name || 'Direct';
            text += `*${index}.* 📥 ${label} — ${host}\n`;
            map.push({ label, host, url: link.url || link.link || link.href || '' });
            index++;
        }
    }
    return { text, map };
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMMAND  .animost
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'animost',
    alias:    ['ani', 'animostlk'],
    react:    '🎌',
    desc:     'Search & Download Anime from Animost LK',
    category: 'anime',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) return reply(
            '🎌 *Anime නමක් දෙන්න!*\n\n'
            + '_Example:_ `.animost naruto`\n\n'
            + '*How it works:*\n'
            + '1️⃣ `.animost <name>` type කරන්න\n'
            + '2️⃣ Search list → Anime අංකය reply කරන්න\n'
            + '3️⃣ Episode list → Episode අංකය reply කරන්න\n'
            + '4️⃣ Quality list → Quality අංකය reply කරන්න\n'
            + '5️⃣ Auto Download! ✅'
        );

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // ── SEARCH ──────────────────────────────────────────
        const data    = await apiGet(SEARCH_API(q));
        const results = Array.isArray(data)
            ? data
            : (data.results || data.data || data.items || data.anime || []);

        if (!results.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *"${q}" ගැන Anime හමු නොවිණි.*`);
        }

        const topResults = results.slice(0, 10);

        let listText  = `🎌 *ANIMOST LK SEARCH*\n`;
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
            const meta  = [type, year].filter(Boolean).join(' · ');
            listText += `*${i + 1}.* ${title}\n`;
            if (meta) listText += `     📌 _${meta}_\n`;
            listText += '\n';
        });

        listText += `> Reply with 1–${topResults.length}\n`;
        listText += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        const listMsg   = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });
        const listMsgId = listMsg.key.id;

        await conn.sendMessage(from, { react: { text: '🎌', key: mek.key } });

        // ─────────────────────────────────────────────────────
        //  STEP 1 LISTENER — Anime selection
        // ─────────────────────────────────────────────────────
        let step1Done = false;

        const animeListener = async (update) => {
            const replyMsg = update.messages?.[0];
            if (!replyMsg?.message)                        return;
            if (!isReplyTo(replyMsg, listMsgId))           return;
            if (replyMsg.key.remoteJid !== from)           return;
            if (getSender(replyMsg) !== sender)            return;
            if (step1Done)                                 return;

            const idx = parseInt(getText(replyMsg)) - 1;

            if (isNaN(idx) || idx < 0 || idx >= topResults.length) {
                return conn.sendMessage(from, {
                    text: `❌ *1 ත් ${topResults.length} ත් අතර අංකයක් ලබා දෙන්න!*`
                }, { quoted: replyMsg });
            }

            // Lock & detach immediately
            step1Done = true;
            conn.ev.off('messages.upsert', animeListener);

            const anime    = topResults[idx];
            const animeUrl = anime.url || anime.link || anime.href || '';

            await conn.sendMessage(from, { react: { text: '🔄', key: replyMsg.key } });
            await conn.sendMessage(from, {
                text: `🔄 *"${trimTitle(anime.title || anime.name, 50)}" ගැන Episodes ලබා ගනිමින්...*`
            }, { quoted: FakeVCard });

            try {
                if (!animeUrl) throw new Error('Anime URL හමු නොවිණි');

                // Fetch anime info (episodes list)
                const info   = await apiGet(`${API_BASE}/info?url=${encodeURIComponent(animeUrl)}`);
                const epList = info.episodes || info.episodeList || info.data?.episodes || [];

                const title    = info.title || anime.title || anime.name || 'Unknown';
                const cover    = info.thumbnail || info.image || anime.image || info.cover || null;
                const type     = info.type   || anime.type   || (epList.length ? 'Series' : 'Movie');
                const status   = info.status || anime.status || '';
                const year     = info.year   || anime.year   || '';
                const genre    = Array.isArray(info.genre || info.genres)
                                    ? (info.genre || info.genres).join(', ')
                                    : (info.genre || info.genres || '');
                const rating   = info.rating || info.score   || '';
                const synopsis = info.description || info.synopsis || info.summary || '';

                let infoText  = `🎌 *${title}*\n`;
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

                // ── MOVIE (no episodes) ───────────────────────
                if (!epList.length) {
                    infoText += `👇 *Quality / Link select කරන්න*\n\n`;

                    const dlData    = info.downloads || info.links || [];
                    const qualBuild = buildQualityList(dlData);

                    if (qualBuild) {
                        infoText += qualBuild.text + '\n';
                    } else {
                        infoText += `*1.* 📥 Direct Download\n\n`;
                    }

                    infoText += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                    const infoMsg   = cover
                        ? await conn.sendMessage(from, { image: { url: cover }, caption: infoText }, { quoted: FakeVCard })
                        : await conn.sendMessage(from, { text: infoText }, { quoted: FakeVCard });
                    const infoMsgId = infoMsg.key.id;

                    const qualMap = qualBuild?.map || [
                        { label: 'Direct', host: 'Direct', url: info.downloadUrl || info.link || animeUrl }
                    ];

                    // ── STEP 2 LISTENER — Movie quality pick ──
                    let step2Done = false;

                    const movieQualListener = async (update) => {
                        const dlMsg = update.messages?.[0];
                        if (!dlMsg?.message)                     return;
                        if (!isReplyTo(dlMsg, infoMsgId))        return;
                        if (dlMsg.key.remoteJid !== from)        return;
                        if (getSender(dlMsg) !== sender)         return;
                        if (step2Done)                           return;

                        const qi = parseInt(getText(dlMsg)) - 1;
                        if (isNaN(qi) || qi < 0 || qi >= qualMap.length) {
                            return conn.sendMessage(from, {
                                text: `❌ *1 ත් ${qualMap.length} ත් අතර අංකයක් ලබා දෙන්න!*`
                            }, { quoted: dlMsg });
                        }

                        step2Done = true;
                        conn.ev.off('messages.upsert', movieQualListener);

                        const chosen = qualMap[qi];
                        await doDownload(conn, dlMsg, from, title, chosen.label, chosen.url);
                    };

                    conn.ev.on('messages.upsert', movieQualListener);
                    setTimeout(() => conn.ev.off('messages.upsert', movieQualListener), 120000);

                } else {
                    // ── SERIES ──────────────────────────────────
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

                    const epListMsg   = cover
                        ? await conn.sendMessage(from, { image: { url: cover }, caption: infoText }, { quoted: FakeVCard })
                        : await conn.sendMessage(from, { text: infoText }, { quoted: FakeVCard });
                    const epListMsgId = epListMsg.key.id;

                    // ── STEP 2 LISTENER — Episode selection ────
                    let step2Done = false;

                    const epListener = async (update) => {
                        const epMsg = update.messages?.[0];
                        if (!epMsg?.message)                       return;
                        if (!isReplyTo(epMsg, epListMsgId))        return;
                        if (epMsg.key.remoteJid !== from)          return;
                        if (getSender(epMsg) !== sender)           return;
                        if (step2Done)                             return;

                        const epIdx = parseInt(getText(epMsg)) - 1;

                        if (isNaN(epIdx) || epIdx < 0 || epIdx >= showEps.length) {
                            return conn.sendMessage(from, {
                                text: `❌ *1 ත් ${showEps.length} ත් අතර Episode අංකයක් ලබා දෙන්න!*`
                            }, { quoted: epMsg });
                        }

                        step2Done = true;
                        conn.ev.off('messages.upsert', epListener);

                        const ep      = showEps[epIdx];
                        const epTitle = ep.title || ep.name || `Episode ${epIdx + 1}`;
                        const epUrl   = ep.url || ep.link || ep.href || '';

                        await conn.sendMessage(from, { react: { text: '🔄', key: epMsg.key } });
                        await conn.sendMessage(from, {
                            text: `🔄 *"${trimTitle(epTitle)}" ගැන Download Links ලබා ගනිමින්...*`
                        }, { quoted: FakeVCard });

                        try {
                            if (!epUrl) throw new Error('Episode URL හමු නොවිණි');

                            // Fetch episode download links
                            const epInfo   = await apiGet(`${API_BASE}/info?url=${encodeURIComponent(epUrl)}`);
                            const dlData   = epInfo.downloads || epInfo.links || ep.downloads || ep.links || [];
                            const qualBuild = buildQualityList(dlData);

                            let qualText  = `🎌 *${trimTitle(title, 40)}*\n`;
                                qualText += `📺 *${trimTitle(epTitle)}*\n`;
                                qualText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
                                qualText += `👇 *Quality / Link select කරන්න*\n\n`;

                            let qualMap;

                            if (qualBuild) {
                                qualText += qualBuild.text + '\n';
                                qualMap   = qualBuild.map;
                            } else {
                                qualText += `*1.* 📥 Direct Download\n\n`;
                                qualMap   = [{ label: 'Direct', host: 'Direct', url: epInfo.downloadUrl || epInfo.link || epUrl }];
                            }

                            qualText += `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

                            const qualMsg   = await conn.sendMessage(from, { text: qualText }, { quoted: FakeVCard });
                            const qualMsgId = qualMsg.key.id;

                            // ── STEP 3 LISTENER — Quality pick ─
                            let step3Done = false;

                            const qualListener = async (update) => {
                                const dlMsg = update.messages?.[0];
                                if (!dlMsg?.message)                    return;
                                if (!isReplyTo(dlMsg, qualMsgId))       return;
                                if (dlMsg.key.remoteJid !== from)       return;
                                if (getSender(dlMsg) !== sender)        return;
                                if (step3Done)                          return;

                                const qi = parseInt(getText(dlMsg)) - 1;
                                if (isNaN(qi) || qi < 0 || qi >= qualMap.length) {
                                    return conn.sendMessage(from, {
                                        text: `❌ *1 ත් ${qualMap.length} ත් අතර අංකයක් ලබා දෙන්න!*`
                                    }, { quoted: dlMsg });
                                }

                                step3Done = true;
                                conn.ev.off('messages.upsert', qualListener);

                                const chosen = qualMap[qi];
                                await doDownload(conn, dlMsg, from, title, `${epTitle} [${chosen.label}]`, chosen.url);
                            };

                            conn.ev.on('messages.upsert', qualListener);
                            setTimeout(() => conn.ev.off('messages.upsert', qualListener), 120000);

                        } catch (e) {
                            console.error('[ANIMOST EP LINKS ERROR]', e.message);
                            conn.sendMessage(from, {
                                text: `❌ *Episode links ලබා ගැනීමට නොහැකි විය!*\n_${e.message}_`
                            }, { quoted: epMsg });
                        }
                    };

                    conn.ev.on('messages.upsert', epListener);
                    setTimeout(() => conn.ev.off('messages.upsert', epListener), 120000);
                }

            } catch (e) {
                console.error('[ANIMOST INFO ERROR]', e.message);
                conn.sendMessage(from, {
                    text: `❌ *Info ලබා ගැනීමට නොහැකි විය!*\n_${e.message}_`
                }, { quoted: replyMsg });
            }
        };

        conn.ev.on('messages.upsert', animeListener);
        setTimeout(() => conn.ev.off('messages.upsert', animeListener), 120000);

    } catch (e) {
        console.error('[ANIMOST SEARCH ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ *Search Failed!*\n_' + e.message + '_');
    }
});

// ─────────────────────────────────────────────────────────────
//  doDownload — Send file (PixelDrain/GDrive/Direct)
// ─────────────────────────────────────────────────────────────
async function doDownload(conn, mek, from, animeTitle, epLabel, dlLink) {
    await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });

    try {
        if (!dlLink) throw new Error('Download link හමු නොවිණි');

        await conn.sendMessage(from, {
            text: `⏳ *Downloading...*\n\n🎌 *${trimTitle(animeTitle, 50)}*\n📺 *${trimTitle(epLabel, 40)}*\n\n_Upload වීමට ටිකක් ඉවසන්න..._`
        }, { quoted: FakeVCard });

        // Normalize PixelDrain share → direct download
        let finalUrl = dlLink;
        const pdMatch = dlLink.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
        if (pdMatch) {
            finalUrl = `https://pixeldrain.com/api/file/${pdMatch[1]}`;
        }

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

        const safeFile = `${animeTitle} - ${epLabel}`.replace(/[^\w\s\-()\[\].]/g, '').slice(0, 60);

        const caption = `🎌 *${animeTitle}*\n`
            + `📺 *${epLabel}*\n\n`
            + `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        await conn.sendMessage(from, {
            document: { url: finalUrl },
            mimetype: 'video/mp4',
            fileName: `${safeFile}.mp4`,
            caption
        }, { quoted: FakeVCard });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[ANIMOST DOWNLOAD ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        conn.sendMessage(from, {
            text: `❌ *Download Failed!*\n_${e.message}_`
        }, { quoted: mek });
    }
}
