// plugins/sinhala-sub-2.js — SHAVIYA-XMD V2 | FULLY FIXED
// ✅ Fix 1: direct_link fallback (link / url / direct_link)
// ✅ Fix 2: Movie video ලෙස send + download link දෙකම
// ✅ Fix 3: listenForNumberReply — @lid + fromMe bot reply fix
// ✅ Fix 4: quality match — size vs quality field fix
// ✅ Fix 5: timeout extended to 10min

const { cmd } = require('../command');
const axios = require("axios");

const API_KEY  = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/sinhalasub";

function getQuery(q) {
    if (!q) return "";
    if (Array.isArray(q)) return q.join(" ").trim();
    if (typeof q === "string") return q.trim();
    if (typeof q === "object") return Object.values(q).join(" ").trim();
    return "";
}

// ── React helper ─────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

// ✅ FIX 3: listenForNumberReply — @lid + bot number + fromMe fix
function listenForNumberReply(conn, from, sender, targetMsgId, timeoutMs, callback) {
    const senderNum = sender.split("@")[0].replace(/[^0-9]/g, "");

    const handler = ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message) return;

        // reply context check
        const allMsgTypes = [
            msg.message.extendedTextMessage,
            msg.message.imageMessage,
            msg.message.videoMessage,
            msg.message.audioMessage,
            msg.message.documentMessage,
            msg.message.ephemeralMessage?.message?.extendedTextMessage,
        ];
        const stanzaId = allMsgTypes.find(t => t?.contextInfo?.stanzaId)?.contextInfo?.stanzaId;
        if (stanzaId !== targetMsgId) return;

        // sender check — number + @lid support
        const msgJid = msg.key.participant || msg.key.remoteJid || "";
        const msgNum = msgJid.split("@")[0].replace(/[^0-9]/g, "");
        const isCorrectUser = msgNum === senderNum || msgJid.includes("@lid");

        if (msg.key.remoteJid !== from && msg.key.remoteJid !== from.replace("@s.whatsapp.net", "")) return;
        if (!isCorrectUser) return;

        // get text
        const text = (
            msg.message.extendedTextMessage?.text ||
            msg.message.conversation ||
            msg.message.ephemeralMessage?.message?.extendedTextMessage?.text ||
            ""
        ).trim();

        if (!/^\d+$/.test(text)) return;

        conn.ev.off("messages.upsert", handler);
        clearTimeout(timer);
        callback(text, msg);
    };

    const timer = setTimeout(() => conn.ev.off("messages.upsert", handler), timeoutMs);
    conn.ev.on("messages.upsert", handler);
}

// ✅ FIX 1: direct_link fallback helper
function getDirectLink(linkObj) {
    return linkObj?.direct_link || linkObj?.link || linkObj?.url || linkObj?.download_link || null;
}

// ✅ FIX 4: quality match helper (size OR quality field)
function matchQuality(linkObj, qualityStr) {
    const s = (linkObj?.size || "").toLowerCase();
    const q = (linkObj?.quality || "").toLowerCase();
    const t = qualityStr.toLowerCase();
    return s.includes(t) || q.includes(t) ||
           s.replace(/\s/g,"").includes(t.replace(/\s/g,"")) ||
           q.replace(/\s/g,"").includes(t.replace(/\s/g,""));
}

// ══════════════════════════════════════════════════════════════
//  .ss2 command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "ss2",
    alias: ["cinema", "films"],
    react: "🎬",
    category: "download",
    fromMe: false,
    desc: "🎬 සිංහල උපසිරැසි චිත්‍රපට සොයා ගන්න"
}, async (conn, mek, m, { from, q, reply, sender, prefix }) => {
    const query = getQuery(q);
    const _p = prefix || ".";

    if (!query) {
        return reply(
            `🎬 *සිංහල චිත්‍රපට සෙවුම*\n\n` +
            `*Usage:* ${_p}ss2 <movie name>\n` +
            `*Example:* ${_p}ss2 kishkindha`
        );
    }

    await react(conn, from, mek.key, "🔍");

    try {
        await conn.sendPresenceUpdate("composing", from);

        const { data } = await axios.get(
            `${API_BASE}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`,
            { timeout: 15000 }
        );

        if (!data?.success || !data?.results?.length) {
            await react(conn, from, mek.key, "❌");
            return reply(`❌ "${query}" සඳහා ප්‍රතිඵල හමු නොවිණි.`);
        }

        const results = data.results.slice(0, 8);
        let listMsg = `🎬 *සිංහල උපසිරැසි ප්‍රතිඵල*\n🔍 *${query}*\n📊 හමු වූ: ${results.length}\n\n`;
        results.forEach((movie, i) => { listMsg += `${i + 1}. *${movie.title}*\n`; });
        listMsg += `\n📌 *ඉහත message reply කරලා අංකය type කරන්න*\nඋදා: *1*`;

        const sentMsg = await conn.sendMessage(from, { text: listMsg }, { quoted: mek });
        await react(conn, from, mek.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 10 * 60 * 1000, async (num, replyMsg) => {
            const idx = parseInt(num) - 1;
            if (idx < 0 || idx >= results.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${results.length} අතර අංකයක් reply කරන්න.` }, { quoted: replyMsg });
            }
            await react(conn, from, replyMsg.key, "⏳");
            await fetchQualityOptions(conn, mek, replyMsg, from, sender, _p, results[idx].url, results[idx].title);
        });

    } catch (err) {
        console.error("Movie search error:", err);
        await react(conn, from, mek.key, "❌");
        reply(`❌ සෙවීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
});

// ── Quality options ───────────────────────────────────────────
async function fetchQualityOptions(conn, mek, triggerMsg, from, sender, prefix, movieUrl, title) {
    try {
        await conn.sendPresenceUpdate("composing", from);

        const { data } = await axios.get(
            `${API_BASE}/dl?apiKey=${API_KEY}&text=${encodeURIComponent(movieUrl)}`,
            { timeout: 20000 }
        );

        if (!data?.success || !data?.results?.links?.length) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ "${title}" සඳහා download links හමු නොවිණි.` }, { quoted: mek });
        }

        const allLinks   = data.results.links;

        // ✅ FIX 4: quality/size field දෙකම check කරනවා
        const videoLinks = allLinks.filter(l => {
            const q = (l.quality || "").toLowerCase();
            const s = (l.size || "").toLowerCase();
            return !q.includes("subtitle") && !s.includes("subtitle");
        });
        const subLink = allLinks.find(l => {
            const q = (l.quality || "").toLowerCase();
            const s = (l.size || "").toLowerCase();
            return q.includes("subtitle") || s.includes("subtitle");
        });

        const has720p = videoLinks.some(l => matchQuality(l, "720p") || matchQuality(l, "hd"));
        const has480p = videoLinks.some(l => matchQuality(l, "480p") || matchQuality(l, "sd"));
        const hasOther = videoLinks.length > 0;

        if (!hasOther) {
            await react(conn, from, triggerMsg.key, "❌");
            return conn.sendMessage(from, { text: `❌ Download links හමු නොවිණි.` }, { quoted: mek });
        }

        const options = [];
        let qualMsg = `🎬 *${title}*\n📥 *Quality reply කරලා තෝරන්න:*\n\n`;

        if (has720p) { qualMsg += `*1.* 🎥 720p (HD) – උසස් quality\n`; options.push("720p"); }
        if (has480p) { qualMsg += `*${options.length + 1}.* 📺 480p (SD) – කුඩා ගොනු\n`; options.push("480p"); }

        // 720p/480p නැත්නම් ඇති links list කරනවා
        if (options.length === 0) {
            videoLinks.slice(0, 4).forEach((l, i) => {
                const label = l.quality || l.size || `Option ${i+1}`;
                qualMsg += `*${i + 1}.* ${label}\n`;
                options.push(l.quality || l.size || `opt${i}`);
            });
        }

        qualMsg += `\n📌 *ඉහත message reply කරලා අංකය type කරන්න*`;

        const sentMsg = await conn.sendMessage(from, { text: qualMsg }, { quoted: mek });
        await react(conn, from, triggerMsg.key, "✅");

        listenForNumberReply(conn, from, sender, sentMsg.key.id, 10 * 60 * 1000, async (num, replyMsg) => {
            const qIdx = parseInt(num) - 1;
            if (qIdx < 0 || qIdx >= options.length) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ 1–${options.length} අතර reply කරන්න.` }, { quoted: mek });
            }

            await react(conn, from, replyMsg.key, "📥");

            // ✅ FIX 4: size/quality දෙකම match
            const link = videoLinks.find(l => matchQuality(l, options[qIdx])) || videoLinks[qIdx];

            if (!link) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ Link හමු නොවිණි.` }, { quoted: mek });
            }

            // ✅ FIX 1: direct_link fallback
            const dlLink  = getDirectLink(link);
            const subDl   = subLink ? getDirectLink(subLink) : null;
            const quality = link.quality || link.size || options[qIdx];

            if (!dlLink) {
                await react(conn, from, replyMsg.key, "❌");
                return conn.sendMessage(from, { text: `❌ Download link හමු නොවිණි.` }, { quoted: mek });
            }

            await react(conn, from, replyMsg.key, "⏳");
            await conn.sendMessage(from, { text: `⏳ Movie download කරනවා... ටිකක් ඉන්න.` }, { quoted: mek });

            // ✅ FIX 2: Video ලෙස send කරනවා, fail වෙනවිට link දෙනවා
            try {
                const response = await axios.get(dlLink, {
                    responseType: "arraybuffer",
                    timeout: 5 * 60 * 1000,
                    maxContentLength: 300 * 1024 * 1024, // 300MB max
                    headers: { "User-Agent": "Mozilla/5.0" }
                });

                const videoBuffer = Buffer.from(response.data);

                await conn.sendMessage(from, {
                    video: videoBuffer,
                    mimetype: "video/mp4",
                    caption:
                        `✅ *${title}*\n` +
                        `🎥 Quality: ${quality}\n` +
                        (subDl ? `📝 Subtitles: ${subDl}\n` : "") +
                        `\n> 🎬 Powered by SHAVIYA-XMD V2`
                }, { quoted: mek });

                await react(conn, from, replyMsg.key, "✅");

            } catch (videoErr) {
                // Video send fail වෙනවිට download link text ලෙස දෙනවා
                console.error("Video send error:", videoErr.message);
                await conn.sendMessage(from, {
                    text:
                        `✅ *${title}*\n\n` +
                        `📥 *Download Link (${quality}):*\n${dlLink}` +
                        (subDl ? `\n\n📝 *Subtitles:*\n${subDl}` : "") +
                        `\n\n_⚠️ Video direct send අසාර්ථකයි — link copy කරලා download කරන්න_` +
                        `\n\n> 🎬 Powered by SHAVIYA-XMD V2`
                }, { quoted: mek });

                await react(conn, from, replyMsg.key, "✅");
            }
        });

    } catch (err) {
        console.error("Quality fetch error:", err);
        await react(conn, from, triggerMsg.key, "❌");
        conn.sendMessage(from, { text: `❌ Quality ලබා ගැනීම අසාර්ථකයි: ${err.message.substring(0, 100)}` }, { quoted: mek });
    }
}
