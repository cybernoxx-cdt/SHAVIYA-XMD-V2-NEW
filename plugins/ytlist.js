// ============================================================
//  ytlist.js — SHAVIYA-XMD V2
//  🎵 YouTube Playlist Downloader
//  ✅ Doc / Audio / Voice Note support
//  ✅ Fix: Invidious API fallback chain (yt-search replace)
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd }  = require('../command');
const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const ffmpeg   = require('fluent-ffmpeg');

// ─── Song Download APIs (ytsong.js pattern — parallel fallback) ──
// API 1: Aswin Sparky (primary)
// API 2: Asitha (fallback)
const ASWIN_API  = (url) =>
    `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(url)}`;
const ASITHA_API = (url) =>
    `https://back.asitha.top/api/ytapi?url=${encodeURIComponent(url)}&fo=2&qu=128&apiKey=390f34ac879d9cbad9192a073a9431d6fdc482d79bdd126acee7599905d8e904`;

// ─── Invidious instances fallback chain ──────────────────────
// yt-search playlist support unreliable — Invidious API use කරනවා
const INVIDIOUS_INSTANCES = [
    'https://invidious.nikkk.net',
    'https://inv.nadeko.net',
    'https://invidious.privacydev.net',
    'https://yt.cdaut.de',
    'https://invidious.fdn.fr',
];

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

// ─── Helpers ─────────────────────────────────────────────────
function getSender(msg) {
    return msg.key.participant || msg.key.remoteJid;
}
function isReplyTo(msg, targetId) {
    const ctx =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo;
    return ctx?.stanzaId === targetId;
}
function getText(msg) {
    return (
        msg.message?.extendedTextMessage?.text ||
        msg.message?.conversation || ''
    ).trim();
}
function trimTitle(t, max = 50) {
    return t && t.length > max ? t.slice(0, max) + '…' : (t || 'Unknown');
}
function safeFilename(t) {
    return t.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Extract playlist ID ──────────────────────────────────────
function extractPlaylistId(url) {
    try {
        const u = new URL(url);
        return u.searchParams.get('list') || null;
    } catch {
        const m = url.match(/[?&]list=([^&]+)/);
        return m ? m[1] : null;
    }
}

// ─── Fetch playlist via Invidious API fallback chain ─────────
// yt-search replace — "This playlist type is unviewable" error fix
async function fetchPlaylist(listId) {
    let lastError = null;

    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const url = `${instance}/api/v1/playlists/${listId}?fields=title,videos`;
            const { data } = await axios.get(url, { timeout: 15000 });

            if (!data?.videos?.length) continue;

            // Normalize to { title, url, timestamp } format
            return data.videos.map(v => ({
                title:     v.title     || 'Unknown',
                url:       `https://www.youtube.com/watch?v=${v.videoId}`,
                timestamp: formatSeconds(v.lengthSeconds || 0),
                videoId:   v.videoId,
            }));

        } catch (e) {
            lastError = e;
            // Next instance try
        }
    }

    throw new Error(`playlist error: ${lastError?.message || 'All Invidious instances failed'}`);
}

// ─── Format seconds → mm:ss ──────────────────────────────────
function formatSeconds(s) {
    if (!s) return '?';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Download one song URL — parallel dual API (ytsong.js pattern) ──
async function getSongUrl(videoUrl) {
    const [api1Res, api2Res] = await Promise.allSettled([
        axios.get(ASWIN_API(videoUrl),  { timeout: 20000 }),
        axios.get(ASITHA_API(videoUrl), { timeout: 20000 }),
    ]);

    const songUrl =
        (api1Res.status === 'fulfilled' && api1Res.value.data?.status && api1Res.value.data?.data?.url)
            ? api1Res.value.data.data.url
        : (api2Res.status === 'fulfilled' && api2Res.value.data?.downloadData?.url)
            ? api2Res.value.data.downloadData.url
        : null;

    if (!songUrl) throw new Error('Both APIs failed — try again later');
    return songUrl;
}

// ─── Send as Audio ───────────────────────────────────────────
async function sendAudio(conn, from, songUrl, videoTitle, quotedMsg) {
    await conn.sendMessage(from, {
        audio: { url: songUrl },
        mimetype: 'audio/mpeg',
        fileName: `${safeFilename(videoTitle)}.mp3`
    }, { quoted: quotedMsg });
}

// ─── Send as Document ────────────────────────────────────────
async function sendDocument(conn, from, songUrl, videoTitle, quotedMsg) {
    const buf = await axios.get(songUrl, { responseType: 'arraybuffer', timeout: 60000 });
    await conn.sendMessage(from, {
        document: Buffer.from(buf.data),
        mimetype: 'audio/mpeg',
        fileName: `${safeFilename(videoTitle)}.mp3`
    }, { quoted: quotedMsg });
}

// ─── Send as Voice Note ──────────────────────────────────────
async function sendVoiceNote(conn, from, songUrl, quotedMsg) {
    const ts      = Date.now();
    const mp3Path  = path.join(__dirname, `${ts}.mp3`);
    const opusPath = path.join(__dirname, `${ts}.opus`);

    const stream = await axios.get(songUrl, { responseType: 'stream', timeout: 60000 });
    const writer = fs.createWriteStream(mp3Path);
    stream.data.pipe(writer);
    await new Promise(r => writer.on('finish', r));

    await new Promise((resolve, reject) => {
        ffmpeg(mp3Path)
            .audioCodec('libopus')
            .format('opus')
            .save(opusPath)
            .on('end', resolve)
            .on('error', reject);
    });

    await conn.sendMessage(from, {
        audio: fs.readFileSync(opusPath),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
    }, { quoted: quotedMsg });

    try { fs.unlinkSync(mp3Path);  } catch {}
    try { fs.unlinkSync(opusPath); } catch {}
}

// ─────────────────────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'ytlist',
    alias:    ['playsong', 'playlistdl'],
    react:    '🎵',
    desc:     'YouTube Playlist එකක Songs Download කරන්න',
    category: 'download',
    filename: __filename
},
async (conn, mek, m, { from, q, pushname, sender, reply }) => {
    try {
        if (!q) return reply(
            `🎵 *YouTube Playlist Downloader*\n\n`
            + `*Usage:* \`.ytlist <playlist URL>\`\n\n`
            + `_Example:_\n\`.ytlist https://www.youtube.com/playlist?list=PLxxxxxx\`\n\n`
            + `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`
        );

        const playlistUrl = q.trim();
        const listId      = extractPlaylistId(playlistUrl);

        if (!listId) return reply('❌ *Valid YouTube Playlist URL එකක් දෙන්න!*\n_list= parameter හමු නොවිණි._');

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await conn.sendMessage(from, {
            text: `🔍 *Playlist fetch කරමින්...*\n_URL:_ ${playlistUrl}`
        }, { quoted: FakeVCard });

        // ── Fetch playlist via Invidious ──
        let videos = [];
        try {
            videos = await fetchPlaylist(listId);
        } catch (e) {
            return reply(`❌ *Playlist load කළ නොහැකිය!*\n_${e.message}_\n\n💡 _Playlist public ද කියා check කරන්න._`);
        }

        if (!videos.length) return reply('❌ *Playlist එකේ Videos හමු නොවිණි.*\n_Private හෝ Empty playlist නම් work නොකරයි._');

        // Show max 50 songs
        const songList = videos.slice(0, 50);

        // ── Build list message ──
        let listText = `🎵 *YOUTUBE PLAYLIST*\n`;
            listText += `━━━━━━━━━━━━━━━━━━━━━\n`;
            listText += `👤 *User:* ${pushname}\n`;
            listText += `📦 *Total Songs:* ${videos.length}\n`;
        if (videos.length > 50) listText += `_(First 50 songs showing)_\n`;
            listText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            listText += `👇 *Download format select කරන්න:*\n`;
            listText += `*1️⃣* - Audio 🎵\n`;
            listText += `*2️⃣* - Document 📁\n`;
            listText += `*3️⃣* - Voice Note 🎤\n\n`;
            listText += `━━━━━━━━━━━━━━━━━━━━━\n`;
            listText += `*Reply with format number*\n\n`;

        songList.forEach((v, i) => {
            listText += `*${i + 1}.* ${trimTitle(v.title, 45)} _[${v.timestamp}]_\n`;
        });

        listText += `\n> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`;

        const listMsg   = await conn.sendMessage(from, { text: listText }, { quoted: FakeVCard });
        const listMsgId = listMsg.key.id;

        await conn.sendMessage(from, { react: { text: '🎵', key: mek.key } });

        // ─────────────────────────────────────────────────
        // LISTENER — Format selection
        // ✅ processing lock — one-shot bug fix
        // ─────────────────────────────────────────────────
        let formatProcessing = false;

        const formatListener = async (update) => {
            if (update.type === 'append') return;
            const replyMsg = update.messages?.[0];
            if (!replyMsg?.message) return;
            if (!isReplyTo(replyMsg, listMsgId)) return;
            if (replyMsg.key.remoteJid !== from) return;
            if (getSender(replyMsg) !== sender) return;
            if (formatProcessing) return;

            const choice = parseInt(getText(replyMsg));
            if (![1, 2, 3].includes(choice)) {
                return conn.sendMessage(from, {
                    text: `❌ *1, 2 හෝ 3 reply කරන්න!*\n1️⃣ Audio | 2️⃣ Document | 3️⃣ Voice Note`
                }, { quoted: replyMsg });
            }

            // Valid — lock + kill listener
            formatProcessing = true;
            conn.ev.off('messages.upsert', formatListener);

            const formatName = choice === 1 ? '🎵 Audio' : choice === 2 ? '📁 Document' : '🎤 Voice Note';

            await conn.sendMessage(from, { react: { text: '✅', key: replyMsg.key } });
            await conn.sendMessage(from, {
                text: `✅ *Format:* ${formatName}\n\n⬇️ *Song ${songList.length}ක් Download කිරීම ආරම්භ කරමින්...*\n_ටිකක් ඉවසන්න..._`
            }, { quoted: FakeVCard });

            // ── Download all songs one by one ──
            let success = 0;
            let failed  = 0;

            for (let i = 0; i < songList.length; i++) {
                const video = songList[i];
                try {
                    await conn.sendMessage(from, {
                        text: `📥 *[${i + 1}/${songList.length}]* ${trimTitle(video.title, 45)}`
                    }, { quoted: FakeVCard });

                    const songUrl = await getSongUrl(video.url);

                    if (choice === 1) {
                        await sendAudio(conn, from, songUrl, video.title, FakeVCard);
                    } else if (choice === 2) {
                        await sendDocument(conn, from, songUrl, video.title, FakeVCard);
                    } else {
                        await sendVoiceNote(conn, from, songUrl, FakeVCard);
                    }

                    success++;
                    await sleep(1500);

                } catch (e) {
                    failed++;
                    console.error(`[YTLIST] Failed: ${video.title} — ${e.message}`);
                    await conn.sendMessage(from, {
                        text: `⚠️ *[${i + 1}] Skip:* ${trimTitle(video.title, 40)}\n_${e.message}_`
                    }, { quoted: FakeVCard });
                    await sleep(1000);
                }
            }

            // ── Final summary ──
            await conn.sendMessage(from, { react: { text: '🎉', key: replyMsg.key } });
            await conn.sendMessage(from, {
                text: `🎉 *Playlist Download Complete!*\n\n`
                    + `━━━━━━━━━━━━━━━━━━━━━\n`
                    + `✅ *Success:* ${success} songs\n`
                    + `❌ *Failed:* ${failed} songs\n`
                    + `📦 *Format:* ${formatName}\n`
                    + `━━━━━━━━━━━━━━━━━━━━━\n\n`
                    + `> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮`
            }, { quoted: FakeVCard });
        };

        conn.ev.on('messages.upsert', formatListener);
        setTimeout(() => {
            if (!formatProcessing) conn.ev.off('messages.upsert', formatListener);
        }, 120000);

    } catch (e) {
        console.error('[YTLIST ERROR]', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Error!*\n_${e.message}_`);
    }
});
