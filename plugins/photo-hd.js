// plugins/photo-hd.js — SHAVIYA-XMD V2 | FINAL FIX
// ✅ Framework: m.quoted.type = getContentType(m.quoted) — EXACT structure

const { cmd } = require('../command');
const sharp = require("sharp");

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

// ✅ FINAL FIX: m.quoted.type ← exact framework structure (lib/msg.js)
function isImageMessage(m) {
    if (!m.quoted) return false;
    const type = (m.quoted.type || "").toLowerCase();
    if (type === "imagemessage") return true;
    // viewOnce — check inner msg type
    if (type.startsWith("viewonce")) {
        const innerType = (m.quoted.msg?.type || "").toLowerCase();
        return innerType === "imagemessage";
    }
    // sticker also counts (has image data)
    if (type === "stickermessage") return true;
    return false;
}

// ✅ m.quoted.download() — exact method from framework (lib/msg.js line 105)
async function downloadImage(m) {
    if (m.quoted?.download && typeof m.quoted.download === "function") {
        const buf = await m.quoted.download();
        if (buf?.length > 500) return buf;
    }
    throw new Error("Image download failed.");
}

async function enhanceImage(inputBuffer, scale) {
    const meta    = await sharp(inputBuffer, { failOn: "none" }).metadata();
    const w       = meta.width  || 512;
    const h       = meta.height || 512;
    const maxSize = scale >= 4 ? 4096 : 2560;

    const pipeline = sharp(inputBuffer, { failOn: "none" })
        .rotate()
        .resize({
            width: Math.min(w * scale, maxSize),
            height: Math.min(h * scale, maxSize),
            fit: "inside",
            kernel: sharp.kernel.lanczos3,
            withoutEnlargement: false
        })
        .modulate({ brightness: 1.04, saturation: 1.12 })
        .gamma(1.08)
        .median(1)
        .sharpen({ sigma: 1.4, m1: 1.2, m2: 2.2, x1: 2, y2: 10, y3: 20 });

    try {
        return await pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    } catch {
        return await pipeline.jpeg({ quality: 95 }).toBuffer();
    }
}

async function hdHandler(conn, mek, m, { from, q, reply }) {

    if (!m.quoted) {
        await react(conn, from, mek.key, "❌");
        return reply(
            "🖼️ *Photo එකකට reply කරලා command දෙන්න.*\n\n" +
            "උදා:\n*.hd*\n*.hd uhd*\n*.hd 3x*\n*.remini 4x*"
        );
    }

    if (!isImageMessage(m)) {
        await react(conn, from, mek.key, "❌");
        return reply(
            `🖼️ *Image reply detect නෑ.*\n` +
            `Type: \`${m.quoted.type || "unknown"}\`\n\n` +
            `Photo (image) reply කරලා try කරන්න.`
        );
    }

    const scale = getScaleFromArgs(getArgsText(q));
    await react(conn, from, mek.key, "🪄");

    try {
        const imageBuffer = await downloadImage(m);

        if (!imageBuffer || imageBuffer.length < 500) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Photo download failed.");
        }
        if (imageBuffer.length > 20 * 1024 * 1024) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Photo 20MB ට වඩා ලොකුයි.");
        }

        await react(conn, from, mek.key, "⏳");
        await reply(`⏳ *Photo ${scale}x HD* කරනවා...`);

        const outputBuffer = await enhanceImage(imageBuffer, scale);

        await conn.sendMessage(from, {
            image: outputBuffer,
            mimetype: "image/jpeg",
            caption:
                `✅ *HD Enhance Complete!*\n` +
                `🔍 Mode: *${scale}x ${scale >= 4 ? "UHD" : "HD"}*\n` +
                `_SHAVIYA-XMD V2_`
        }, { quoted: mek });

        await react(conn, from, mek.key, "✅");

    } catch (err) {
        console.error("HD error:", err);
        await react(conn, from, mek.key, "❌");
        reply("❌ *Error:* " + err.message);
    }
}

cmd({ pattern: "remini", react: "🪄", category: "tools", fromMe: false, desc: "Photo HD/UHD enhance" }, hdHandler);
cmd({ pattern: "hd",     react: "🪄", category: "tools", fromMe: false, desc: "Photo HD enhance"     }, hdHandler);
