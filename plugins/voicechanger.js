const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// ── Resolve ffmpeg binary (ffmpeg-static preferred, then system ffmpeg) ──
// Without this, fluent-ffmpeg cannot find the ffmpeg binary on most hosts
// (Heroku, containers, etc.) and every conversion fails silently.
let ffmpegPath = null;
try {
  const staticBin = require("ffmpeg-static");
  if (staticBin && fs.existsSync(staticBin)) {
    try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
    ffmpegPath = staticBin;
  }
} catch (_) {}

if (!ffmpegPath) {
  try {
    const { execSync } = require("child_process");
    const s = execSync("which ffmpeg 2>/dev/null", { encoding: "utf8" }).trim();
    if (s) ffmpegPath = s;
  } catch (_) {}
}

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// ═══════════════════════════════════════════════════════════════
//  Voice Changer — .vchange <effect>  (reply to a voice note)
//  Pure ffmpeg — no external API, works fully offline/self-hosted.
// ═══════════════════════════════════════════════════════════════

const EFFECTS = {
  alvin: { filter: "asetrate=44100*1.6,aresample=44100,atempo=0.625", emoji: "🐿️", label: "Alvin (Chipmunk)" },
  hulk:  { filter: "asetrate=44100*0.65,aresample=44100,atempo=1.538,bass=g=6", emoji: "💚", label: "Hulk (Monster)" },
  robot: { filter: "vibrato=f=7:d=0.9,aecho=0.7:0.6:30:0.4,atempo=1.0", emoji: "🤖", label: "Robot" },
  baby:  { filter: "asetrate=44100*1.9,aresample=44100,atempo=0.5263", emoji: "👶", label: "Baby" },
  deep:  { filter: "asetrate=44100*0.8,aresample=44100,atempo=1.25,bass=g=3", emoji: "🕳️", label: "Deep Voice" },
};

const effectList = Object.entries(EFFECTS)
  .map(([key, v]) => `• *${key}* ${v.emoji} — ${v.label}`)
  .join("\n");

cmd({
  pattern: "vchange",
  alias: ["voice", "voicechanger", "vc"],
  desc: "Change a voice note into alvin, hulk, robot, baby, or deep voice",
  category: "fun",
  react: "🎙️",
  use: ".vchange <effect> (reply to a voice note or audio)",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    const effectKey = (q || "").trim().toLowerCase();

    if (!effectKey) {
      return reply(
        `🎙️ *Voice Changer*\n\nUse: *.vchange <effect>* (reply to a voice note)\n\n${effectList}\n\n_Example: reply to a voice note with_ \`.vchange hulk\``
      );
    }

    const effect = EFFECTS[effectKey];
    if (!effect) {
      return reply(
        `⚠️ *Unknown effect:* "${effectKey}"\n\nAvailable effects:\n${effectList}`
      );
    }

    if (!m.quoted) {
      return reply(`⚠️ *Reply to a voice note or audio file with* \`.vchange ${effectKey}\``);
    }

    // Resolve mtype robustly — m.quoted.mtype can be undefined depending on
    // how the message was wrapped (e.g. forwarded, status, view-once).
    let quotedMsg = m.quoted.message || m.quoted;
    let type = m.quoted.mtype || Object.keys(quotedMsg)[0];

    if (type === "viewOnceMessageV2" || type === "viewOnceMessage") {
      quotedMsg = quotedMsg[type].message;
      type = Object.keys(quotedMsg)[0];
    }

    if (type !== "audioMessage" && type !== "videoMessage" && type !== "pttMessage") {
      return reply(`⚠️ *Please reply to a voice note or audio/video file!* (detected type: ${type || "unknown"})`);
    }

    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });
    const mediaBuffer = await m.quoted.download();

    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, `${Date.now()}_in.mp3`);
    const outputPath = path.join(tempDir, `${Date.now()}_out.opus`);

    fs.writeFileSync(inputPath, mediaBuffer);

    await conn.sendMessage(from, { react: { text: "🎛️", key: mek.key } });

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(effect.filter)
        .audioCodec("libopus")
        .format("opus")
        .audioBitrate("64k")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    const voiceBuffer = fs.readFileSync(outputPath);

    await conn.sendMessage(from, {
      audio: voiceBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: effect.emoji, key: mek.key } });

    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  } catch (err) {
    console.error("[vchange]", err);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply(`*❌ Error processing voice:*\n${err.message || err}`);
  }
});
