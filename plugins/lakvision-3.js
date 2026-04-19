const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ───────── CONFIGURATION ─────────
const FOOTER = "Sʜᴀᴠɪʏᴀ Cɪɴᴇᴍᴀ © ⚜️";
const API_BASE = "https://lakvision-tv.vercel.app/api";
const THUMB_URL = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

// ───────── Thumbnail Generator ─────────
async function makeThumbnail(url) {
    try {
        const sharp = require("sharp");
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        return null;
    }
}

// ───────── React helper ─────────
async function react(conn, jid, key, emoji) {
    try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ───────── YouTube URL helpers ─────────
// embed URL → standard watch URL convert
function embedToWatchUrl(url) {
    // https://www.youtube.com/embed/VmOsXQlWB_c?... → https://www.youtube.com/watch?v=VmOsXQlWB_c
    const match = url.match(/youtube\.com\/embed\/([\w-]+)/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    // youtu.be short
    const match2 = url.match(/youtu\.be\/([\w-]+)/);
    if (match2) return `https://www.youtube.com/watch?v=${match2[1]}`;
    return url;
}

function isYouTubeUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be");
}

function isDailymotionUrl(url) {
    return url.includes("dailymotion.com");
}

// ───────── Get YouTube direct stream URL via ytdl-core ─────────
// yt-dlp binary නැතිව ytdl-core npm package use කරයි
async function getYouTubeStreamUrl(youtubeUrl) {
    let ytdl;
    try {
        ytdl = require("@distube/ytdl-core");
    } catch {
        try {
            ytdl = require("ytdl-core");
        } catch {
            throw new Error("ytdl-core not installed. Run: npm install @distube/ytdl-core");
        }
    }

    const watchUrl = embedToWatchUrl(youtubeUrl);
    const info = await ytdl.getInfo(watchUrl, { requestOptions: { timeout: 30000 } });

    // Best mp4 format select
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");
    const mp4Formats = formats.filter(f => f.container === "mp4").sort((a, b) => (b.height || 0) - (a.height || 0));
    const chosen = mp4Formats[0] || formats[0];

    if (!chosen) throw new Error("No downloadable format found");

    return {
        url: chosen.url,
        quality: chosen.qualityLabel || chosen.quality || "unknown",
        title: info.videoDetails.title,
    };
}

// ───────── Get Dailymotion stream URL ─────────
async function getDailymotionStreamUrl(dmUrl) {
    // Extract video ID
    const match = dmUrl.match(/\/video\/([\w]+)/);
    if (!match) throw new Error("Cannot parse Dailymotion URL");
    const videoId = match[1];

    // Dailymotion public API
    const apiUrl = `https://www.dailymotion.com/player/metadata/video/${videoId}`;
    const res = await axios.get(apiUrl, { timeout: 20000 });
    const qualities = res.data?.qualities;
    if (!qualities) throw new Error("No qualities from Dailymotion API");

    // Best quality: 1080 > 720 > 480 > auto
    const preferOrder = ["1080", "720", "480", "380", "240", "auto"];
    for (const q of preferOrder) {
        if (qualities[q]?.length) {
            const m3u8 = qualities[q].find(s => s.type === "application/x-mpegURL");
            if (m3u8) return { url: m3u8.url, quality: q + "p", type: "m3u8" };
        }
    }
    throw new Error("No Dailymotion stream found");
}

// ───────── Send file via URL stream (no RAM buffer) ─────────
async function sendVideoByUrl(conn, from, streamUrl, fileName, caption, quotedMsg) {
    const thumb = await makeThumbnail(THUMB_URL);
    const docMsg = await conn.sendMessage(from, {
        document: { url: streamUrl },
        mimetype: "video/mp4",
        fileName: fileName.replace(/[^\w\s.\-()[\]]/g, ""),
        jpegThumbnail: thumb || undefined,
        caption,
    }, { quoted: quotedMsg });
    await react(conn, from, docMsg.key, "✅");
}

// ───────── ffmpeg stream m3u8 → tmp file → send ─────────
// ffmpeg binary check करके use करो
async function sendM3u8WithFfmpeg(conn, from, m3u8Url, fileName, caption, quotedMsg) {
    const { exec } = require("child_process");
    const tmpPath = path.join("/tmp", `lv_${Date.now()}.mp4`);

    // ffmpeg check
    await new Promise((resolve, reject) => {
        exec("which ffmpeg || ffmpeg -version", (err) => {
            if (err) reject(new Error("ffmpeg not found on this server"));
            else resolve();
        });
    });

    await new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${m3u8Url}" -c copy -bsf:a aac_adtstoasc "${tmpPath}" -y -loglevel error`;
        exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
            if (err) reject(new Error("ffmpeg failed: " + stderr.substring(0, 200)));
            else resolve();
        });
    });

    const stats = fs.statSync(tmpPath);
    if (!stats.size) throw new Error("ffmpeg produced empty file");

    const thumb = await makeThumbnail(THUMB_URL);
    const docMsg = await conn.sendMessage(from, {
        document: fs.readFileSync(tmpPath),
        mimetype: "video/mp4",
        fileName: fileName.replace(/[^\w\s.\-()[\]]/g, ""),
        jpegThumbnail: thumb || undefined,
        caption,
    }, { quoted: quotedMsg });
    await react(conn, from, docMsg.key, "✅");

    try { fs.unlinkSync(tmpPath); } catch {}
}

// ───────── Wait for Reply (multi-reply loop) ─────────
function waitForReply(conn, from, sender, targetId, timeoutMs = 600000) {
    return new Promise((resolve) => {
        let resolved = false;
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;
            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split("@")[0]) || msgSender.includes("@lid");
            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text.trim()) && text.trim() !== "") {
                if (!resolved) {
                    resolved = true;
                    conn.ev.off("messages.upsert", handler);
                    resolve({ msg, text: text.trim() });
                }
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            if (!resolved) {
                conn.ev.off("messages.upsert", handler);
                resolve(null);
            }
        }, timeoutMs);
    });
}

// ───────── Main Command ─────────
cmd({
    pattern: "lakvision",
    alias: ["laktv", "lk", "lakmovie"],
    desc: "LakVision TV - Movies & TV Episodes Downloader",
    category: "downloader",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ Example: .lakvision aladin");

        await react(conn, from, mek.key, "🔍");

        let results;
        try {
            const searchRes = await axios.get(
                `${API_BASE}?action=search&query=${encodeURIComponent(q)}`,
                { timeout: 15000 }
            );
            results = searchRes.data?.results;
        } catch (e) {
            return reply("❌ Search API error: " + e.message);
        }

        if (!results?.length) return reply("❌ ප්‍රතිඵල හමු නොවීය. වෙනත් නමක් උත්සාහ කරන්න.");

        let listText = `🎬 *𝐋𝐀𝐊𝐕𝐈𝐒𝐈𝐎𝐍 𝐓𝐕 𝐒𝐄𝐀𝐑𝐂𝐇*\n🔎 *Query:* ${q}\n\n`;
        results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });
        listText += `\n📌 *අංකය Reply කරන්න*\n\n${FOOTER}`;

        const sentSearch = await conn.sendMessage(from, { text: listText }, { quoted: mek });

        const searchLoop = async () => {
            while (true) {
                const sel = await waitForReply(conn, from, sender, sentSearch.key.id);
                if (!sel) break;
                const idx = parseInt(sel.text) - 1;
                const chosen = results[idx];
                if (!chosen) continue;
                await react(conn, from, sel.msg.key, "⏳");
                handleVideoFlow(conn, from, sender, chosen, sel.msg);
            }
        };
        searchLoop();

    } catch (e) {
        console.log("LakVision Error:", e);
        reply("❌ දෝෂයක් සිදු විය: " + e.message);
    }
});

// ───────── Video Flow Handler ─────────
async function handleVideoFlow(conn, from, sender, item, quotedMsg) {
    try {
        const watchRes = await axios.get(
            `${API_BASE}?action=watch&id=${item.id}`,
            { timeout: 15000 }
        );
        const data = watchRes.data;

        if (!data || data.status === false) {
            return conn.sendMessage(from, { text: "❌ Video details ලබාගැනීමට නොහැකි විය." }, { quoted: quotedMsg });
        }

        const videoUrls = data.video_urls || [];
        if (!videoUrls.length) {
            return conn.sendMessage(from, { text: "❌ Video links හමු නොවීය." }, { quoted: quotedMsg });
        }

        // All links show කරනවා (iframe + m3u8 + mp4 + dailymotion)
        const playableLinks = videoUrls.filter(v => v.url);
        if (!playableLinks.length) {
            return conn.sendMessage(from, { text: "❌ Playable links හමු නොවීය." }, { quoted: quotedMsg });
        }

        let qualText = `🎬 *${data.title}*\n\n📺 *Video Sources:*\n\n`;
        playableLinks.forEach((v, i) => {
            let icon = "🔗";
            if (v.url.includes("youtube") || v.url.includes("youtu.be")) icon = "▶️ YouTube";
            else if (v.url.includes("dailymotion")) icon = "📡 Dailymotion";
            else if (v.url.includes(".m3u8")) icon = "📺 M3U8 Stream";
            else if (v.label?.includes("mp4") || v.url.includes(".mp4")) icon = "🎞️ MP4";
            else if (v.label?.includes("iframe")) icon = "🖥️ Embed";
            qualText += `*${i + 1}.* ${icon} — ${v.label || "Source " + (i + 1)}\n`;
        });
        qualText += `\n📌 *Source අංකය Reply කරන්න*\n\n${FOOTER}`;

        const sentQual = await conn.sendMessage(from, { text: qualText }, { quoted: quotedMsg });

        const qualLoop = async () => {
            while (true) {
                const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
                if (!qSel) break;
                const qIdx = parseInt(qSel.text) - 1;
                const chosenLink = playableLinks[qIdx];
                if (!chosenLink) continue;
                downloadAndSend(conn, from, data, chosenLink, qSel.msg);
            }
        };
        qualLoop();

    } catch (e) {
        console.log("Video flow error:", e);
        conn.sendMessage(from, { text: "❌ Video ලබාගැනීමේ දෝෂයක්: " + e.message }, { quoted: quotedMsg });
    }
}

// ───────── Download & Send Handler ─────────
async function downloadAndSend(conn, from, data, linkObj, quotedMsg) {
    const safeTitle = data.title.replace(/[^\w\s\-]/g, "").trim().replace(/\s+/g, "_").substring(0, 60);
    const fileName = `${safeTitle}_[${linkObj.label || "video"}].mp4`;
    const caption = `✅ *Download Complete!*\n\n🎬 *Title:* ${data.title}\n📡 *Source:* ${linkObj.label || "direct"}\n\n${FOOTER}`;

    try {
        await react(conn, from, quotedMsg.key, "📥");
        await conn.sendMessage(from, {
            text: `⏳ *Downloading...*\n\n🎬 *${data.title}*\n📡 *Source:* ${linkObj.label || "direct"}\n\nකරුණාකර රැඳී සිටින්න...`
        }, { quoted: quotedMsg });

        const rawUrl = linkObj.url;

        // ── YouTube embed / watch URL ──
        if (isYouTubeUrl(rawUrl)) {
            try {
                const yt = await getYouTubeStreamUrl(rawUrl);
                // YouTube direct URL stream (no binary needed)
                await sendVideoByUrl(conn, from, yt.url, fileName, caption, quotedMsg);
                return;
            } catch (ytErr) {
                console.log("⚠️ ytdl-core failed:", ytErr.message);
                // fallback: show manual link
                return conn.sendMessage(from, {
                    text: `⚠️ YouTube direct download failed.\n\n📎 Manual link:\n${embedToWatchUrl(rawUrl)}\n\n💡 ytdl-core install: npm install @distube/ytdl-core`
                }, { quoted: quotedMsg });
            }
        }

        // ── Dailymotion ──
        if (isDailymotionUrl(rawUrl)) {
            try {
                const dm = await getDailymotionStreamUrl(rawUrl);
                if (dm.type === "m3u8") {
                    // try ffmpeg first, fallback URL stream
                    try {
                        await sendM3u8WithFfmpeg(conn, from, dm.url, fileName, caption, quotedMsg);
                    } catch (ffErr) {
                        console.log("⚠️ ffmpeg failed, trying URL stream:", ffErr.message);
                        await sendVideoByUrl(conn, from, dm.url, fileName, caption, quotedMsg);
                    }
                } else {
                    await sendVideoByUrl(conn, from, dm.url, fileName, caption, quotedMsg);
                }
                return;
            } catch (dmErr) {
                console.log("⚠️ Dailymotion failed:", dmErr.message);
                return conn.sendMessage(from, {
                    text: `⚠️ Dailymotion download failed: ${dmErr.message}\n\n🔗 Manual:\n${rawUrl}`
                }, { quoted: quotedMsg });
            }
        }

        // ── M3U8 stream ──
        if (rawUrl.includes(".m3u8") || linkObj.label?.includes("m3u8")) {
            try {
                await sendM3u8WithFfmpeg(conn, from, rawUrl, fileName, caption, quotedMsg);
            } catch (ffErr) {
                console.log("⚠️ ffmpeg failed, URL stream fallback:", ffErr.message);
                await sendVideoByUrl(conn, from, rawUrl, fileName, caption, quotedMsg);
            }
            return;
        }

        // ── Direct MP4 / any other URL ──
        await sendVideoByUrl(conn, from, rawUrl, fileName, caption, quotedMsg);

    } catch (e) {
        console.log("❌ downloadAndSend error:", e.message);
        await react(conn, from, quotedMsg.key, "❌");
        await conn.sendMessage(from, {
            text: `❌ *Download Failed*\n\n🎬 *${data.title}*\n📡 *Source:* ${linkObj.label}\n\n⚠️ දෝෂය: ${e.message}\n\n🔗 *Manual Link:*\n${linkObj.url}`
        }, { quoted: quotedMsg });
    }
}
