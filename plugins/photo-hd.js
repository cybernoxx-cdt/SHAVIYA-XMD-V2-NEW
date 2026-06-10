// plugins/hd.js — SHAVIYA-XMD V2 | React System
const { cmd } = require('../command');
const sharp = require("sharp");

// ── React helper ─────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

function getArgsText(args) {
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    return "";
}

function getScaleFromArgs(text) {
    const lower = String(text || "").toLowerCase();
    if (lower.includes("4x") || lower.includes("uhd") || lower.includes("ultra")) return 4;
    if (lower.includes("3x")) return 3;
    return 2;
}

function isImageMessage(m) {
    const q = m.quoted?.message || {};
    const d = m.message || {};
    return Boolean(
        q.imageMessage || d.imageMessage ||
        m.quoted?.mtype?.includes?.("imageMessage")
    );
}

async function downloadImage(m) {
    if (m.quoted && typeof m.quoted.download === "function") return await m.quoted.download();
    if (typeof m.download === "function") return await m.download();
    throw new Error("Image download කරන්න බැරි වුණා.");
}

async function enhanceImage(inputBuffer, scale) {
    const meta    = await sharp(inputBuffer, { failOn: "none" }).metadata();
    const w       = meta.width || 512;
    const h       = meta.height || 512;
    const maxSize = scale >= 4 ? 4096 : 2560;
    return await sharp(inputBuffer)
        .rotate()
        .resize({ width: Math.min(w * scale, maxSize), height: Math.min(h * scale, maxSize), fit: "inside", kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
        .modulate({ brightness: 1.04, saturation: 1.12 })
        .gamma(1.08)
        .median(1)
        .sharpen({ sigma: 1.4, m1: 1.2, m2: 2.2, x1: 2, y2: 10, y3: 20 })
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();
}

// ══════════════════════════════════════════════════════════════
//  shared handler
// ══════════════════════════════════════════════════════════════
async function hdHandler(conn, mek, m, { from, q, reply }) {
    if (!isImageMessage(m)) {
        await react(conn, from, mek.key, "❌");
        return reply("🖼️ Photo එකකට reply කරලා command දෙන්න.\n\nඋදා:\n.hd\n.hd uhd\n.remini 4x");
    }

    const scale = getScaleFromArgs(getArgsText(q));
    await react(conn, from, mek.key, "🪄");

    try {
        const imageBuffer = await downloadImage(m);

        if (!imageBuffer || imageBuffer.length < 500) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Photo download කරන්න බැරි වුණා.");
        }
        if (imageBuffer.length > 20 * 1024 * 1024) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Photo ලොකු වැඩියි. 20MB ට අඩු try කරන්න.");
        }

        await react(conn, from, mek.key, "⏳");
        await reply(`⏳ Photo ${scale}x HD කරනවා... ටිකක් ඉන්න.`);

        const outputBuffer = await enhanceImage(imageBuffer, scale);

        await conn.sendMessage(from, {
            image: outputBuffer,
            mimetype: "image/jpeg",
            caption: `✅ HD Enhance complete!\n🔍 Mode: ${scale}x ${scale >= 4 ? "UHD" : "HD"}`
        }, { quoted: mek });

        await react(conn, from, mek.key, "✅");
    } catch (err) {
        console.error("HD error:", err);
        await react(conn, from, mek.key, "❌");
        reply("❌ HD කරන්න බැරි වුණා.\n\nහේතුව: " + err.message);
    }
}

cmd({ pattern: "remini", react: "🪄", category: "tools", fromMe: false, desc: "Photo HD/UHD quality enhance" }, hdHandler);
cmd({ pattern: "hd",     react: "🪄", category: "tools", fromMe: false, desc: "Photo HD quality enhance"     }, hdHandler);
