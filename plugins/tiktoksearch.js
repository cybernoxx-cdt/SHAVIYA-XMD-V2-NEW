// plugins/tiktoksearch.js — SHAVIYA-XMD V2 | React System
const axios = require("axios");
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = require("@whiskeysockets/baileys");
const { cmd } = require('../command');

const API_TOKEN       = process.env.WHITESHADOW_API_TOKEN || "VK4fry";
const WHITESHADOW_API = "https://whiteshadow-x-api.onrender.com/api/search/tiktok";
const TIKWM_API       = "https://tikwm.com/api/feed/search";
const MAX_RESULTS     = Number(process.env.TS_MAX_RESULTS || 6);
const MAX_MB          = Number(process.env.TS_MAX_VIDEO_MB || 45);
const MAX_BYTES       = MAX_MB * 1024 * 1024;

const HDR_TITLE   = toFullWidth("SHAVIYA-XMD TIKTOK");
const HDR_FOOTER  = "| POWERED BY Savendra Dampriya";
const CARD_FOOTER = "Sʜᴀᴠɪʏᴀ Xᴍᴅ";

// ── React helper ─────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

function toFullWidth(text) {
    return String(text).replace(/[A-Z0-9.]/g, c =>
        c === "." ? "\uFF0E" : String.fromCharCode(c.charCodeAt(0) + 0xfee0)
    );
}

function getQuery(args) {
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    return "";
}

function truncate(v, max) {
    const t = String(v || "").replace(/\s+/g, " ").trim();
    return t.length <= max ? t : t.slice(0, max - 1) + "\u2026";
}

function pickArr(p) {
    if (Array.isArray(p)) return p;
    for (const k of ["results","data","data.results","data.videos","result"]) {
        const val = k.split(".").reduce((o,x) => o?.[x], p);
        if (Array.isArray(val)) return val;
    }
    return [];
}

function first(...vals) {
    for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
    return "";
}

function absUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return "https://tikwm.com" + url;
    return url;
}

function createProto(T, v) {
    if (T?.fromObject) return T.fromObject(v);
    if (T?.create) return T.create(v);
    return v;
}

function pageUrl(v) {
    const id   = first(v.id, v.video_id, v.aweme_id);
    const user = first(v.author?.unique_id, v.author?.username, v.author_unique_id, v.username, v.unique_id);
    return id && user ? `https://www.tiktok.com/@${user}/video/${id}` : "";
}

function normalize(r, i) {
    const title  = first(r.title, r.caption, r.desc, r.description, r.text, `TikTok #${i + 1}`);
    const author = first(r.author?.nickname, r.author?.unique_id, r.nickname, r.username);
    const body   = first(r.caption, r.desc, r.description, r.hashtags, author ? `Creator: ${author}` : "", title);
    const thumb  = absUrl(first(r.thumbnail, r.cover, r.dynamic_cover, r.origin_cover, r.image, r.thumb));
    const video  = absUrl(first(r.play, r.wmplay, r.hdplay, r.video, r.video_url, r.play_url, r.download, r.download_url, r.no_watermark, r.nowm, r.nwm_video_url));
    const link   = first(r.url, r.link, r.share_url, r.shareUrl, r.webpage_url, pageUrl(r));
    return { title, body, thumb, video, url: link || video };
}

async function tikwmSearch(q) {
    const { data } = await axios.post(TIKWM_API, new URLSearchParams({ keywords: q, count: String(MAX_RESULTS), cursor: "0" }), {
        timeout: 15000,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", Referer: "https://tikwm.com/" }
    });
    return pickArr(data).map(normalize);
}

async function wsSearch(q) {
    const { data } = await axios.get(`${WHITESHADOW_API}?query=${encodeURIComponent(q)}&apitoken=${API_TOKEN}`, { timeout: 15000 });
    return pickArr(data).map(normalize);
}

async function getVideos(q) {
    try {
        const v = (await tikwmSearch(q)).filter(x => x.url && x.video).slice(0, MAX_RESULTS);
        if (v.length) return v;
    } catch(e) { console.error("TikWM error:", e.message); }
    const v = (await wsSearch(q)).filter(x => x.url && x.video).slice(0, MAX_RESULTS);
    if (!v.length) throw new Error("No downloadable TikTok videos found");
    return v;
}

async function dlBuf(url) {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 25000, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES,
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://tikwm.com/", Accept: "video/mp4,video/*,*/*" }
    });
    const buf = Buffer.from(r.data);
    if (!buf.length) throw new Error("Empty buffer");
    if (buf.length > MAX_BYTES) throw new Error(`Video > ${MAX_MB}MB`);
    return buf;
}

async function prepHeader(conn, v) {
    if (!v.video) throw new Error("No video URL");
    const buf = await dlBuf(v.video);
    const media = await prepareWAMessageMedia({ video: buf, mimetype: "video/mp4" }, { upload: conn.waUploadToServer });
    if (!media.videoMessage) throw new Error("videoMessage not created");
    media.videoMessage.mimetype = "video/mp4";
    media.videoMessage.gifPlayback = false;
    return media.videoMessage;
}

async function buildCards(conn, videos) {
    const IM = proto.Message.InteractiveMessage;
    const cards = [];
    for (const v of videos) {
        try {
            const videoMessage = await prepHeader(conn, v);
            cards.push(createProto(IM, {
                header: createProto(IM.Header, { title: truncate(v.title, 30), hasMediaAttachment: true, videoMessage }),
                body:   createProto(IM.Body, { text: truncate(v.body, 60) }),
                footer: createProto(IM.Footer, { text: CARD_FOOTER }),
                nativeFlowMessage: createProto(IM.NativeFlowMessage, {
                    buttons: [{ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📥 Download Video", id: `.tiktok ${v.url}` }) }]
                })
            }));
        } catch(e) { console.error("Card skip:", v.title, e.message); }
    }
    return cards;
}

async function sendCarousel(conn, mek, from, q, videos) {
    const IM = proto.Message.InteractiveMessage;
    const CM = IM?.CarouselMessage || proto.Message.CarouselMessage;
    if (!IM || !CM) throw new Error("Proto not found");
    if (typeof conn?.relayMessage !== "function") throw new Error("relayMessage unavailable");

    const cards = await buildCards(conn, videos);
    if (!cards.length) throw new Error("No cards built");

    const im = createProto(IM, {
        header: createProto(IM.Header, { title: HDR_TITLE, hasMediaAttachment: false }),
        body:   createProto(IM.Body,   { text: `🔍 TikTok: ${q}` }),
        footer: createProto(IM.Footer, { text: HDR_FOOTER }),
        carouselMessage: createProto(CM, { cards, messageVersion: 1 })
    });

    const msg = generateWAMessageFromContent(from, {
        viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: im } }
    }, { quoted: mek });

    await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
}

async function sendFallback(conn, mek, from, q, videos) {
    const lines = [`🔍 TikTok results for: ${q}`, "", ...videos.slice(0, MAX_RESULTS).map((v, i) => `${i + 1}. ${truncate(v.title, 80)}\n${v.url}`)];
    await conn.sendMessage(from, { text: lines.join("\n\n") }, { quoted: mek });
}

// ══════════════════════════════════════════════════════════════
//  .ts command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "ts",
    react: "🔍",
    fromMe: false,
    category: "search",
    desc: "TikTok videos search කරලා carousel ලෙස show කරන්න"
}, async (conn, mek, m, { from, q, reply }) => {
    const query = getQuery(q);
    if (!query) {
        await react(conn, from, mek.key, "❌");
        return reply(`❌ *Usage:* \`.ts sadew\``);
    }

    await react(conn, from, mek.key, "🔍");

    try {
        const videos = await getVideos(query);

        try {
            await sendCarousel(conn, mek, from, query, videos);
        } catch(ce) {
            console.error("Carousel failed, fallback:", ce.message);
            await sendFallback(conn, mek, from, query, videos);
        }

        await react(conn, from, mek.key, "✅");
    } catch(err) {
        console.error("TS Error:", err);
        await react(conn, from, mek.key, "❌");
        reply(`❌ TikTok search failed.\nReason: ${err?.response?.data?.message || err.message || "Unknown"}`);
    }
});
