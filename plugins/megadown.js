const { cmd } = require("../command");
const { File } = require("megajs");
const fs = require("fs");
const os = require("os");
const path = require("path");

/* ---------- HELPERS ---------- */
function formatSize(bytes) {
  if (!bytes) return "0 MB";
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + " GB";
  return (bytes / 1024 ** 2).toFixed(2) + " MB";
}

function progressBar(percent) {
  const filled = Math.floor(percent / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

cmd(
  {
    pattern: "mega",
    ownerOnly: true,
    react: "📦",
    desc: "MEGA download with live progress (up to 2GB)",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    let tmpPath;

    try {
      // Validate link
      if (!q || !q.startsWith("https://mega.nz")) {
        return reply(
          "❌ Valid MEGA link දෙන්න.\nExample: `.mega https://mega.nz/file/...#...`"
        );
      }
      if (!q.includes("#")) {
        return reply("❌ Invalid MEGA link — # key නෑ.");
      }

      /* ---------- LOAD FILE ATTRIBUTES ---------- */
      let file;
      try {
        file = File.fromURL(q);
        await file.loadAttributes();
      } catch (e) {
        return reply("❌ MEGA link load කරන්න බැරි වුනා.\nLink valid ද check කරන්න.");
      }

      const total = file.size;
      const name  = file.name || `mega_${Date.now()}`;
      const totalText = formatSize(total);

      // WhatsApp 2GB limit
      const WA_LIMIT = 2 * 1024 * 1024 * 1024;
      if (total > WA_LIMIT) {
        return reply(
          `❌ File too large for WhatsApp!\n📦 ${name}\n📁 ${totalText}\n⚠️ Max: 2 GB`
        );
      }

      tmpPath = path.join(os.tmpdir(), `${Date.now()}_${name}`);

      /* ---------- INITIAL PROGRESS MESSAGE ---------- */
      const sent = await robin.sendMessage(from, {
        text:
          `📦 *${name}*\n` +
          `📁 Size: ${totalText}\n` +
          `⏬ Downloading...\n` +
          `[░░░░░░░░░░] 0%`,
      });
      const editKey = sent?.key;

      /* ---------- DOWNLOAD WITH STREAM ---------- */
      const writeStream = fs.createWriteStream(tmpPath, {
        highWaterMark: 1024 * 1024 * 8, // 8MB
      });

      const download = file.download({ highWaterMark: 1024 * 1024 * 8 });

      let downloaded  = 0;
      let lastPercent = -1;
      let editing     = false;
      let editTimer   = null;

      download.on("data", (chunk) => {
        downloaded += chunk.length;
        const percent = Math.floor((downloaded / total) * 100);

        // Throttle: only update every 5% change AND no pending edit
        if (percent - lastPercent < 5 || editing) return;
        lastPercent = percent;
        editing = true;

        clearTimeout(editTimer);
        editTimer = setTimeout(() => {
          if (!editKey) { editing = false; return; }
          robin.sendMessage(from, {
            text:
              `📦 *${name}*\n` +
              `📁 Size: ${totalText}\n` +
              `⏬ Downloading...\n` +
              `[${progressBar(percent)}] ${percent}%\n` +
              `${formatSize(downloaded)} / ${totalText}`,
            edit: editKey,
          }).finally(() => { editing = false; });
        }, 300);
      });

      // Wait for download to complete
      await new Promise((resolve, reject) => {
        download.pipe(writeStream);
        writeStream.once("finish", resolve);
        download.once("error", reject);
        writeStream.once("error", reject);
      });

      // Final 100% message
      if (editKey) {
        await robin.sendMessage(from, {
          text:
            `📦 *${name}*\n` +
            `📁 Size: ${totalText}\n` +
            `✅ Download Complete!\n` +
            `[██████████] 100%\n` +
            `📤 Uploading to WhatsApp...`,
          edit: editKey,
        }).catch(() => {});
      }

      /* ---------- SEND AS DOCUMENT (BAILEYS FIXED) ---------- */
      const fileBuffer = fs.readFileSync(tmpPath);

      await robin.sendMessage(
        from,
        {
          document: fileBuffer,
          fileName: name,
          mimetype: "application/octet-stream",
        },
        { quoted: mek }
      );

      // Cleanup
      fs.unlink(tmpPath, () => {});

    } catch (err) {
      console.error("[MEGA ERROR]", err);
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlink(tmpPath, () => {});
      reply(`❌ Download failed.\n\`\`\`${err.message || err}\`\`\``);
    }
  }
);
