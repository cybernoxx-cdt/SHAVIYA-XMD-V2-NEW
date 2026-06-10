// plugins/smooth.js — SHAVIYA-XMD V2 | FINAL FIX
// ✅ Framework: m.quoted.type = getContentType(m.quoted) — EXACT structure

const { cmd } = require('../command');
const { spawn } = require("child_process");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

let ffmpegBin = "ffmpeg";
try { const s = require("ffmpeg-static"); if (s) ffmpegBin = s; } catch {}

async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

// ✅ FINAL FIX: m.quoted.type ← getContentType(m.quoted) by framework
function isVideoQuoted(m) {
    if (!m.quoted) return false;
    const type = (m.quoted.type || "").toLowerCase();
    // videoMessage, gifMessage, viewOnceMessage (inside has video)
    if (type === "videomessage" || type === "gifmessage") return true;
    // viewOnce — check inner msg type
    if (type.startsWith("viewonce")) {
        const innerType = (m.quoted.msg?.type || "").toLowerCase();
        return innerType === "videomessage" || innerType === "gifmessage";
    }
    return false;
}

// ✅ m.quoted.download() — exact method from framework (lib/msg.js line 105)
async function downloadVideo(m) {
    if (m.quoted?.download && typeof m.quoted.download === "function") {
        const buf = await m.quoted.download();
        if (buf?.length > 1000) return buf;
    }
    throw new Error("Video download failed.");
}

function convertTo60Fps(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tmpIn  = path.join(os.tmpdir(), `shavi_in_${Date.now()}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `shavi_out_${Date.now()}.mp4`);

        try { fs.writeFileSync(tmpIn, inputBuffer); } catch (e) { return reject(e); }

        const args = [
            "-hide_banner", "-loglevel", "error",
            "-i", tmpIn,
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-f", "mp4", tmpOut
        ];

        const ff = spawn(ffmpegBin, args, { stdio: ["ignore", "pipe", "pipe"] });
        const errChunks = [];
        const timer = setTimeout(() => { ff.kill("SIGKILL"); cleanup(); reject(new Error("Timeout.")); }, 10 * 60 * 1000);

        ff.stderr.on("data", c => errChunks.push(c));
        ff.on("error", err => { clearTimeout(timer); cleanup(); reject(err); });
        ff.on("close", code => {
            clearTimeout(timer);
            if (code === 0) {
                try {
                    const buf = fs.readFileSync(tmpOut); cleanup();
                    if (!buf || buf.length < 1000) return reject(new Error("Output empty."));
                    resolve(buf);
                } catch (e) { cleanup(); reject(e); }
            } else {
                cleanup();
                reject(new Error(Buffer.concat(errChunks).toString().slice(0, 300) || `FFmpeg code ${code}`));
            }
        });

        function cleanup() {
            try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch {}
            try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch {}
        }
    });
}

cmd({
    pattern: "smooth",
    alias: ["smoth", "60fps", "fps60", "smoothvideo"],
    react: "🎬",
    category: "tools",
    fromMe: false,
    desc: "Video 60fps smooth convert"
}, async (conn, mek, m, { from, reply }) => {

    if (!m.quoted) {
        await react(conn, from, mek.key, "❌");
        return reply("🎬 *Video එකකට reply කරලා .smooth දෙන්න.*");
    }

    if (!isVideoQuoted(m)) {
        await react(conn, from, mek.key, "❌");
        return reply(
            `🎬 *Video reply detect නෑ.*\n` +
            `Type: \`${m.quoted.type || "unknown"}\`\n\n` +
            `MP4 video reply කරලා try කරන්න.`
        );
    }

    await react(conn, from, mek.key, "⏳");

    try {
        const videoBuffer = await downloadVideo(m);

        if (videoBuffer.length > 80 * 1024 * 1024) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Video 80MB ට වඩා ලොකුයි.");
        }

        await reply("⏳ *60fps smooth කරනවා...* 🎬");

        const outputBuffer = await convertTo60Fps(videoBuffer);

        await conn.sendMessage(from, {
            video: outputBuffer,
            mimetype: "video/mp4",
            gifPlayback: false,
            caption: "✅ *60fps Smooth Video* 🎬\n_SHAVIYA-XMD V2_"
        }, { quoted: mek });

        await react(conn, from, mek.key, "✅");

    } catch (err) {
        console.error("Smooth error:", err);
        await react(conn, from, mek.key, "❌");
        reply("❌ *Error:* " + err.message);
    }
});
