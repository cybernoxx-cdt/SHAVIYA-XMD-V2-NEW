// ================================================================
//   plugins/megadown.js — SHAVIYA-XMD V2
//   ✅ Single file download  (.mega <file_link>)
//   ✅ Folder download       (.mega <folder_link>)
//   ✅ Folder file list      (.megalist <folder_link>)
//   ✅ Folder file pick      (.megaget <folder_link> <filename>)
//   ✅ Live progress bar
//   ✅ 2GB WhatsApp limit check per file
// ================================================================

'use strict';

const { cmd } = require('../command');
const { File, Storage } = require('megajs');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/* ── Helpers ─────────────────────────────────────────────── */
function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(2) + ' KB';
}

function progressBar(pct) {
  const f = Math.floor(pct / 10);
  return '█'.repeat(f) + '░'.repeat(10 - f);
}

function isFolder(url) {
  return url.includes('/folder/') || url.includes('/#F!') || url.includes('#F!');
}

function isFile(url) {
  return url.includes('/file/') || (url.includes('#') && !isFolder(url));
}

const WA_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB

/* ── Download single file with progress ─────────────────── */
async function downloadFileWithProgress(file, conn, from, editKey) {
  const total     = file.size;
  const name      = file.name || `mega_${Date.now()}`;
  const totalText = formatSize(total);
  const tmpPath   = path.join(os.tmpdir(), `${Date.now()}_${name}`);

  if (total > WA_LIMIT) {
    throw new Error(`File too large for WhatsApp!\n📦 ${name}\n📁 ${totalText}\n⚠️ Max: 2 GB`);
  }

  const writeStream = fs.createWriteStream(tmpPath, { highWaterMark: 1024 * 1024 * 8 });
  const download    = file.download({ highWaterMark: 1024 * 1024 * 8 });

  let downloaded  = 0;
  let lastPercent = -1;
  let editing     = false;
  let editTimer   = null;

  download.on('data', (chunk) => {
    downloaded += chunk.length;
    const pct = Math.floor((downloaded / total) * 100);
    if (pct - lastPercent < 5 || editing) return;
    lastPercent = pct;
    editing = true;
    clearTimeout(editTimer);
    editTimer = setTimeout(() => {
      if (!editKey) { editing = false; return; }
      conn.sendMessage(from, {
        text:
          `📦 *${name}*\n` +
          `📁 ${totalText}\n` +
          `⏬ [${progressBar(pct)}] ${pct}%\n` +
          `${formatSize(downloaded)} / ${totalText}`,
        edit: editKey,
      }).finally(() => { editing = false; });
    }, 300);
  });

  await new Promise((resolve, reject) => {
    download.pipe(writeStream);
    writeStream.once('finish', resolve);
    download.once('error', reject);
    writeStream.once('error', reject);
  });

  // Final 100%
  if (editKey) {
    await conn.sendMessage(from, {
      text:
        `📦 *${name}*\n` +
        `📁 ${totalText}\n` +
        `✅ [██████████] 100%\n` +
        `📤 Uploading to WhatsApp...`,
      edit: editKey,
    }).catch(() => {});
  }

  return { tmpPath, name };
}

/* ── Load folder and get flat file list ─────────────────── */
async function loadFolder(url) {
  const folder = File.fromURL(url);
  await folder.loadAttributes();

  const files = [];
  function walk(node) {
    if (!node) return;
    if (node.directory) {
      for (const child of (node.children || [])) walk(child);
    } else {
      files.push(node);
    }
  }
  walk(folder);
  return { folder, files };
}

/* ════════════════════════════════════════════════════════════
   CMD: .mega — single file OR folder (auto-detect)
════════════════════════════════════════════════════════════ */
cmd({
  pattern:  'mega',
  alias:    ['megadl', 'megadown'],
  ownerOnly: true,
  react:    '📦',
  desc:     'MEGA download — file or folder',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q || !q.startsWith('https://mega.nz')) {
    return reply(
      '❌ Valid MEGA link දෙන්න.\n\n' +
      '📄 File  : `.mega https://mega.nz/file/xxx#yyy`\n' +
      '📁 Folder: `.mega https://mega.nz/folder/xxx#yyy`\n\n' +
      '📋 Folder list: `.megalist <folder_link>`\n' +
      '📥 Pick file  : `.megaget <folder_link> filename.ext`'
    );
  }

  /* ── FOLDER ── */
  if (isFolder(q)) {
    let statusMsg;
    try {
      statusMsg = await conn.sendMessage(from, { text: '📁 MEGA Folder loading...' });
      const { files } = await loadFolder(q);

      if (files.length === 0) return reply('❌ Folder is empty.');

      // If only 1 file — download it directly
      if (files.length === 1) {
        const f = files[0];
        if (f.size > WA_LIMIT) {
          return reply(`❌ File too large!\n📦 ${f.name}\n📁 ${formatSize(f.size)}\n⚠️ Max: 2 GB`);
        }
        const { tmpPath, name } = await downloadFileWithProgress(f, conn, from, statusMsg?.key);
        const buf = fs.readFileSync(tmpPath);
        await conn.sendMessage(from, {
          document: buf,
          fileName: name,
          mimetype: 'application/octet-stream',
        }, { quoted: mek });
        fs.unlink(tmpPath, () => {});
        return;
      }

      // Multiple files — show list, download all under 2GB
      const listLines = files.map((f, i) =>
        `${i + 1}. 📄 *${f.name}*\n    📁 ${formatSize(f.size)}${f.size > WA_LIMIT ? ' ⚠️ Too large' : ''}`
      );

      await conn.sendMessage(from, {
        text:
          `📁 *MEGA Folder Contents*\n` +
          `📦 ${files.length} files found\n\n` +
          listLines.join('\n\n') + '\n\n' +
          `⏬ Downloading all files under 2GB...`,
        edit: statusMsg?.key,
      }).catch(() => {});

      // Download each sendable file
      let sent = 0;
      for (const f of files) {
        if (f.size > WA_LIMIT) {
          await reply(`⚠️ Skipped: *${f.name}* (${formatSize(f.size)}) — too large`);
          continue;
        }
        try {
          const progMsg = await conn.sendMessage(from, {
            text: `⏬ Downloading: *${f.name}*\n📁 ${formatSize(f.size)}\n[░░░░░░░░░░] 0%`,
          });
          const { tmpPath, name } = await downloadFileWithProgress(f, conn, from, progMsg?.key);
          const buf = fs.readFileSync(tmpPath);
          await conn.sendMessage(from, {
            document: buf,
            fileName: name,
            mimetype: 'application/octet-stream',
          }, { quoted: mek });
          fs.unlink(tmpPath, () => {});
          sent++;
        } catch (e) {
          await reply(`❌ Failed: *${f.name}*\n\`\`\`${e.message}\`\`\``);
        }
      }

      await reply(`✅ Done! *${sent}/${files.length}* files sent.`);

    } catch (err) {
      console.error('[MEGA FOLDER ERROR]', err);
      reply(`❌ Folder download failed.\n\`\`\`${err.message}\`\`\``);
    }
    return;
  }

  /* ── SINGLE FILE ── */
  if (!q.includes('#')) return reply('❌ Invalid MEGA link — # key නෑ.');

  try {
    let file;
    try {
      file = File.fromURL(q);
      await file.loadAttributes();
    } catch {
      return reply('❌ MEGA link load කරන්න බැරි වුනා.\nLink valid ද check කරන්න.');
    }

    const sent = await conn.sendMessage(from, {
      text:
        `📦 *${file.name || 'file'}*\n` +
        `📁 ${formatSize(file.size)}\n` +
        `⏬ [░░░░░░░░░░] 0%`,
    });

    const { tmpPath, name } = await downloadFileWithProgress(file, conn, from, sent?.key);
    const buf = fs.readFileSync(tmpPath);
    await conn.sendMessage(from, {
      document: buf,
      fileName: name,
      mimetype: 'application/octet-stream',
    }, { quoted: mek });
    fs.unlink(tmpPath, () => {});

  } catch (err) {
    console.error('[MEGA FILE ERROR]', err);
    reply(`❌ Download failed.\n\`\`\`${err.message}\`\`\``);
  }
});

/* ════════════════════════════════════════════════════════════
   CMD: .megalist — list files in a folder
════════════════════════════════════════════════════════════ */
cmd({
  pattern:  'megalist',
  alias:    ['megafiles', 'megadir'],
  ownerOnly: true,
  react:    '📋',
  desc:     'List files inside a MEGA folder',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q || !isFolder(q)) return reply('❌ Valid MEGA folder link දෙන්න.');

  try {
    await reply('📁 Loading folder...');
    const { files } = await loadFolder(q);

    if (files.length === 0) return reply('❌ Folder is empty.');

    const lines = files.map((f, i) =>
      `${i + 1}. 📄 *${f.name}*\n    📁 ${formatSize(f.size)}${f.size > WA_LIMIT ? ' ⚠️ Too large (>2GB)' : ''}`
    );

    reply(
      `📁 *MEGA Folder — ${files.length} files*\n\n` +
      lines.join('\n\n') + '\n\n' +
      `📥 Download one file:\n\`.megaget <folder_link> filename.ext\``
    );
  } catch (err) {
    reply(`❌ Failed to load folder.\n\`\`\`${err.message}\`\`\``);
  }
});

/* ════════════════════════════════════════════════════════════
   CMD: .megaget — download specific file from folder
════════════════════════════════════════════════════════════ */
cmd({
  pattern:  'megaget',
  alias:    ['megapick', 'megafile'],
  ownerOnly: true,
  react:    '📥',
  desc:     'Download a specific file from a MEGA folder',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('❌ Usage: `.megaget <folder_link> <filename>`');

  const parts    = q.trim().split(/\s+/);
  const url      = parts[0];
  const filename = parts.slice(1).join(' ').toLowerCase();

  if (!isFolder(url)) return reply('❌ Valid MEGA folder link දෙන්න.');
  if (!filename)       return reply('❌ Filename දෙන්න.\nExample: `.megaget <link> movie.mp4`');

  try {
    await reply(`🔍 Searching for *${filename}* in folder...`);
    const { files } = await loadFolder(url);

    const match = files.find(f => f.name.toLowerCase().includes(filename));
    if (!match) {
      const names = files.map(f => `• ${f.name}`).join('\n');
      return reply(`❌ "*${filename}*" found නෑ.\n\n📋 Available files:\n${names}`);
    }

    if (match.size > WA_LIMIT) {
      return reply(`❌ File too large!\n📦 ${match.name}\n📁 ${formatSize(match.size)}\n⚠️ Max: 2 GB`);
    }

    const progMsg = await conn.sendMessage(from, {
      text:
        `📦 *${match.name}*\n` +
        `📁 ${formatSize(match.size)}\n` +
        `⏬ [░░░░░░░░░░] 0%`,
    });

    const { tmpPath, name } = await downloadFileWithProgress(match, conn, from, progMsg?.key);
    const buf = fs.readFileSync(tmpPath);
    await conn.sendMessage(from, {
      document: buf,
      fileName: name,
      mimetype: 'application/octet-stream',
    }, { quoted: mek });
    fs.unlink(tmpPath, () => {});

  } catch (err) {
    console.error('[MEGAGET ERROR]', err);
    reply(`❌ Download failed.\n\`\`\`${err.message}\`\`\``);
  }
});
