const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");

const API_KEY = "darkshan-75704c1b";
const TEMP_DIR = path.resolve(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ───────── Reply Waiter (button + number reply දෙකම | once-only lock) ─────────
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        let resolved = false; // 🔒 double-trigger lock

        const done = (payload) => {
            if (resolved) return;   // දෙවෙනි call එනවිට block
            resolved = true;
            conn.ev.off("messages.upsert", handler);
            resolve(payload);
        };

        const handler = (update) => {
            if (resolved) return;   // async lag නිසා late event block
            const msg = update.messages?.[0];
            if (!msg?.message) return;
            if (msg.key.remoteJid !== from) return;

            const msgSender = msg.key.participant || msg.key.remoteJid;
            const isCorrectUser =
                msgSender.includes(sender.split('@')[0]) ||
                msgSender.includes("@lid");
            if (!isCorrectUser) return;

            const msgType = Object.keys(msg.message)[0];

            // ── Method 1: Number reply (quoted) ──
            const ctx =
                msg.message?.extendedTextMessage?.contextInfo ||
                msg.message?.interactiveResponseMessage?.contextInfo;

            if (ctx?.stanzaId === targetId) {
                let text =
                    msg.message.conversation ||
                    msg.message?.extendedTextMessage?.text || "";

                if (!text && msgType === "interactiveResponseMessage") {
                    try {
                        const nativeReply = msg.message.interactiveResponseMessage?.nativeFlowResponseMessage;
                        if (nativeReply) {
                            const parsed = JSON.parse(nativeReply.paramsJson || "{}");
                            text = parsed.id || nativeReply.name || "";
                        }
                    } catch {}
                }

                if (text) return done({ msg, text: text.trim() });
            }

            // ── Method 2: Button click ──
            if (msgType === "interactiveResponseMessage") {
                try {
                    const nativeReply = msg.message.interactiveResponseMessage?.nativeFlowResponseMessage;
                    if (nativeReply) {
                        const parsed = JSON.parse(nativeReply.paramsJson || "{}");
                        const btnId = parsed.id || "";
                        const btnCtx = msg.message.interactiveResponseMessage?.contextInfo;
                        if (btnCtx?.stanzaId === targetId || btnId.includes(targetId)) {
                            return done({ msg, text: btnId.trim() });
                        }
                    }
                } catch {}
            }
        };

        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                conn.ev.off("messages.upsert", handler);
            }
        }, 600000);
    });
}

// ───────── MP4 → MP3 Converter ─────────
function convertToAudio(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .toFormat("mp3")
            .audioCodec("libmp3lame")
            .audioBitrate(192)
            .on("end", resolve)
            .on("error", reject)
            .save(outputFile);
    });
}

cmd(
  {
    pattern: "fb",
    alias: ["fbdl", "facebook"],
    ownerOnly: true,
    react: "🔵",
    desc: "FB Video Downloader",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, sender, sessionId }) => {
    try {
      let query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply("❌ Please provide a Facebook link.");

      await bot.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      console.log(`\x1b[36m[FB-LOG]\x1b[0m Fetching data from API...`);

      const res = await axios.get(
        `https://sayuradark-api-two.vercel.app/api/download/facebook?apikey=${API_KEY}&url=${encodeURIComponent(query)}`
      );
      const data = res.data?.result;

      if (!res.data.status || !data) {
        await bot.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ Video not found or link is private.");
      }

      const title = data.title && data.title !== "No video title"
        ? data.title : "Facebook Video";

      // ── Quality buttons build ──
      const qualityButtons = [];
      let bodyText = `🔵 *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐅𝐁 𝐃𝐋*\n\n🎬 *Title:* ${title}\n\n*╰────────────────⊷*\n`;

      if (data.video_hd) {
        qualityButtons.push({ id: "1", text: "1️⃣ HD Video" });
        bodyText += `1️⃣ HD Video\n`;
      }
      if (data.video_sd) {
        qualityButtons.push({ id: "2", text: "2️⃣ SD Video" });
        bodyText += `2️⃣ SD Video\n`;
      }

      // Audio + Doc options (video_hd හෝ video_sd ඕනෑ)
      const hasAny = data.video_hd || data.video_sd;
      if (hasAny) {
        qualityButtons.push({ id: "3", text: "3️⃣ Audio (MP3)" });
        bodyText += `3️⃣ Audio (MP3)\n`;
        qualityButtons.push({ id: "4", text: "4️⃣ Video as Document" });
        bodyText += `4️⃣ Video as Document\n`;
        qualityButtons.push({ id: "5", text: "5️⃣ Audio as Document" });
        bodyText += `5️⃣ Audio as Document\n`;
      }

      bodyText += `*╰────────────────⊷*`;

      const sentQual = await global.sendInteractiveButtons(bot, from, {
        header: "🔵 FB Downloader",
        body: bodyText,
        footer: "𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃",
        buttons: qualityButtons,
        _sessionId: sessionId
      }, mek);

      // Reply / button click ලැබෙනකම් බලා සිටීම
      const selection = await waitForReply(bot, from, sender, sentQual.key.id);
      if (!selection) return;

      const choice = selection.text;
      const dlUrl = (choice === "1" && data.video_hd) ? data.video_hd
                  : (data.video_hd || data.video_sd); // 3,4,5 → best available
      const qualLabel = (choice === "1" && data.video_hd) ? "HD" : "SD";

      await bot.sendMessage(from, { react: { text: "📥", key: selection.msg.key } });

      // ── Branch per choice ──
      if (choice === "1" || choice === "2") {
        // ── Video send ──
        const finalUrl = choice === "1"
          ? (data.video_hd || data.video_sd)
          : (data.video_sd || data.video_hd);
        const label = choice === "1" ? "HD" : "SD";
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Downloading ${label} video...`);
        await handleVideoSend(bot, from, finalUrl, title, label, selection.msg);

      } else if (choice === "3") {
        // ── Audio send (audio message) ──
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Extracting audio...`);
        await handleAudioSend(bot, from, dlUrl, title, selection.msg, false);

      } else if (choice === "4") {
        // ── Video as Document ──
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Sending video as document...`);
        await handleVideoDoc(bot, from, dlUrl, title, qualLabel, selection.msg);

      } else if (choice === "5") {
        // ── Audio as Document ──
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Sending audio as document...`);
        await handleAudioSend(bot, from, dlUrl, title, selection.msg, true);

      } else {
        reply("❌ Invalid choice.");
      }

    } catch (err) {
      console.error(`\x1b[31m[FB-ERROR]\x1b[0m`, err.message);
      reply(`❌ Error: ${err.message}`);
    }

    // ══════════════════════════════════════════
    // 1️⃣ 2️⃣  Video Send
    // ══════════════════════════════════════════
    async function handleVideoSend(conn, from, dlUrl, title, quality, quotedMek) {
      const outputFile = path.join(TEMP_DIR, `fb_${Date.now()}.mp4`);
      try {
        const response = await axios({ method: "get", url: dlUrl, responseType: "stream" });
        const writer = fs.createWriteStream(outputFile);
        response.data.pipe(writer);

        writer.on("finish", async () => {
          const sizeMB = (fs.statSync(outputFile).size / 1048576).toFixed(2);

          await conn.sendMessage(from, {
            video: fs.readFileSync(outputFile),
            mimetype: "video/mp4",
            caption: `*╰────────────────⊷*\n✅ *FB Download Complete*\n🎬 *${title}*\n📦 Quality: ${quality}\n💾 Size: ${sizeMB} MB\n*╰────────────────⊷*\n\n𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃`
          }, { quoted: quotedMek });

          await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });
          console.log(`\x1b[32m[FB-LOG]\x1b[0m Video sent. Size: ${sizeMB}MB`);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        });

        writer.on("error", (e) => {
          console.error(`\x1b[31m[FB-DL-ERROR]\x1b[0m`, e.message);
          reply("❌ Download failed.");
        });
      } catch (e) {
        console.error(`\x1b[31m[FB-DL-ERROR]\x1b[0m`, e.message);
        reply("❌ Download failed.");
      }
    }

    // ══════════════════════════════════════════
    // 4️⃣  Video as Document
    // ══════════════════════════════════════════
    async function handleVideoDoc(conn, from, dlUrl, title, quality, quotedMek) {
      const outputFile = path.join(TEMP_DIR, `fb_${Date.now()}.mp4`);
      try {
        const response = await axios({ method: "get", url: dlUrl, responseType: "stream" });
        const writer = fs.createWriteStream(outputFile);
        response.data.pipe(writer);

        writer.on("finish", async () => {
          const sizeMB = (fs.statSync(outputFile).size / 1048576).toFixed(2);
          const safeTitle = title.replace(/[^\w\s]/gi, "").trim() || "fb_video";

          await conn.sendMessage(from, {
            document: fs.readFileSync(outputFile),
            mimetype: "video/mp4",
            fileName: `${safeTitle}.mp4`,
            caption: `*╰────────────────⊷*\n📁 *FB Video (Document)*\n🎬 *${title}*\n📦 Quality: ${quality}\n💾 Size: ${sizeMB} MB\n*╰────────────────⊷*\n\n𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃`
          }, { quoted: quotedMek });

          await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });
          console.log(`\x1b[32m[FB-LOG]\x1b[0m Video doc sent. Size: ${sizeMB}MB`);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        });

        writer.on("error", (e) => {
          console.error(`\x1b[31m[FB-DL-ERROR]\x1b[0m`, e.message);
          reply("❌ Download failed.");
        });
      } catch (e) {
        console.error(`\x1b[31m[FB-DL-ERROR]\x1b[0m`, e.message);
        reply("❌ Download failed.");
      }
    }

    // ══════════════════════════════════════════
    // 3️⃣ 5️⃣  Audio Send (asDoc = true → document, false → audio message)
    // ══════════════════════════════════════════
    async function handleAudioSend(conn, from, dlUrl, title, quotedMek, asDoc) {
      const videoFile = path.join(TEMP_DIR, `fb_vid_${Date.now()}.mp4`);
      const audioFile = path.join(TEMP_DIR, `fb_aud_${Date.now()}.mp3`);
      try {
        // Step 1: download video
        const response = await axios({ method: "get", url: dlUrl, responseType: "stream" });
        const writer = fs.createWriteStream(videoFile);
        response.data.pipe(writer);

        await new Promise((res, rej) => {
          writer.on("finish", res);
          writer.on("error", rej);
        });

        // Step 2: convert to mp3
        await convertToAudio(videoFile, audioFile);

        const sizeMB = (fs.statSync(audioFile).size / 1048576).toFixed(2);
        const safeTitle = title.replace(/[^\w\s]/gi, "").trim() || "fb_audio";

        if (asDoc) {
          // ── 5️⃣ Audio as Document ──
          await conn.sendMessage(from, {
            document: fs.readFileSync(audioFile),
            mimetype: "audio/mpeg",
            fileName: `${safeTitle}.mp3`,
            caption: `*╰────────────────⊷*\n🎵 *FB Audio (Document)*\n🎬 *${title}*\n💾 Size: ${sizeMB} MB\n*╰────────────────⊷*\n\n𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃`
          }, { quoted: quotedMek });
        } else {
          // ── 3️⃣ Audio message ──
          await conn.sendMessage(from, {
            audio: fs.readFileSync(audioFile),
            mimetype: "audio/mpeg",
            ptt: false
          }, { quoted: quotedMek });

          await conn.sendMessage(from, {
            text: `*╰────────────────⊷*\n🎵 *FB Audio*\n🎬 *${title}*\n💾 Size: ${sizeMB} MB\n*╰────────────────⊷*\n\n𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃`
          }, { quoted: quotedMek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: quotedMek.key } });
        console.log(`\x1b[32m[FB-LOG]\x1b[0m Audio sent${asDoc ? " as doc" : ""}. Size: ${sizeMB}MB`);

      } catch (e) {
        console.error(`\x1b[31m[FB-AUDIO-ERROR]\x1b[0m`, e.message);
        reply("❌ Audio extraction failed. Make sure ffmpeg is installed.");
      } finally {
        if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
        if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
      }
    }
  }
);
