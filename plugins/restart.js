// ===============================================================
//   plugins/restart.js — SHAVIYA-XMD V2
//   Advanced restart — sends GIF from video URL on restart
//   Owner only
// ===============================================================

const { cmd } = require("../command");
const fs      = require("fs");
const path    = require("path");
const os      = require("os");
const https   = require("https");
const http    = require("http");
const { execSync } = require("child_process");

if (!global._botStartTime) global._botStartTime = Date.now();

// ── Video URL — change this to your video link ──
const RESTART_VIDEO_URL = "https://www.image2url.com/r2/default/videos/1776675710950-0727260f-ccb4-490d-8124-7b4badb509c6.mp4";

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d)   parts.push(`${d}d`);
  if (h)   parts.push(`${h}h`);
  if (m)   parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

// Download file from URL → local path
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.once("finish", () => { file.close(); resolve(); });
      file.once("error",  (e) => { fs.unlink(dest, () => {}); reject(e); });
    }).on("error", (e) => { fs.unlink(dest, () => {}); reject(e); });
  });
}

// Convert video → GIF using ffmpeg
function videoToGif(inputPath, outputPath) {
  // Scale to 480px wide, 15fps, 8 seconds max — good quality GIF
  execSync(
    `ffmpeg -y -i "${inputPath}" -t 8 -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${outputPath}"`,
    { stdio: "pipe", timeout: 60000 }
  );
}

cmd({
  pattern:  "restart",
  alias:    ["reboot", "rst"],
  category: "owner",
  desc:     "Restart the bot with GIF (owner only)",
  react:    "🔄",
}, async function(conn, mek, m, { from, isOwner, senderNumber, sessionId }) {

  if (!isOwner) {
    return conn.sendMessage(from, {
      text:
        "╔══════════════════════╗\n" +
        "║   ⛔  ACCESS DENIED  ║\n" +
        "╚══════════════════════╝\n\n" +
        "This command is restricted to the *bot owner* only.",
    }, { quoted: mek });
  }

  const uptime  = formatUptime(Date.now() - global._botStartTime);
  const tmpDir  = os.tmpdir();
  const vidPath = path.join(tmpDir, `rst_video_${Date.now()}.mp4`);
  const gifPath = path.join(tmpDir, `rst_gif_${Date.now()}.gif`);

  const caption =
    "╔════════════════════════════╗\n" +
    "║  🔄  *SHAVIYA-XMD V2 RESTART* ║\n" +
    "╚════════════════════════════╝\n\n" +
    `📌 *Session :* ${sessionId}\n` +
    `⏱️ *Uptime  :* ${uptime}\n` +
    `👤 *By      :* @${senderNumber}\n\n` +
    "⚡ Bot is restarting...\n" +
    "✅ Back online in a few seconds!\n\n" +
    "_All settings will be preserved_ ✅";

  try {
    // Download video
    await downloadFile(RESTART_VIDEO_URL, vidPath);

    // Convert to GIF
    videoToGif(vidPath, gifPath);

    // Send GIF with caption
    const gifBuffer = fs.readFileSync(gifPath);
    await conn.sendMessage(from, {
      video:    gifBuffer,
      gifPlayback: true,       // sends as GIF (auto-play, no sound)
      caption:  caption,
      mentions: [`${senderNumber}@s.whatsapp.net`],
    }, { quoted: mek });

  } catch (err) {
    // Fallback — send text only if GIF fails
    console.error("[RESTART GIF ERROR]", err.message);
    await conn.sendMessage(from, {
      text:     caption,
      mentions: [`${senderNumber}@s.whatsapp.net`],
    }, { quoted: mek });
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(vidPath); } catch {}
    try { fs.unlinkSync(gifPath); } catch {}
  }

  if (typeof global.setRestartFlag === "function") global.setRestartFlag();
  setTimeout(() => process.exit(0), 3000);
});
