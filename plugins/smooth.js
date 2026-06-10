// plugins/smoth.js — SHAVIYA-XMD V2 | React System + Phone playback fix
const { cmd } = require('../command');
const { spawn } = require("child_process");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

let ffmpegBin = "ffmpeg";
try {
    const s = require("ffmpeg-static");
    if (s) ffmpegBin = s;
} catch { ffmpegBin = "ffmpeg"; }

// ── React helper ─────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

function isVideoQuoted(m) {
    const q = m.quoted?.message || {};
    const d = m.message || {};
    return Boolean(
        q.videoMessage || d.videoMessage ||
        m.quoted?.mtype?.includes?.("videoMessage")
    );
}

async function downloadVideo(m) {
    if (m.quoted && typeof m.quoted.download === "function") {
        return await m.quoted.download();
    }
    throw new Error("Video එකකට reply කරලා try කරන්න.");
}

// temp file + faststart — phone/WhatsApp eke play වෙනවා
function convertTo60Fps(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tmpIn  = path.join(os.tmpdir(), `shavi_in_${Date.now()}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `shavi_out_${Date.now()}.mp4`);

        try { fs.writeFileSync(tmpIn, inputBuffer); }
        catch (e) { return reject(new Error("Temp write failed: " + e.message)); }

        const args = [
            "-hide_banner", "-loglevel", "error",
            "-i", tmpIn,
            "-vf", "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-f", "mp4", tmpOut
        ];

        const ff = spawn(ffmpegBin, args, { stdio: ["ignore", "pipe", "pipe"] });
        const errChunks = [];

        const timer = setTimeout(() => {
            ff.kill("SIGKILL"); cleanup();
            reject(new Error("Timeout — කෙටි video එකක් try කරන්න."));
        }, 10 * 60 * 1000);

        ff.stderr.on("data", c => errChunks.push(c));
        ff.on("error", err => {
            clearTimeout(timer); cleanup();
            reject(err.code === "ENOENT" ? new Error("FFmpeg නෑ.") : err);
        });
        ff.on("close", code => {
            clearTimeout(timer);
            if (code === 0) {
                try {
                    if (!fs.existsSync(tmpOut)) { cleanup(); return reject(new Error("Output file නෑ.")); }
                    const buf = fs.readFileSync(tmpOut);
                    cleanup();
                    if (!buf || buf.length < 1000) return reject(new Error("Output empty."));
                    resolve(buf);
                } catch(e) { cleanup(); reject(new Error("Read failed: " + e.message)); }
            } else {
                cleanup();
                reject(new Error(Buffer.concat(errChunks).toString() || `FFmpeg code ${code}`));
            }
        });

        function cleanup() {
            try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch {}
            try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch {}
        }
    });
}

// ══════════════════════════════════════════════════════════════
//  .smooth command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern: "smooth",
    alias: ["smoth", "60fps", "fps60", "smoothvideo"],
    react: "🎬",
    category: "tools",
    fromMe: false,
    desc: "Video එකක් 60fps smooth video එකක් බවට convert කරන්න"
}, async (conn, mek, m, { from, q, reply }) => {
    if (!isVideoQuoted(m)) {
        await react(conn, from, mek.key, "❌");
        return reply("🎬 Video එකකට reply කරලා command එක දෙන්න.\n\nඋදා: .smooth");
    }

    await react(conn, from, mek.key, "⏳");

    try {
        const videoBuffer = await downloadVideo(m);

        if (!videoBuffer || videoBuffer.length < 1000) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Video download කරන්න බැරි වුණා.");
        }
        if (videoBuffer.length > 60 * 1024 * 1024) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Video ලොකු වැඩියි. 60MB ට අඩු try කරන්න.");
        }

        await reply("⏳ 60fps smooth කරනවා... ටිකක් ඉන්න.");

        const outputBuffer = await convertTo60Fps(videoBuffer);

        await conn.sendMessage(from, {
            video: outputBuffer,
            mimetype: "video/mp4",
            caption: "✅ 60fps Smooth video ready! 🎬"
        }, { quoted: mek });

        await react(conn, from, mek.key, "✅");
    } catch (err) {
        console.error("Smooth error:", err);
        await react(conn, from, mek.key, "❌");
        reply("❌ Smooth කරන්න බැරි වුණා.\n\nහේතුව: " + err.message);
    }
});
