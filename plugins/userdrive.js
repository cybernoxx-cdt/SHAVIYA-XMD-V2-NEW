const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ═══════════════════════════════════════════════════
//  Session Config Helpers
// ═══════════════════════════════════════════════════
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}
function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
}
function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://files.catbox.moe/f18ceb.jpg";
}
function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

// ═══════════════════════════════════════════════════
//  React helper
// ═══════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
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
  try { return await fetchThumb(primaryUrl); }
  catch (e) {
    if (primaryUrl !== fallbackUrl) { try { return await fetchThumb(fallbackUrl); } catch {} }
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Wait for reply
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, replyToId, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text;
      if (msg.key.remoteJid === from && ctx?.stanzaId === replyToId) {
        conn.ev.off("messages.upsert", handler);
        resolve({ msg, text });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => { conn.ev.off("messages.upsert", handler); reject(new Error("Timeout")); }, timeout);
  });
}

// ═══════════════════════════════════════════════════
//  UsersDrive Scraper — Puppeteer
//  Flow:
//    1. Page load → Cloudflare countdown wait
//    2. "Create Download Link" button click
//    3. Direct CDN link intercept / scrape
// ═══════════════════════════════════════════════════
async function getUsersDriveLink(pageUrl) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();
    let directUrl = null;

    // realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // extra headers — Cloudflare bypass help
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    // Request interception — CDN direct link catch
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      // userdrive.org CDN links — must have /d/<longtoken>/ pattern
      // exclude css, js, img, font files
      const isCDN = (url.includes("userdrive.org") || url.includes("userdrive.net")) && url.includes("/d/");
      const isMedia = !url.match(/\.(css|js|png|jpg|gif|ico|woff|svg|html)(\?|$)/i);
      if (isCDN && isMedia && !directUrl) {
        directUrl = url;
        console.log("🎯 CDN intercepted:", url.substring(0, 80));
      }
      req.continue();
    });

    // Step 1: Page load
    console.log("📄 Loading:", pageUrl);
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 40000 });

    // Step 2: Cloudflare countdown wait — max 15s
    // countdown number ශූන්‍ය වෙනකම් හෝ "Create Download Link" button දිස්වෙනකම් wait
    console.log("⏳ Waiting for Cloudflare countdown...");
    try {
      await page.waitForFunction(
        () => {
          // countdown number
          const circle = document.querySelector('.countdown, #countdown, [class*="count"]');
          if (circle && parseInt(circle.textContent) <= 0) return true;
          // Create Download Link button
          const btn = document.querySelector('a[href*="create"], button, .btn-download, a.create-link');
          if (btn && btn.offsetParent !== null) return true;
          // btn-download already present (HTML already had direct link)
          const dlBtn = document.querySelector('a.btn-download, a.btn.btn-download');
          if (dlBtn) return true;
          return false;
        },
        { timeout: 20000, polling: 500 }
      );
    } catch {
      console.log("⚠️ Countdown wait timeout, continuing...");
    }

    // Short pause after countdown
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Check if direct link already in page (HTML version — no JS needed)
    if (!directUrl) {
      const dlHref = await page.$eval('a.btn-download', el => el.href).catch(() => null);
      if (dlHref && dlHref.includes("userdrive")) {
        directUrl = dlHref.trim();
        console.log("✅ Direct btn-download link:", directUrl.substring(0, 80));
      }
    }

    // Step 4: Click "Create Download Link" button
    if (!directUrl) {
      console.log("🖱️ Clicking Create Download Link...");
      try {
        // possible selectors for the create link button
        const btnSelectors = [
          'a.create-link',
          'a[href*="create"]',
          'button.btn-create',
          '.btn-download-create',
          'a:contains("Create Download Link")',
          'a.btn.btn-primary',
        ];

        let clicked = false;
        for (const sel of btnSelectors) {
          try {
            await page.waitForSelector(sel, { timeout: 3000, visible: true });
            await page.click(sel);
            clicked = true;
            console.log("✅ Clicked:", sel);
            break;
          } catch {}
        }

        // locator fallback — text match (puppeteer v24 compatible)
        if (!clicked) {
          try {
            await page.locator('a, button').filter(el =>
              el.textContent?.includes("Create Download Link") || el.textContent?.includes("Create")
            ).click();
            clicked = true;
            console.log("✅ Clicked via locator text match");
          } catch {}
        }

        if (clicked) {
          // wait for navigation or new element
          await Promise.race([
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
            page.waitForSelector('a.btn-download', { timeout: 15000 }),
            new Promise(r => setTimeout(r, 8000)),
          ]).catch(() => {});

          // re-check direct link after click
          if (!directUrl) {
            const dlHref2 = await page.$eval('a.btn-download', el => el.href).catch(() => null);
            if (dlHref2 && dlHref2.includes("userdrive")) {
              directUrl = dlHref2.trim();
              console.log("✅ Post-click btn link:", directUrl.substring(0, 80));
            }
          }
        }
      } catch (e) {
        console.log("⚠️ Click error:", e.message);
      }
    }

    // Step 5: Full page HTML scan — last resort
    if (!directUrl) {
      console.log("🔍 Full HTML scan...");
      const html = await page.content();
      // Only match actual CDN download paths — /d/<longtoken>/filename
      // NOT css/js/img files
      const m = html.match(/https?:\/\/[a-z0-9]+\.userdrive\.org[^"'\s<>]*\/d\/[a-z0-9]{20,}[^"'\s<>]*/i)
        || html.match(/https?:\/\/[a-z0-9]+\.userdrive\.net[^"'\s<>]*\/d\/[a-z0-9]{20,}[^"'\s<>]*/i)
        || html.match(/href=["']\s*(https?:\/\/[^"'\s]+\/d\/[a-z0-9]{20,}[^"'\s]*)["']/i);
      if (m) {
        directUrl = (m[1] || m[0]).trim();
        console.log("✅ HTML scan found:", directUrl.substring(0, 80));
      }
    }

    await browser.close();
    browser = null;

    if (!directUrl) throw new Error("Could not extract direct download link");
    return directUrl;

  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    throw e;
  }
}

// ═══════════════════════════════════════════════════
//  USERSDRIVE COMMAND  →  .ud <url>
// ═══════════════════════════════════════════════════
cmd({
  pattern: "ud",
  alias: ["usersdrive", "udrive"],
  desc: "UsersDrive direct link extract & download",
  category: "downloader",
  react: "☁️",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sessionId }) => {
  try {
    if (!q || !q.includes("usersdrive.com")) 
      return reply("❗ UsersDrive link එකක් දෙන්න.\nExample: `.ud https://usersdrive.com/6b8n3xn3fe1u.html`");

    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    await react(conn, from, mek.key, "⏳");
    await conn.sendMessage(from, { text: "🤖 UsersDrive link resolve කරනවා..." }, { quoted: mek });

    console.log("🤖 Resolving:", q.trim());
    const directUrl = await getUsersDriveLink(q.trim());

    const thumb = await makeThumbnail(null, hardThumb, false);

    const docMsg = await conn.sendMessage(from, {
      document: { url: directUrl },
      fileName: directUrl.split('/').pop().split('?')[0] || "download.mp4",
      mimetype: "video/mp4",
      jpegThumbnail: thumb || undefined,
      caption: `✅ *UsersDrive Download*\n\n${FOOTER}`
    }, { quoted: mek });

    await react(conn, from, docMsg.key, "✅");

  } catch (e) {
    console.log("🔥 ud error:", e.message);
    await react(conn, from, mek.key, "❌");
    reply("❌ Error: " + e.message);
  }
});
