// plugins/smooth.js — SHAVIYA-XMD V2 | FULLY FIXED
// ✅ Fix 1: isVideoQuoted — document/gif/viewOnce video ත් detect කරනවා
// ✅ Fix 2: download fallback — m.download() ත් try කරනවා
// ✅ Fix 3: sendMessage — gifPlayback:false + ptv:false (phone play fix)
// ✅ Fix 4: size limit 60MB → 80MB
// ✅ Fix 5: ffmpeg args — scale filter add (odd pixel crash fix)

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

// ✅ Fix 1: video detect — viewOnce + document + gif ත් cover කරනවා
function isVideoQuoted(m) {
    const q = m.quoted?.message || {};
    const d = m.message || {};

    return Boolean(
        q.videoMessage ||
        d.videoMessage ||
        q.gifMessage ||
        d.gifMessage ||
        m.quoted?.mtype?.includes?.("videoMessage") ||
        m.quoted?.mtype?.includes?.("gifMessage") ||
        // viewOnce video
        q.viewOnceMessage?.message?.videoMessage ||
        q.viewOnceMessageV2?.message?.videoMessage ||
        // document that is video
        (q.documentMessage?.mimetype || "").includes("video") ||
        (d.documentMessage?.mimetype || "").includes("video")
    );
}

// ✅ Fix 2: download fallback
async function downloadVideo(m) {
    // quoted video
    if (m.quoted && typeof m.quoted.download === "function") {
        const buf = await m.quoted.download();
        if (buf && buf.length > 1000) return buf;
    }
    // direct video on message itself
    if (typeof m.download === "function") {
        const buf = await m.download();
        if (buf && buf.length > 1000) return buf;
    }
    throw new Error("Video download කරන්න බැරි වුණා. Video එකකට reply කරලා try කරන්න.");
}

// ✅ Fix 5: scale filter — odd pixel crash fix + faststart
function convertTo60Fps(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tmpIn  = path.join(os.tmpdir(), `shavi_in_${Date.now()}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `shavi_out_${Date.now()}.mp4`);

        try { fs.writeFileSync(tmpIn, inputBuffer); }
        catch (e) { return reject(new Error("Temp write failed: " + e.message)); }

        const args = [
            "-hide_banner", "-loglevel", "error",
            "-i", tmpIn,
            // ✅ Fix 5: scale=-2 → even dimensions (odd pixel ffmpeg crash fix)
            // minterpolate 60fps smooth
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
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
            reject(new Error("Timeout — කෙටි video එකක් try කරන්න (10min limit)."));
        }, 10 * 60 * 1000);

        ff.stderr.on("data", c => errChunks.push(c));
        ff.on("error", err => {
            clearTimeout(timer); cleanup();
            reject(err.code === "ENOENT" ? new Error("FFmpeg install නෑ.") : err);
        });
        ff.on("close", code => {
            clearTimeout(timer);
            if (code === 0) {
                try {
                    if (!fs.existsSync(tmpOut)) { cleanup(); return reject(new Error("Output file නෑ.")); }
                    const buf = fs.readFileSync(tmpOut);
                    cleanup();
                    if (!buf || buf.length < 1000) return reject(new Error("Output empty — FFmpeg process failed."));
                    resolve(buf);
                } catch (e) { cleanup(); reject(new Error("Read failed: " + e.message)); }
            } else {
                const errText = Buffer.concat(errChunks).toString().slice(0, 300);
                cleanup();
                reject(new Error(errText || `FFmpeg exited code ${code}`));
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
    desc: "Video එකක් 60fps smooth video බවට convert කරන්න"
}, async (conn, mek, m, { from, q, reply }) => {

    if (!isVideoQuoted(m)) {
        await react(conn, from, mek.key, "❌");
        return reply("🎬 *Video එකකට reply කරලා command දෙන්න.*\n\nඋදා: *.smooth*");
    }

    await react(conn, from, mek.key, "⏳");

    try {
        const videoBuffer = await downloadVideo(m);

        // ✅ Fix 4: 80MB limit
        if (videoBuffer.length > 80 * 1024 * 1024) {
            await react(conn, from, mek.key, "❌");
            return reply("❌ Video ලොකු වැඩියි. *80MB* ට අඩු video try කරන්න.");
        }

        await reply("⏳ *60fps smooth කරනවා...* ටිකක් ඉන්න 🎬");

        const outputBuffer = await convertTo60Fps(videoBuffer);

        // ✅ Fix 3: gifPlayback false — phone ලා play වෙනවා
        await conn.sendMessage(from, {
            video: outputBuffer,
            mimetype: "video/mp4",
            gifPlayback: false,
            caption: "✅ *60fps Smooth Video* ready! 🎬\n_Powered by SHAVIYA-XMD V2_"
        }, { quoted: mek });

        await react(conn, from, mek.key, "✅");

    } catch (err) {
        console.error("Smooth error:", err);
        await react(conn, from, mek.key, "❌");
        reply("❌ *Smooth කරන්න බැරි වුණා.*\n\nහේතුව: " + err.message);
    }
});
