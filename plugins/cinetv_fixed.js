const config = require('../config');
const fg = require('api-dylux');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { cmd, commands } = require('../command');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions2');

// ═══════════════════════════════════════════════════
//  Session Configuration Helpers
// ═══════════════════════════════════════════════════
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function saveSessionConfig(sessionId, cfg) {
  try {
    const dataFolder = path.join(__dirname, '../data');
    if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
    const file = path.join(dataFolder, `session_config_${sessionId}.json`);
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  } catch (e) {}
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "SHAVIYA-XMD © 2026 🇱🇰";
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

function getDocPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || "SHAVIYA-XMD";
}

function getFilePrefix(sessionId) {
  return getSessionConfig(sessionId).filePrefix || "ꜰɪʟᴍ ᴜᴘʟᴏᴀᴅ ʙʏ ꜱʜᴀᴠɪʏᴀ";
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
// ═══════════════════════════════════════════════════
async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;
  const fallbackUrl = hardThumbUrl;

  async function fetchThumb(url) {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  }

  try {
    return await fetchThumb(primaryUrl);
  } catch (e) {
    if (primaryUrl !== fallbackUrl) {
      try { return await fetchThumb(fallbackUrl); } catch {}
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Wait for Reply Function
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isTargetReply = context?.stanzaId === targetId;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
      
      if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text) && text !== "") {
        if (settled) return;
        settled = true;
        conn.ev.off("messages.upsert", handler);
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => {
      if (settled) return;
      conn.ev.off("messages.upsert", handler);
      resolve(null);
    }, timeout);
  });
}

// ═══════════════════════════════════════════════════
//  Format File Size
// ═══════════════════════════════════════════════════
function formatFileSize(bytes) {
  if (!bytes) return "Unknown";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// ═══════════════════════════════════════════════════
//  API Configuration
// ═══════════════════════════════════════════════════
const API_KEY = "edbcfabbca5a9750";
const BASE_URL = "https://api-dark-shan-yt.koyeb.app";

// ═══════════════════════════════════════════════════
//  Download Link Resolver
// ═══════════════════════════════════════════════════
async function resolveDownloadLink(dlUrl, label) {
  try {
    const res = await axios.get(`${BASE_URL}/movie/cinesubz-download?url=${encodeURIComponent(dlUrl)}&apikey=${API_KEY}`);
    const data = res.data?.data || {};
    const links = data.download || [];
    const apiTitle = data.title || null;
    const apiSize = data.size || null;
    
    console.log(`🔗 [SHAVIYA-XMD] ${label} links:`, links.map(l => l.name).join(', '));

    // Priority 1: Google Drive
    const gdriveRaw = links.find(d => d.name?.toLowerCase() === "gdrive")?.url;
    if (gdriveRaw) {
      const driveUrl = gdriveRaw
        .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
        .replace('&export=download', '/view');
      console.log(`🚀 [SHAVIYA-XMD] ${label} → GDrive: ${driveUrl}`);
      const r = await fg.GDriveDl(driveUrl);
      console.log(`📦 [SHAVIYA-XMD] ${label} GDrive OK: ${r.fileName} | ${r.fileSize}`);
      return { 
        type: 'gdrive', 
        url: r.downloadUrl, 
        fileName: r.fileName, 
        fileSize: r.fileSize, 
        mimetype: r.mimetype 
      };
    }

    // Priority 2: Pixeldrain
    const pix = links.find(d => d.name?.toLowerCase().includes("pix"))?.url;
    if (pix) {
      const fileId = pix.split('/').pop().split('?')[0];
      const pixUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      console.log(`🚀 [SHAVIYA-XMD] ${label} → Pixeldrain: ${pixUrl}`);
      return { 
        type: 'pix', 
        url: pixUrl, 
        fileName: apiTitle, 
        fileSize: apiSize, 
        mimetype: 'video/mp4' 
      };
    }

    // Priority 3: Direct Link
    const direct = links.find(d => {
      const name = d.name?.toLowerCase() || '';
      const url = d.url || '';
      if (name === 'telegram' || url.includes('t.me')) return false;
      return name === 'unknown' || (url.startsWith('http') && !url.includes('t.me'));
    })?.url;

    if (direct) {
      console.log(`🚀 [SHAVIYA-XMD] ${label} → Direct: ${direct}`);
      return { 
        type: 'direct', 
        url: direct, 
        fileName: apiTitle, 
        fileSize: apiSize, 
        mimetype: 'video/mp4' 
      };
    }

    console.log(`❌ [SHAVIYA-XMD] ${label} → No downloadable link found`);
    return null;
  } catch (error) {
    console.error(`❌ [SHAVIYA-XMD] Resolve error:`, error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Handle Movie Download
// ═══════════════════════════════════════════════════
async function handleMovieDownload(conn, from, sender, dlLinks, title, quotedMsg, posterUrl, sessionId) {
  try {
    if (!dlLinks?.length) {
      await conn.sendMessage(from, { 
        text: `❌ *Download links not available for*\n🎬 *${title}*` 
      }, { quoted: quotedMsg });
      return;
    }

    const botName = getBotName(sessionId);
    const hardThumb = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);
    const DOC_PREFIX = getDocPrefix(sessionId);
    const FILE_PREFIX = getFilePrefix(sessionId);

    // Build quality selection message
    let qualityText = `🎬 *${title}*\n\n📥 *Select Quality:*\n`;
    dlLinks.forEach((dl, i) => {
      qualityText += `\n${i + 1}. *${dl.quality}* ${dl.size ? `(${dl.size})` : ''}`;
    });
    qualityText += `\n\n──────────────\n💫 *${botName}*`;
    
    const sentQual = await conn.sendMessage(from, { 
      text: qualityText 
    }, { quoted: quotedMsg });

    const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
    if (!qSel) return;

    const chosenDl = dlLinks[parseInt(qSel.text) - 1];
    if (!chosenDl) {
      await conn.sendMessage(from, { 
        text: `❌ *Invalid selection!*\n\nPlease select a valid quality number.` 
      }, { quoted: qSel.msg });
      return;
    }

    console.log(`⬇️ [SHAVIYA-XMD] Downloading: ${title} | Quality: ${chosenDl.quality}`);
    await conn.sendMessage(from, { 
      react: { text: "⏳", key: qSel.msg.key } 
    });

    const dlResult = await resolveDownloadLink(chosenDl.link, title);
    if (!dlResult) {
      await conn.sendMessage(from, { 
        text: `❌ *Download link not found!*\n🎬 *${title}*\n💎 *Quality:* ${chosenDl.quality}` 
      }, { quoted: qSel.msg });
      return;
    }

    await conn.sendMessage(from, { 
      react: { text: "📥", key: qSel.msg.key } 
    });

    // Create thumbnail
    const thumb = await makeThumbnail(posterUrl || null, hardThumb, movieDocOn);
    
    // Clean filename
    const cleanName = dlResult.fileName 
      ? dlResult.fileName.replace(/\[Cinesubz\.co\]/gi, '').trim() 
      : `${title} (${chosenDl.quality}).mp4`;
    
    const finalFileName = `${FILE_PREFIX} ${cleanName}`;
    const fileSize = dlResult.fileSize || chosenDl.size || '';
    const formattedSize = fileSize.toString().includes('MB') ? fileSize : formatFileSize(fileSize);

    // Send as document
    const docMsg = await conn.sendMessage(from, {
      document: { url: dlResult.url },
      fileName: finalFileName,
      mimetype: dlResult.mimetype || 'video/mp4',
      jpegThumbnail: thumb,
      caption: `🎬 *${DOC_PREFIX}*\n\n` +
               `📽️ *Title:* ${title}\n` +
               `💎 *Quality:* ${chosenDl.quality}\n` +
               `📦 *Size:* ${formattedSize}\n` +
               `📁 *Format:* MP4\n\n` +
               `──────────────\n` +
               `💫 *${botName}*`
    }, { quoted: qSel.msg });

    console.log(`✅ [SHAVIYA-XMD] Sent: ${finalFileName}`);
    await conn.sendMessage(from, { 
      react: { text: "✅", key: docMsg.key } 
    });

  } catch (err) { 
    console.log(`❌ [SHAVIYA-XMD] handleDownload error:`, err.message);
    await conn.sendMessage(from, { 
      text: `❌ *Error downloading*\n${err.message}` 
    });
  }
}

// ═══════════════════════════════════════════════════
//  MAIN MOVIE COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "movie",
  alias: ["cinetv", "cinesubz", "ct"],
  desc: "Download movies & TV series from CineSubz",
  category: "downloader",
  react: "🎬",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender, l, sessionId }) => {
  try {
    if (!q) {
      return reply(`🎬 *SHAVIYA-XMD Movie Downloader*\n\n` +
                   `📌 *Usage:*\n` +
                   `   .movie <movie name>\n` +
                   `   .movie <tv series name>\n\n` +
                   `✨ *Example:*\n` +
                   `   .movie kgf chapter 2\n` +
                   `   .movie game of thrones\n\n` +
                   `📺 *Supports:* Movies & TV Series\n` +
                   `🎯 *Quality:* 360p, 480p, 720p, 1080p\n\n` +
                   `──────────────\n` +
                   `💫 *${getBotName(sessionId)}*`);
    }

    const FOOTER = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);
    const DOC_PREFIX = getDocPrefix(sessionId);
    const FILE_PREFIX = getFilePrefix(sessionId);

    console.log(`\n🔍 [SHAVIYA-XMD] Searching: "${q}" | Session: ${sessionId}`);

    // Search for movies/TV shows
    const searchRes = await axios.get(`${BASE_URL}/movie/cinesubz-search?q=${encodeURIComponent(q)}&apikey=${API_KEY}`);
    const results = searchRes.data?.data;
    
    console.log(`📂 [SHAVIYA-XMD] Found ${results?.length || 0} results`);
    
    if (!results?.length) {
      return reply(`❌ *No results found for*\n🎬 *${q}*\n\nPlease try different keywords.`);
    }

    // Build search results message
    let listText = `🎬 *SEARCH RESULTS*\n\n`;
    listText += `🔍 *Query:* ${q}\n`;
    listText += `📊 *Found:* ${results.length} results\n\n`;
    listText += `┌─⊷ ${DOC_PREFIX}\n`;
    
    results.slice(0, 15).forEach((v, i) => {
      const typeIcon = v.type === "tvshows" ? "📺" : "🎬";
      listText += `│ ${i + 1}. ${typeIcon} *${v.title}*\n`;
      listText += `│    🎯 ${v.quality || 'HD'}\n`;
    });
    
    listText += `└──────────────\n\n`;
    listText += `📝 *Reply with number* (1-${Math.min(15, results.length)})\n`;
    listText += `⏱️ *Timeout:* 10 minutes\n\n`;
    listText += `💫 *${FOOTER}*`;

    const sentSearch = await conn.sendMessage(from, { 
      text: listText,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363304437429368@newsletter',
          newsletterName: 'SHAVIYA-XMD',
          serverMessageId: 1
        }
      }
    }, { quoted: m });

    // Handle TV Series
    async function handleTVSeries(selectedItem, selectionMsg) {
      try {
        console.log(`📺 [SHAVIYA-XMD] Fetching TV info: ${selectedItem.link}`);
        await conn.sendMessage(from, { 
          react: { text: "⏳", key: selectionMsg.key } 
        });

        const infoRes = await axios.get(`${BASE_URL}/tv/cinesubz-info?url=${encodeURIComponent(selectedItem.link)}&apikey=${API_KEY}`);
        const tvData = infoRes.data.data;
        
        console.log(`📺 [SHAVIYA-XMD] TV: ${tvData.title} | Seasons: ${tvData.seasons?.length}`);

        // Build season selection
        let seasonText = `📺 *${tvData.title}*\n\n`;
        seasonText += `📅 *Year:* ${tvData.year || 'N/A'}\n`;
        seasonText += `⭐ *Rating:* ${tvData.rating || 'N/A'}\n`;
        seasonText += `📝 *Seasons:* ${tvData.seasons?.length || 0}\n\n`;
        seasonText += `🎯 *Select Season:*\n`;
        
        tvData.seasons.forEach((s, i) => {
          seasonText += `\n${i + 1}. Season ${s.s_no} (${s.episodes?.length || 0} episodes)`;
        });
        
        seasonText += `\n\n──────────────\n💫 *${FOOTER}*`;

        const sentSeason = await conn.sendMessage(from, {
          image: { url: movieDocOn ? (tvData.image || hardThumb) : hardThumb },
          caption: seasonText
        }, { quoted: selectionMsg });

        // Handle season selection
        async function handleEpisodes(chosenSeason, seasonMsg) {
          try {
            let epText = `📺 *${tvData.title}*\n`;
            epText += `🎬 *Season ${chosenSeason.s_no}*\n\n`;
            epText += `🎯 *Select Episode:*\n`;
            epText += `\n0. 🎬 *DOWNLOAD ALL EPISODES*`;
            
            chosenSeason.episodes.forEach((ep, i) => {
              epText += `\n${i + 1}. Episode ${ep.e_no}`;
            });
            
            epText += `\n\n──────────────\n💫 *${FOOTER}*`;

            const sentEp = await conn.sendMessage(from, { 
              text: epText 
            }, { quoted: seasonMsg });

            const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
            if (!epSel) return;

            const epNum = parseInt(epSel.text);

            if (epNum === 0) {
              // Download all episodes
              await conn.sendMessage(from, { 
                react: { text: "⏳", key: epSel.msg.key } 
              });

              // Get quality selection from first episode
              const firstEp = chosenSeason.episodes[0];
              const firstInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(firstEp.link)}&apikey=${API_KEY}`);
              const dlLinks = firstInfoRes.data.data.download;
              
              if (!dlLinks?.length) return;

              let qualityText = `🎬 *${tvData.title}*\n`;
              qualityText += `📺 *Season ${chosenSeason.s_no}*\n`;
              qualityText += `📥 *Select Quality for ALL Episodes:*\n`;
              
              dlLinks.forEach((dl, i) => {
                qualityText += `\n${i + 1}. *${dl.quality}* ${dl.size ? `(${dl.size})` : ''}`;
              });
              
              qualityText += `\n\n──────────────\n💫 *${FOOTER}*`;

              const sentQual = await conn.sendMessage(from, { 
                text: qualityText 
              }, { quoted: epSel.msg });

              const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
              if (!qSel) return;

              const chosenQuality = dlLinks[parseInt(qSel.text) - 1];
              if (!chosenQuality) return;

              await conn.sendMessage(from, { 
                react: { text: "📥", key: qSel.msg.key } 
              });

              await conn.sendMessage(from, {
                text: `⬇️ *Downloading all ${chosenSeason.episodes.length} episodes...*\n\n` +
                      `📺 *${tvData.title}*\n` +
                      `🎬 *Season ${chosenSeason.s_no}*\n` +
                      `💎 *Quality:* ${chosenQuality.quality}\n\n` +
                      `⏳ *Please wait...*\n\n` +
                      `💫 *${FOOTER}*`
              }, { quoted: qSel.msg });

              // Download each episode
              for (const ep of chosenSeason.episodes) {
                try {
                  console.log(`📥 [SHAVIYA-XMD] Episode ${ep.e_no}...`);
                  const epInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(ep.link)}&apikey=${API_KEY}`);
                  const epDlLinks = epInfoRes.data.data.download;
                  const matchedDl = epDlLinks[parseInt(qSel.text) - 1] || epDlLinks[0];
                  
                  if (!matchedDl) continue;

                  const dlResult = await resolveDownloadLink(matchedDl.link, `S${chosenSeason.s_no}E${ep.e_no}`);
                  if (!dlResult) {
                    console.log(`❌ [SHAVIYA-XMD] No link: E${ep.e_no}`);
                    continue;
                  }

                  const thumb = await makeThumbnail(tvData.image || null, hardThumb, movieDocOn);
                  const cleanName = dlResult.fileName 
                    ? dlResult.fileName.replace(/\[Cinesubz\.co\]/gi, '').trim() 
                    : `${tvData.title} S${chosenSeason.s_no}E${ep.e_no} (${matchedDl.quality}).mp4`;
                  
                  const finalFileName = `${FILE_PREFIX} ${cleanName}`;
                  const fileSize = dlResult.fileSize || matchedDl.size || '';
                  const formattedSize = fileSize.toString().includes('MB') ? fileSize : formatFileSize(fileSize);

                  await conn.sendMessage(from, {
                    document: { url: dlResult.url },
                    fileName: finalFileName,
                    mimetype: dlResult.mimetype || 'video/mp4',
                    jpegThumbnail: thumb,
                    caption: `🎬 *${DOC_PREFIX}*\n\n` +
                             `📺 *${tvData.title}*\n` +
                             `🎬 *S${chosenSeason.s_no} E${ep.e_no}*\n` +
                             `💎 *Quality:* ${matchedDl.quality}\n` +
                             `📦 *Size:* ${formattedSize}\n\n` +
                             `──────────────\n` +
                             `💫 *${FOOTER}*`
                  });

                  console.log(`✅ [SHAVIYA-XMD] Sent E${ep.e_no}`);
                  
                } catch (err) {
                  console.log(`❌ [SHAVIYA-XMD] Episode ${ep.e_no} failed:`, err.message);
                }
              }

              await conn.sendMessage(from, {
                text: `✅ *All episodes downloaded successfully!*\n\n` +
                      `📺 *${tvData.title}*\n` +
                      `🎬 *Season ${chosenSeason.s_no}*\n` +
                      `📊 *Total:* ${chosenSeason.episodes.length} episodes\n\n` +
                      `💫 *${FOOTER}*`
              }, { quoted: qSel.msg });

            } else {
              // Download single episode
              const epIdx = epNum - 1;
              const selectedEp = chosenSeason.episodes[epIdx];
              if (!selectedEp) return;

              console.log(`📺 [SHAVIYA-XMD] Single Episode: S${chosenSeason.s_no}E${selectedEp.e_no}`);
              await conn.sendMessage(from, { 
                react: { text: "⏳", key: epSel.msg.key } 
              });

              const epInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(selectedEp.link)}&apikey=${API_KEY}`);
              await handleMovieDownload(
                conn, from, sender,
                epInfoRes.data.data.download,
                `${tvData.title} S${chosenSeason.s_no} E${selectedEp.e_no}`,
                epSel.msg,
                tvData.image || null,
                sessionId
              );
            }
          } catch (err) {
            console.error('Episode handler error:', err);
          }
        }

        const seasonSel = await waitForReply(conn, from, sender, sentSeason.key.id);
        if (!seasonSel) return;

        const sIdx = parseInt(seasonSel.text) - 1;
        const chosenSeason = tvData.seasons[sIdx];
        if (!chosenSeason) return;

        await handleEpisodes(chosenSeason, seasonSel.msg);

      } catch (err) {
        console.error('TV Series handler error:', err);
        await conn.sendMessage(from, { 
          text: `❌ *Error loading TV series*\n${err.message}` 
        });
      }
    }

    // Handle selection
    const selection = await waitForReply(conn, from, sender, sentSearch.key.id);
    if (!selection) return;

    const idx = parseInt(selection.text) - 1;
    const selectedItem = results[idx];
    
    if (!selectedItem) {
      await conn.sendMessage(from, { 
        text: `❌ *Invalid selection!*\n\nPlease select a number between 1 and ${results.length}.` 
      }, { quoted: selection.msg });
      return;
    }

    console.log(`🎬 [SHAVIYA-XMD] Selected: ${selectedItem.title} | Type: ${selectedItem.type}`);
    await conn.sendMessage(from, { 
      react: { text: "⏳", key: selection.msg.key } 
    });

    if (selectedItem.type === "tvshows") {
      await handleTVSeries(selectedItem, selection.msg);
    } else {
      // Movie
      console.log(`🎬 [SHAVIYA-XMD] Fetching movie info: ${selectedItem.link}`);
      const movieInfoRes = await axios.get(`${BASE_URL}/movie/cinesubz-info?url=${encodeURIComponent(selectedItem.link)}&apikey=${API_KEY}`);
      const movieData = movieInfoRes.data.data;
      
      console.log(`🎬 [SHAVIYA-XMD] Movie: ${movieData.title}`);
      
      await handleMovieDownload(
        conn, from, sender,
        movieData.download,
        movieData.title,
        selection.msg,
        movieData.image || null,
        sessionId
      );
    }

  } catch (e) { 
    l(e); 
    reply(`❌ *Error*\n\n${e.message}\n\nPlease try again later.`); 
  }
});

// ═══════════════════════════════════════════════════
//  CONFIGURATION COMMANDS
// ═══════════════════════════════════════════════════

// Set Bot Name / Footer
cmd({
  pattern: "setname",
  alias: ["setbotname", "footer"],
  react: "✏️",
  desc: "Set bot display name",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  if (!q) return reply(`📌 *Current name:* ${getBotName(sessionId)}\n\nUsage: .setname SHAVIYA-XMD`);
  
  const cfg = getSessionConfig(sessionId);
  cfg.botName = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Bot name set to:* ${q.trim()}`);
});

// Set Document Prefix
cmd({
  pattern: "setprefix",
  alias: ["docpre", "setdocpre"],
  react: "🏷️",
  desc: "Set document caption prefix",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  if (!q) return reply(`📌 *Current prefix:* ${getDocPrefix(sessionId)}\n\nUsage: .setprefix SHAVIYA-XMD`);
  
  const cfg = getSessionConfig(sessionId);
  cfg.docPrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Document prefix set to:* ${q.trim()}`);
});

// Set File Name Prefix
cmd({
  pattern: "setfilepre",
  alias: ["filenamepre"],
  react: "📁",
  desc: "Set file name prefix",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  if (!q) return reply(`📌 *Current prefix:* ${getFilePrefix(sessionId)}\n\nUsage: .setfilepre 【SHAVIYA-XMD】`);
  
  const cfg = getSessionConfig(sessionId);
  cfg.filePrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *File prefix set to:* ${q.trim()}`);
});

// Set Thumbnail
cmd({
  pattern: "setthumb",
  alias: ["thumb"],
  react: "🖼️",
  desc: "Set default thumbnail URL",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  if (!q || !q.startsWith("http")) return reply(`📌 *Usage:* .setthumb https://example.com/image.jpg`);
  
  const cfg = getSessionConfig(sessionId);
  cfg.thumbUrl = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Thumbnail URL set!*`);
});

// Toggle Movie Poster Thumbnail
cmd({
  pattern: "moviedoc",
  alias: ["posterthumb"],
  react: "🎬",
  desc: "Toggle movie poster as thumbnail",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  
  const sub = args[0]?.toLowerCase();
  if (!sub || (sub !== 'on' && sub !== 'off')) {
    const current = isMovieDocOn(sessionId) ? '✅ ON' : '❌ OFF';
    return reply(`🎬 *Movie Poster Thumbnail*\n\nCurrent: ${current}\n\nUsage: .moviedoc on/off`);
  }
  
  const cfg = getSessionConfig(sessionId);
  cfg.movieDoc = (sub === 'on');
  saveSessionConfig(sessionId, cfg);
  
  reply(sub === 'on' 
    ? `✅ *Movie poster thumbnail ENABLED*\n\nMovie posters will be used as thumbnails.` 
    : `❌ *Movie poster thumbnail DISABLED*\n\nDefault thumbnail will be used.`);
});

// View Current Settings
cmd({
  pattern: "moviesettings",
  alias: ["moviestatus", "msettings"],
  react: "⚙️",
  desc: "View current movie plugin settings",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ *Owner only command*");
  
  const settings = `⚙️ *SHAVIYA-XMD MOVIE SETTINGS*\n\n` +
                   `📛 *Bot Name:* ${getBotName(sessionId)}\n` +
                   `🏷️ *Doc Prefix:* ${getDocPrefix(sessionId)}\n` +
                   `📁 *File Prefix:* ${getFilePrefix(sessionId)}\n` +
                   `🎬 *Movie Poster Thumb:* ${isMovieDocOn(sessionId) ? '✅ ON' : '❌ OFF'}\n` +
                   `🖼️ *Thumbnail URL:* ${getHardThumbUrl(sessionId).substring(0, 50)}...\n\n` +
                   `📝 *Commands:*\n` +
                   `   .setname <name>\n` +
                   `   .setprefix <prefix>\n` +
                   `   .setfilepre <prefix>\n` +
                   `   .setthumb <url>\n` +
                   `   .moviedoc on/off\n\n` +
                   `💫 *SHAVIYA-XMD*`;
  
  reply(settings);
});
