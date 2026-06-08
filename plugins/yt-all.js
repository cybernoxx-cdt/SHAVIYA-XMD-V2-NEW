// ============================================================
//  yt.js — SHAVIYA-XMD V2
//  YouTube Downloader — Search by name or direct URL
//  © Mr Savendra
// ============================================================

const { cmd }  = require('../command');
const axios    = require('axios');

const fakevCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '⚡ Sʜᴀᴠɪʏᴀ Xᴍᴅ',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern:  'yt',
    alias:    ['youtube', 'ytdl', 'ytmp3'],
    react:    '🎬',
    desc:     'Download YouTube videos or audio by name/link',
    category: 'download',
    use:      '.yt <title or link>',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, q }) => {
    try {
        // ── 1. Get query ──────────────────────────────────
        const query = q?.trim();

        if (!query) {
            return reply(
                `╭━━━〔 🎬 *YOUTUBE DOWNLOADER* 〕━━━╮\n` +
                `┃\n` +
                `┃ ⚠️ *Usage:* .yt <title or link>\n` +
                `┃\n` +
                `┃ 📌 *Examples:*\n` +
                `┃  .yt Lelena Nilan Hettiarachchi\n` +
                `┃  .yt https://youtube.com/watch?v=...\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━╯`
            );
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoUrl = '';
        let title    = '';
        let thumbnail = '';

        // ── 2. URL or search name ─────────────────────────
        const isUrl = query.startsWith('http://') || query.startsWith('https://');

        if (!isUrl) {
            // Search by name
            const searchRes  = await axios.get(`https://whiteshadow-yts.vercel.app/?q=${encodeURIComponent(query)}`);
            const searchData = searchRes.data;

            if (!searchData.success || !searchData.videos?.length) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return reply('❌ *ඔබ සෙවූ Video එක සොයාගත නොහැක!*');
            }

            const firstVideo = searchData.videos.find(v => v.type === 'video');
            if (!firstVideo) return reply('❌ *Video එකක් සොයාගැනීමට නොහැකි විය.*');

            videoUrl  = firstVideo.url;
            title     = firstVideo.name;
            thumbnail = firstVideo.thumbnail;

        } else {
            // Direct URL
            videoUrl = query;

            const infoRes  = await axios.get(`https://api-ytdlwsmd-mini.vercel.app/api/download?url=${encodeURIComponent(videoUrl)}&quality=360p`).catch(() => null);
            const infoData = infoRes?.data || null;

            title = infoData?.result?.title || 'YouTube Video';

            let videoId = '';
            if (videoUrl.includes('youtu.be/'))    videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
            else if (videoUrl.includes('v='))       videoId = videoUrl.split('v=')[1].split('&')[0];

            thumbnail = videoId
                ? `https://i.ytimg.com/vi/${videoId}/hq720.jpg`
                : 'https://i.ibb.co/7XvXZyy/youtube-logo.png';
        }

        // ── 3. Build menu ─────────────────────────────────
        const menuText =
`╭━━━〔 🎬 *YOUTUBE DOWNLOADER* 〕━━━╮
┃
┃ 📌 *Title:* ${title.substring(0, 40)}
┃ 🔗 *Link:* ${videoUrl}
┃
┃ 🎥 *VIDEO FORMATS*
┃  1️⃣ | 144p Video
┃  2️⃣ | 360p Video
┃  3️⃣ | 480p Video
┃  4️⃣ | 720p Video
┃  5️⃣ | 1080p Video
┃
┃ 📂 *DOCUMENT FORMATS (Video)*
┃  6️⃣ | 360p Document
┃  7️⃣ | 720p Document
┃  8️⃣ | 1080p Document
┃
┃ 🎵 *AUDIO FORMATS*
┃  9️⃣ | MP3 Audio
┃  🔟 | MP3 Document
┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

> *කරුණාකර ඔබට අවශ්‍ය Format එකට Reply කරන්න!*`;

        // ── 4. Send menu with thumbnail ───────────────────
        const listMsg = await conn.sendMessage(from, {
            image:   { url: thumbnail },
            caption: menuText,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid:     '120363317972190466@newsletter',
                    newsletterName:    '𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮',
                    serverMessageId:   143
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '🔢', key: mek.key } });

        // ── 5. Format map ─────────────────────────────────
        const options = {
            1:  { q: '144p',  t: 'video' },
            2:  { q: '360p',  t: 'video' },
            3:  { q: '480p',  t: 'video' },
            4:  { q: '720p',  t: 'video' },
            5:  { q: '1080p', t: 'video' },
            6:  { q: '360p',  t: 'doc'   },
            7:  { q: '720p',  t: 'doc'   },
            8:  { q: '1080p', t: 'doc'   },
            9:  { q: 'mp3',   t: 'audio' },
            10: { q: 'mp3',   t: 'doc_audio' }
        };

        // ── 6. One-shot reply listener ────────────────────
        const listener = async ({ messages }) => {
            const replyMsg = messages[0];
            if (!replyMsg?.message) return;

            const replyContext  = replyMsg.message.extendedTextMessage?.contextInfo;
            const isReplyToBot  = replyContext?.stanzaId === listMsg.key.id;
            if (!isReplyToBot) return;

            const userReply = (
                replyMsg.message.extendedTextMessage?.text ||
                replyMsg.message.conversation || ''
            ).trim();
            const choice = parseInt(userReply);

            if (isNaN(choice) || choice < 1 || choice > 10) {
                return conn.sendMessage(from, {
                    text: '❌ *1 සිට 10 දක්වා නිවැරදි අංකයක් Reply කරන්න!*'
                }, { quoted: replyMsg });
            }

            // Remove listener immediately (one-shot)
            conn.ev.off('messages.upsert', listener);
            clearTimeout(timeout);

            const selected = options[choice];

            try {
                await conn.sendMessage(from, { react: { text: '⬇️', key: replyMsg.key } });
                await conn.sendMessage(from, {
                    text: `⬇️ *Downloading ${selected.q} format...*\n_මෙය සුළු වේලාවක් ගතවනු ඇත_`
                }, { quoted: replyMsg });

                const dlRes  = await axios.get(
                    `https://api-ytdlwsmd-mini.vercel.app/api/download?url=${encodeURIComponent(videoUrl)}&quality=${selected.q}`
                );
                const dlData = dlRes.data;

                if (!dlData.status || !dlData.result?.download) {
                    await conn.sendMessage(from, { react: { text: '❌', key: replyMsg.key } });
                    return conn.sendMessage(from, {
                        text: '❌ *Download Link ලබාගැනීම අසාර්ථකයි!*'
                    }, { quoted: replyMsg });
                }

                const downloadUrl = dlData.result.download;
                const finalTitle  = dlData.result.title || title;
                const safeTitle   = finalTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim();

                // Check file size
                const head        = await axios.head(downloadUrl).catch(() => null);
                const sizeBytes   = head?.headers['content-length'];
                const fileSizeMB  = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : 0;

                if (sizeBytes && parseFloat(fileSizeMB) > 1900) {
                    return conn.sendMessage(from, {
                        text: `⚠️ *File Size:* ${fileSizeMB} MB — ගොනුව ලොකු වැඩියි! (max 1.9GB)`
                    }, { quoted: replyMsg });
                }

                // Stream download
                const stream = await axios({ method: 'get', url: downloadUrl, responseType: 'stream' });

                const finalCaption =
`╭━━━〔 📥 *YOUTUBE DOWNLOADER* 〕━━━╮
┃
┃ 🎬 *Title:* ${finalTitle.substring(0, 30)}
┃ 📈 *Quality:* ${selected.q}
┃ ⚖️ *Size:* ${fileSizeMB > 0 ? fileSizeMB + ' MB' : 'Unknown'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯
> ⚡ *Powered by Sʜᴀᴠɪʏᴀ Xᴍᴅ*`;

                if (selected.t === 'video') {
                    await conn.sendMessage(from, {
                        video:    { stream: stream.data },
                        mimetype: 'video/mp4',
                        caption:  finalCaption
                    }, { quoted: replyMsg });

                } else if (selected.t === 'doc') {
                    await conn.sendMessage(from, {
                        document: { stream: stream.data },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}_${selected.q}.mp4`,
                        caption:  finalCaption
                    }, { quoted: replyMsg });

                } else if (selected.t === 'audio') {
                    await conn.sendMessage(from, {
                        audio:    { stream: stream.data },
                        mimetype: 'audio/mpeg',
                        ptt:      false
                    }, { quoted: replyMsg });

                } else if (selected.t === 'doc_audio') {
                    await conn.sendMessage(from, {
                        document: { stream: stream.data },
                        mimetype: 'audio/mpeg',
                        fileName: `${safeTitle}.mp3`,
                        caption:  finalCaption
                    }, { quoted: replyMsg });
                }

                await conn.sendMessage(from, { react: { text: '✅', key: replyMsg.key } });

            } catch (dlErr) {
                console.error('[YT DOWNLOAD ERROR]', dlErr.message);
                await conn.sendMessage(from, {
                    text: '❌ *Download Failed!* Server Error.'
                }, { quoted: replyMsg });
            }
        };

        conn.ev.on('messages.upsert', listener);

        // Auto-remove after 2 minutes
        const timeout = setTimeout(() => {
            conn.ev.off('messages.upsert', listener);
        }, 120_000);

    } catch (e) {
        console.error('[YT CMD ERROR]', e.message);
        reply('❌ *API Error. Please try again.*');
    }
});
