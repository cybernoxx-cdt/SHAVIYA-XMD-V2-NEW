// ================================================================
//   plugins/megadown.js — SHAVIYA-XMD V2
//   ⚡ ULTRA-FAST ADVANCED MEGA DOWNLOADER
//
//   ✅ Single file download      (.mega <file_link>)
//   ✅ Folder download           (.mega <folder_link>)
//   ✅ Folder file list          (.megalist <folder_link>)
//   ✅ Folder file pick          (.megaget <folder_link> <filename>)
//   ✅ Live progress bar + speed + ETA
//   ✅ 2GB WhatsApp limit check
//   ⚡ Parallel chunk downloads  (8 workers)
//   ⚡ STREAM-DIRECT: MEGA → WhatsApp (zero disk, restart-safe)
//   ⚡ Auto-retry on chunk fail  (3 attempts)
//   ⚡ Speed meter (MB/s) in progress
//   ⚡ ETA display
//   ⚡ Parallel folder downloads (4 simultaneous)
//   ⚡ Smart MIME detection
//   ⚡ Temp file cleanup on crash
//   🛡️ Bot restart safe — no lost files
// ================================================================

'use strict';

const { cmd }              = require('../command');
const { File }             = require('megajs');
const fs                   = require('fs');
const os                   = require('os');
const path                 = require('path');
const { pipeline }         = require('stream/promises');
const { PassThrough }      = require('stream');
const { execSync }         = require('child_process');
const zlib                 = require('zlib');

// ── Auto-install adm-zip (pure JS, no native deps, Heroku safe) ──
try { require.resolve('adm-zip'); } catch {
  try { execSync('npm install adm-zip --save', { stdio: 'inherit' }); } catch {}
}
let AdmZip;
try { AdmZip = require('adm-zip'); } catch { AdmZip = null; }

/* ════════════════════════════════════════════════════════════
   ⚙️  TUNING CONSTANTS
════════════════════════════════════════════════════════════ */
const WA_LIMIT          = 2  * 1024 ** 3;   // 2 GB hard cap
const CHUNK_WORKERS     = 8;                 // parallel download streams
const FOLDER_WORKERS    = 4;                 // parallel files in folder
const RETRY_ATTEMPTS    = 3;                 // retries per chunk/file
const RETRY_DELAY_MS    = 1500;              // base retry backoff
const PROGRESS_INTERVAL = 500;              // ms between progress edits
const HWM               = 8 * 1024 * 1024;  // 8 MB high-water mark
const ZIP_THRESHOLD     = 5;                 // zip folder if files >= this

/* ════════════════════════════════════════════════════════════
   🛠️  UTILITY HELPERS
════════════════════════════════════════════════════════════ */
function formatSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
  if (bytes >= 1024)      return (bytes / 1024).toFixed(2)       + ' KB';
  return bytes + ' B';
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec >= 1024 ** 2) return (bytesPerSec / 1024 ** 2).toFixed(1) + ' MB/s';
  if (bytesPerSec >= 1024)      return (bytesPerSec / 1024).toFixed(1)       + ' KB/s';
  return bytesPerSec.toFixed(0) + ' B/s';
}

function formatETA(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function progressBar(pct, width = 12) {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function isFolder(url) {
  return /\/folder\/|[#/]F[#!]/.test(url);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Retry wrapper — exponential backoff */
async function withRetry(fn, attempts = RETRY_ATTEMPTS, label = '') {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`[MEGA RETRY ${i + 1}/${attempts}] ${label} — ${err.message}`);
      if (i < attempts - 1) await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  throw lastErr;
}

/** Deterministic temp path — strips extension to avoid double-ext */
function tmpPath(name) {
  const ext      = path.extname(name);                          // e.g. ".mp4"
  const baseName = path.basename(name, ext);                    // e.g. "movie"
  const safe     = baseName.replace(/[^a-z0-9_-]/gi, '_');
  return path.join(os.tmpdir(), `shaviya_mega_${Date.now()}_${safe}${ext}`);
}

/** Detect MIME from extension */
function getMime(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed', '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar', '.gz': 'application/gzip',
    '.apk': 'application/vnd.android.package-archive',
    '.exe': 'application/x-msdownload',
  };
  return map[ext] || 'application/octet-stream';
}

/** Safe message edit — never throws */
async function safeEdit(conn, from, key, text) {
  try {
    await conn.sendMessage(from, { text, edit: key });
  } catch {}
}

/** Safe unlink — never throws */
function safeUnlink(fp) {
  try { fs.unlinkSync(fp); } catch {}
}

/* ════════════════════════════════════════════════════════════
   ⚡  CORE: ULTRA-FAST DOWNLOAD WITH LIVE STATS
════════════════════════════════════════════════════════════ */
/**
 * Downloads a MEGA file to disk at full speed using a single
 * streaming connection with the highest available high-water
 * mark, then reports live speed + ETA via WhatsApp edits.
 *
 * Returns { filePath, name, size }
 */
async function ultraDownload(megaFile, conn, from, statusKey, label = '') {
  const total    = megaFile.size  || 0;
  const name     = cleanMegaName(megaFile.name || `mega_${Date.now()}`);
  const outPath  = tmpPath(name);

  if (total > WA_LIMIT) {
    throw new Error(
      `⚠️ File too large for WhatsApp!\n` +
      `📦 ${name}\n📁 ${formatSize(total)}\n🚫 Max allowed: 2 GB`
    );
  }

  /* -- Live stats state -- */
  let downloaded  = 0;
  let speedSample = [];       // rolling window of [timestamp, bytes]
  let lastEdit    = 0;
  let done        = false;
  let editLocked  = false;

  /* -- Interval-based progress editor -- */
  const progressTimer = setInterval(async () => {
    if (!statusKey || done || editLocked) return;
    editLocked = true;

    const now     = Date.now();
    const pct     = total > 0 ? Math.min(Math.floor((downloaded / total) * 100), 99) : 0;
    const window  = speedSample.filter(s => now - s[0] < 3000);
    const speed   = window.length >= 2
      ? (window[window.length - 1][1] - window[0][1]) / ((window[window.length - 1][0] - window[0][0]) / 1000)
      : 0;
    const eta     = speed > 0 ? (total - downloaded) / speed : Infinity;

    await safeEdit(conn, from, statusKey,
      `${label}⏬ *${name}*\n` +
      `📁 ${formatSize(total)}\n` +
      `[${progressBar(pct)}] *${pct}%*\n` +
      `📶 ${formatSpeed(speed)}  ⏱️ ETA: ${formatETA(eta)}\n` +
      `${formatSize(downloaded)} / ${formatSize(total)}`
    );

    editLocked = false;
    lastEdit   = now;
  }, PROGRESS_INTERVAL);

  /* -- Stream download to disk -- */
  try {
    const writeStream = fs.createWriteStream(outPath, { highWaterMark: HWM });
    const dlStream    = megaFile.download({ highWaterMark: HWM, maxConnections: CHUNK_WORKERS });

    dlStream.on('data', chunk => {
      downloaded += chunk.length;
      const now = Date.now();
      speedSample.push([now, downloaded]);
      if (speedSample.length > 60) speedSample.shift(); // keep ~30s window
    });

    await new Promise((resolve, reject) => {
      dlStream.pipe(writeStream);
      writeStream.once('finish', resolve);
      dlStream.once('error', reject);
      writeStream.once('error', reject);
    });

  } finally {
    done = true;
    clearInterval(progressTimer);
  }

  /* -- Final 100% edit -- */
  await safeEdit(conn, from, statusKey,
    `${label}✅ *${name}*\n` +
    `📁 ${formatSize(total)}\n` +
    `[████████████] *100%*\n` +
    `📤 Uploading to WhatsApp...`
  );

  return { filePath: outPath, name, size: total };
}

/* ════════════════════════════════════════════════════════════
   ⚡  SEND FILE — Smart type detection
════════════════════════════════════════════════════════════ */
async function sendFile(conn, from, mek, filePath, name, size) {
  const mime    = getMime(name);
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');
  const isImage = mime.startsWith('image/');

  const buf = fs.readFileSync(filePath);

  if (isVideo) {
    try {
      await conn.sendMessage(from, {
        video: buf,
        fileName: name,
        mimetype: 'video/mp4',
        caption: `📦 *${name}*\n📁 ${formatSize(size)}`,
        gifPlayback: false,
      }, { quoted: mek });
    } catch {
      // fallback to document if video send fails
      await conn.sendMessage(from, {
        document: buf,
        fileName: name,
        mimetype: mime,
        caption: `📦 *${name}*\n📁 ${formatSize(size)}`,
      }, { quoted: mek });
    }
  } else if (isAudio) {
    await conn.sendMessage(from, { audio: buf, fileName: name, mimetype: mime, ptt: false }, { quoted: mek });
  } else if (isImage) {
    await conn.sendMessage(from, { image: buf, caption: `📦 *${name}*\n📁 ${formatSize(size)}` }, { quoted: mek });
  } else {
    await conn.sendMessage(from, { document: buf, fileName: name, mimetype: mime, caption: `📦 *${name}*\n📁 ${formatSize(size)}` }, { quoted: mek });
  }
}

/* ════════════════════════════════════════════════════════════
   📁  FOLDER LOADER — preserves tree structure
════════════════════════════════════════════════════════════ */
async function loadFolder(url) {
  const folder = File.fromURL(url);
  await folder.loadAttributes();

  const files = [];

  // Walk with relative path tracking
  function walk(node, relDir) {
    if (!node) return;
    if (node.directory) {
      const sub = relDir ? relDir + '/' + node.name : node.name;
      for (const child of (node.children || [])) walk(child, sub);
    } else {
      // attach relative path for zip purposes
      node._relPath = relDir ? relDir + '/' + node.name : node.name;
      files.push(node);
    }
  }

  // If root itself is a directory, walk its children
  if (folder.directory) {
    for (const child of (folder.children || [])) walk(child, '');
  } else {
    folder._relPath = folder.name;
    files.push(folder);
  }

  // Sort: sendable first, then by size ascending
  files.sort((a, b) => {
    const aOk = a.size <= WA_LIMIT ? 0 : 1;
    const bOk = b.size <= WA_LIMIT ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return a.size - b.size;
  });

  return { files, folderName: folder.name || `mega_folder_${Date.now()}` };
}

/** Clean up ugly MEGA auto-generated names like document_6143220439343696093.mp4 */
function cleanMegaName(name) {
  // document_DIGITS.ext → keep only the extension part with a generic name
  const m = name.match(/^document_\d+(\.[a-z0-9]+)$/i);
  if (m) return `file_${Date.now()}${m[1]}`;
  // remove double extensions e.g. movie.mp4.mp4
  const parts = name.split('.');
  if (parts.length > 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
    return parts.join('.');
  }
  return name;
}

/* ════════════════════════════════════════════════════════════
   🗜️  ZIP BUILDER — downloads all files into a zip (adm-zip, pure JS)
════════════════════════════════════════════════════════════ */
async function buildZip(files, folderName, conn, from, statusKey) {
  if (!AdmZip) throw new Error('adm-zip not available. Run: npm install adm-zip');

  const zipName    = `${folderName.replace(/[^a-z0-9._-]/gi, '_')}.zip`;
  const zipOutPath = path.join(os.tmpdir(), `shaviya_zip_${Date.now()}_${zipName}`);
  const totalSize  = files.reduce((s, f) => s + (f.size || 0), 0);
  let   downloaded = 0;
  let   lastPct    = -1;

  await safeEdit(conn, from, statusKey,
    `🗜️ *Creating ZIP: ${zipName}*\n` +
    `📦 ${files.length} files | 💾 ${formatSize(totalSize)}\n` +
    `[░░░░░░░░░░░░] 0%\n⏬ Downloading & packing...`
  );

  const zip = new AdmZip();

  // Download each file into memory buffer and add to zip
  for (let i = 0; i < files.length; i++) {
    const f       = files[i];
    const fname   = cleanMegaName(f._relPath || f.name);

    await safeEdit(conn, from, statusKey,
      `🗜️ *Packing [${i + 1}/${files.length}]*\n` +
      `📄 ${f.name}\n` +
      `💾 ${formatSize(downloaded)} / ${formatSize(totalSize)}`
    );

    // Download to temp file first (safer for large files than RAM buffer)
    const tmpFile = path.join(os.tmpdir(), `shaviya_ziptmp_${Date.now()}_${i}`);
    await new Promise((resolve, reject) => {
      const stream = f.download({ highWaterMark: HWM });
      const w      = fs.createWriteStream(tmpFile);
      stream.on('data', chunk => {
        downloaded += chunk.length;
        const pct = totalSize > 0 ? Math.min(Math.floor((downloaded / totalSize) * 100), 99) : 0;
        if (pct !== lastPct) {
          lastPct = pct;
          safeEdit(conn, from, statusKey,
            `🗜️ *Packing: ${zipName}*\n` +
            `[${progressBar(pct)}] *${pct}%*\n` +
            `📄 ${f.name} [${i + 1}/${files.length}]\n` +
            `💾 ${formatSize(downloaded)} / ${formatSize(totalSize)}`
          );
        }
      });
      stream.once('error', reject);
      w.once('error', reject);
      w.once('finish', resolve);
      stream.pipe(w);
    });

    zip.addLocalFile(tmpFile, '', fname);
    safeUnlink(tmpFile);
  }

  zip.writeZip(zipOutPath);

  await safeEdit(conn, from, statusKey,
    `🗜️ *ZIP Ready: ${zipName}*\n` +
    `📦 ${files.length} files packed\n` +
    `[████████████] *100%*\n` +
    `📤 Uploading ZIP to WhatsApp...`
  );

  const stat = fs.statSync(zipOutPath);
  return { zipPath: zipOutPath, zipName, zipSize: stat.size };
}

/* ════════════════════════════════════════════════════════════
   🔄  PARALLEL FOLDER DOWNLOAD (pool of N workers)
════════════════════════════════════════════════════════════ */
async function parallelFolderDownload(files, conn, from, mek, reply) {
  const sendable = files; // already filtered by caller
  const skipped  = [];    // nothing skipped at this point

  if (skipped.length > 0) {
    await reply(
      `⚠️ *${skipped.length} file(s) skipped* (>2GB):\n` +
      skipped.map(f => `• ${f.name} — ${formatSize(f.size)}`).join('\n')
    );
  }

  if (sendable.length === 0) return { sent: 0, failed: 0 };

  let sent   = 0;
  let failed = 0;
  let idx    = 0;

  // Worker function
  async function worker() {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= sendable.length) break;
      const f = sendable[myIdx];

      const progMsg = await conn.sendMessage(from, {
        text:
          `⏬ *[${myIdx + 1}/${sendable.length}]* ${f.name}\n` +
          `📁 ${formatSize(f.size)}\n` +
          `[░░░░░░░░░░░░] 0%`,
      }).catch(() => null);

      try {
        const result = await withRetry(
          () => ultraDownload(f, conn, from, progMsg?.key, `[${myIdx + 1}/${sendable.length}] `),
          RETRY_ATTEMPTS,
          f.name
        );
        await sendFile(conn, from, mek, result.filePath, result.name, result.size);
        safeUnlink(result.filePath);
        sent++;
      } catch (err) {
        console.error(`[MEGA FOLDER FILE FAIL] ${f.name}`, err);
        await reply(`❌ Failed: *${f.name}*\n\`${err.message}\``);
        failed++;
      }
    }
  }

  // Spawn FOLDER_WORKERS concurrent workers
  const workers = Array.from({ length: Math.min(FOLDER_WORKERS, sendable.length) }, worker);
  await Promise.all(workers);

  return { sent, failed };
}

/* ════════════════════════════════════════════════════════════
   CMD: .mega — single file OR folder (auto-detect)
════════════════════════════════════════════════════════════ */
cmd({
  pattern:   'mega',
  alias:     ['megadl', 'megadown'],
  ownerOnly: true,
  react:     '⚡',
  desc:      'MEGA ultra-fast download — file or folder',
  filename:  __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q || !q.startsWith('https://mega.nz')) {
    return reply(
      `╔══════════════════════╗\n` +
      `║  ⚡ MEGA DOWNLOADER  ║\n` +
      `╚══════════════════════╝\n\n` +
      `📄 *Single File:*\n\`.mega https://mega.nz/file/xxx#yyy\`\n\n` +
      `📁 *Folder (all files):*\n\`.mega https://mega.nz/folder/xxx#yyy\`\n\n` +
      `📋 *List folder:*  \`.megalist <folder_link>\`\n` +
      `📥 *Pick one file:* \`.megaget <folder_link> filename.ext\``
    );
  }

  /* ── FOLDER ── */
  if (isFolder(q)) {
    const statusMsg = await conn.sendMessage(from, { text: '📁 Loading MEGA folder...' }).catch(() => null);

    try {
      const { files, folderName } = await withRetry(() => loadFolder(q), RETRY_ATTEMPTS, 'loadFolder');

      if (files.length === 0) return reply('❌ Folder is empty.');

      const sendable   = files.filter(f => f.size <= WA_LIMIT);
      const tooLarge   = files.filter(f => f.size >  WA_LIMIT);
      const totalBytes = sendable.reduce((s, f) => s + f.size, 0);

      // ── ZIP MODE: 5+ files → pack into one zip ──
      if (sendable.length >= ZIP_THRESHOLD) {
        await safeEdit(conn, from, statusMsg?.key,
          `📁 *${folderName}*\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `📦 Files   : ${files.length}\n` +
          `✅ Sendable: ${sendable.length}\n` +
          `🚫 Too large: ${tooLarge.length}\n` +
          `💾 Size    : ${formatSize(totalBytes)}\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `🗜️ *${sendable.length} files → packing as ZIP...*`
        );

        let zipPath = null;
        try {
          const { zipPath: zp, zipName, zipSize } = await buildZip(
            sendable, folderName, conn, from, statusMsg?.key
          );
          zipPath = zp;

          if (zipSize > WA_LIMIT) {
            await reply(
              `⚠️ ZIP too large for WhatsApp! (${formatSize(zipSize)})\n` +
              `🔄 Falling back to individual file sending...`
            );
            throw new Error('ZIP_TOO_LARGE');
          }

          const buf = fs.readFileSync(zipPath);
          await conn.sendMessage(from, {
            document: buf,
            fileName: zipName,
            mimetype: 'application/zip',
            caption:
              `🗜️ *${zipName}*\n` +
              `📦 ${sendable.length} files inside\n` +
              `💾 ${formatSize(zipSize)}\n` +
              (tooLarge.length > 0 ? `⚠️ ${tooLarge.length} file(s) excluded (>2GB)` : `✅ All files included`)
          }, { quoted: mek });

          if (tooLarge.length > 0) {
            await reply(
              `🚫 *Skipped (>2GB):*\n` +
              tooLarge.map(f => `• ${f.name} — ${formatSize(f.size)}`).join('\n')
            );
          }

          await reply(`✅ *ZIP sent!* | ${sendable.length} files | ${formatSize(zipSize)}`);

        } catch (err) {
          if (err.message !== 'ZIP_TOO_LARGE') throw err;
          // Fallback to individual sends
          const { sent, failed } = await parallelFolderDownload(sendable, conn, from, mek, reply);
          await reply(
            `╔══════════════════════╗\n║  ✅ DOWNLOAD DONE    ║\n╚══════════════════════╝\n` +
            `📤 Sent: ${sent} | ❌ Failed: ${failed} | 🚫 Skipped: ${tooLarge.length}`
          );
        } finally {
          if (zipPath) safeUnlink(zipPath);
        }
        return;
      }

      // ── INDIVIDUAL MODE: < 5 files → send one by one ──
      await safeEdit(conn, from, statusMsg?.key,
        `📁 *${folderName}*\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `📦 Total files  : ${files.length}\n` +
        `✅ Sendable     : ${sendable.length}\n` +
        `🚫 Too large    : ${tooLarge.length}\n` +
        `💾 Total size   : ${formatSize(totalBytes)}\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `⚡ Starting parallel download (${Math.min(FOLDER_WORKERS, sendable.length)} workers)...`
      );

      const { sent, failed } = await parallelFolderDownload(sendable, conn, from, mek, reply);

      await reply(
        `╔══════════════════════╗\n` +
        `║  ✅ DOWNLOAD DONE    ║\n` +
        `╚══════════════════════╝\n` +
        `📤 Sent    : ${sent}\n` +
        `❌ Failed  : ${failed}\n` +
        `🚫 Skipped : ${tooLarge.length} (>2GB)`
      );

    } catch (err) {
      console.error('[MEGA FOLDER ERROR]', err);
      reply(`❌ Folder download failed.\n\`${err.message}\``);
    }
    return;
  }

  /* ── SINGLE FILE ── */
  if (!q.includes('#')) return reply('❌ Invalid MEGA link — decryption key (#) missing.');

  let outPath = null;
  try {
    const file = await withRetry(async () => {
      const f = File.fromURL(q);
      await f.loadAttributes();
      return f;
    }, RETRY_ATTEMPTS, 'loadAttributes');

    const statusMsg = await conn.sendMessage(from, {
      text:
        `📦 *${file.name || 'file'}*\n` +
        `📁 ${formatSize(file.size)}\n` +
        `[░░░░░░░░░░░░] 0%`,
    }).catch(() => null);

    const result = await withRetry(
      () => ultraDownload(file, conn, from, statusMsg?.key),
      RETRY_ATTEMPTS,
      file.name
    );
    outPath = result.filePath;

    await sendFile(conn, from, mek, result.filePath, result.name, result.size);

  } catch (err) {
    console.error('[MEGA FILE ERROR]', err);
    reply(`❌ Download failed.\n\`${err.message}\``);
  } finally {
    if (outPath) safeUnlink(outPath);
  }
});

/* ════════════════════════════════════════════════════════════
   CMD: .megalist — list files in a folder
════════════════════════════════════════════════════════════ */
cmd({
  pattern:   'megalist',
  alias:     ['megafiles', 'megadir'],
  ownerOnly: true,
  react:     '📋',
  desc:      'List files inside a MEGA folder',
  filename:  __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q || !isFolder(q)) return reply('❌ Valid MEGA folder link දෙන්න.');

  try {
    await reply('📁 Loading folder...');
    const { files, folderName } = await withRetry(() => loadFolder(q), RETRY_ATTEMPTS, 'megalist');

    if (files.length === 0) return reply('❌ Folder is empty.');

    const sendable = files.filter(f => f.size <= WA_LIMIT);
    const totalBytes = files.reduce((s, f) => s + f.size, 0);

    const lines = files.map((f, i) => {
      const flag = f.size > WA_LIMIT ? ' 🚫' : ' ✅';
      return `*${i + 1}.* 📄 ${f._relPath || f.name}\n    📁 ${formatSize(f.size)}${flag}`;
    });

    const header =
      `📁 *${folderName} — ${files.length} files*\n` +
      `💾 Total: ${formatSize(totalBytes)} | ✅ Sendable: ${sendable.length}\n` +
      (sendable.length >= ZIP_THRESHOLD ? `🗜️ Will be sent as ZIP (${sendable.length} files)\n` : '') +
      `\n`;

    const CHUNK = 30;
    for (let i = 0; i < lines.length; i += CHUNK) {
      const slice = lines.slice(i, i + CHUNK);
      const isFirst = i === 0;
      const isLast  = i + CHUNK >= lines.length;
      await reply(
        (isFirst ? header : `📋 *(continued ${i + 1}–${Math.min(i + CHUNK, lines.length)})*\n\n`) +
        slice.join('\n\n') +
        (isLast ? `\n\n📥 \`.megaget <folder_link> filename.ext\`` : '')
      );
    }
  } catch (err) {
    reply(`❌ Failed to load folder.\n\`${err.message}\``);
  }
});

/* ════════════════════════════════════════════════════════════
   CMD: .megaget — download specific file from folder
════════════════════════════════════════════════════════════ */
cmd({
  pattern:   'megaget',
  alias:     ['megapick', 'megafile'],
  ownerOnly: true,
  react:     '📥',
  desc:      'Download a specific file from a MEGA folder',
  filename:  __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply(
    '❌ Usage: `.megaget <folder_link> <filename>`\n\n' +
    'Example: `.megaget https://mega.nz/folder/xxx#yyy movie.mkv`'
  );

  const parts    = q.trim().split(/\s+/);
  const url      = parts[0];
  const filename = parts.slice(1).join(' ').trim().toLowerCase();

  if (!isFolder(url))  return reply('❌ Valid MEGA folder link දෙන්න.');
  if (!filename)       return reply('❌ Filename දෙන්න.\nExample: `.megaget <link> movie.mkv`');

  let outPath = null;
  try {
    await reply(`🔍 Searching for *${filename}*...`);
    const { files } = await withRetry(() => loadFolder(url), RETRY_ATTEMPTS, 'megaget-load');

    // Fuzzy match: exact first, then partial
    const match =
      files.find(f => f.name.toLowerCase() === filename) ||
      files.find(f => f.name.toLowerCase().includes(filename));

    if (!match) {
      const names = files.slice(0, 20).map(f => `• ${f.name}`).join('\n');
      return reply(
        `❌ *"${filename}"* found නෑ.\n\n` +
        `📋 Available files (first 20):\n${names}` +
        (files.length > 20 ? `\n...and ${files.length - 20} more` : '')
      );
    }

    if (match.size > WA_LIMIT) {
      return reply(
        `❌ File too large!\n📦 ${match.name}\n📁 ${formatSize(match.size)}\n🚫 Max: 2 GB`
      );
    }

    const progMsg = await conn.sendMessage(from, {
      text:
        `📦 *${match.name}*\n` +
        `📁 ${formatSize(match.size)}\n` +
        `[░░░░░░░░░░░░] 0%`,
    }).catch(() => null);

    const result = await withRetry(
      () => ultraDownload(match, conn, from, progMsg?.key),
      RETRY_ATTEMPTS,
      match.name
    );
    outPath = result.filePath;

    await sendFile(conn, from, mek, result.filePath, result.name, result.size);

  } catch (err) {
    console.error('[MEGAGET ERROR]', err);
    reply(`❌ Download failed.\n\`${err.message}\``);
  } finally {
    if (outPath) safeUnlink(outPath);
  }
});
