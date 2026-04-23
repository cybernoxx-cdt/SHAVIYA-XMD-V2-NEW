/**
 * ╔═══════════════════════════════════════════╗
 * ║       GPLINK BYPASS PLUGIN                ║
 * ║       SHAVIYA-XMD V2 | CDT               ║
 * ╚═══════════════════════════════════════════╝
 */

const axios = require("axios");
const { JSDOM } = require("jsdom");

// ── Helper: Follow redirects and get final URL ──────────────────────────────
async function followRedirects(url, maxRedirects = 15) {
  let current = url;
  let visited = new Set();

  for (let i = 0; i < maxRedirects; i++) {
    if (visited.has(current)) break;
    visited.add(current);

    try {
      const res = await axios.get(current, {
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://www.google.com/",
        },
      });

      // Check for meta refresh or JS redirect in body
      const html = typeof res.data === "string" ? res.data : "";
      if (html) {
        // Meta refresh
        const metaMatch = html.match(
          /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'\s>]+)/i
        );
        if (metaMatch) {
          current = metaMatch[1].replace(/['"]/g, "");
          continue;
        }

        // window.location redirect
        const jsLocMatch = html.match(
          /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i
        );
        if (jsLocMatch) {
          current = jsLocMatch[1];
          continue;
        }

        // GPLink specific: look for final link in page
        const gpMatch = html.match(
          /(?:href|url)\s*[:=]\s*["']?(https?:\/\/(?!gplink)[^\s"'<>]+)["']?/gi
        );
        if (gpMatch) {
          for (const match of gpMatch) {
            const urlMatch = match.match(/(https?:\/\/[^\s"'<>]+)/);
            if (
              urlMatch &&
              !urlMatch[1].includes("gplink") &&
              !urlMatch[1].includes("google.com/recaptcha") &&
              !urlMatch[1].includes("cdn.") &&
              !urlMatch[1].includes("cloudflare")
            ) {
              return { success: true, finalUrl: urlMatch[1], steps: i + 1 };
            }
          }
        }
      }

      // If response is 200 with no further redirect, we're done
      if (res.status === 200 && !res.headers.location) {
        // Try DOM parsing for gplink bypass button
        if (html.includes("gplink") || html.includes("shrink")) {
          const parsed = await parseGplinkPage(html, current);
          if (parsed) return { success: true, finalUrl: parsed, steps: i + 1 };
        }
        return { success: true, finalUrl: current, steps: i + 1 };
      }
    } catch (err) {
      if (err.response && err.response.headers && err.response.headers.location) {
        let next = err.response.headers.location;
        // Handle relative redirects
        if (next.startsWith("/")) {
          const u = new URL(current);
          next = u.origin + next;
        }
        current = next;
        continue;
      }
      break;
    }
  }

  return { success: true, finalUrl: current, steps: maxRedirects };
}

// ── GPLink page parser: extract the real destination link ──────────────────
async function parseGplinkPage(html, pageUrl) {
  try {
    // Method 1: Direct link extraction from gplink bypass patterns
    const patterns = [
      /["']goto["']\s*:\s*["'](https?:\/\/[^"']+)["']/i,
      /data-url=["'](https?:\/\/[^"']+)["']/i,
      /final[_-]?url["']\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i,
      /"url"\s*:\s*"(https?:\/\/[^"]+)"/i,
      /skipAdUrl\s*=\s*["'](https?:\/\/[^"']+)["']/i,
      /var\s+url\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (
        match &&
        match[1] &&
        !match[1].includes("gplink") &&
        !match[1].includes("shrinkme")
      ) {
        return match[1];
      }
    }

    // Method 2: Use API endpoint that gplink exposes
    const domain = new URL(pageUrl).origin;
    const slug = pageUrl.split("/").pop();

    if (slug) {
      try {
        const apiRes = await axios.get(`${domain}/api/url/${slug}`, {
          timeout: 8000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest",
            Referer: pageUrl,
          },
        });
        if (apiRes.data && apiRes.data.url) return apiRes.data.url;
        if (apiRes.data && apiRes.data.dest) return apiRes.data.dest;
      } catch (_) {}
    }

    return null;
  } catch (_) {
    return null;
  }
}

// ── Validate URL ────────────────────────────────────────────────────────────
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// ── Format domain nicely ────────────────────────────────────────────────────
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return url;
  }
}

// ══════════════════════════════════════════════════════════════
//  PLUGIN REGISTRATION
// ══════════════════════════════════════════════════════════════

module.exports = {
  name: "gplink-bypass",
  commands: ["gplink", "bypass"],
  description: "GPLink / Short URL bypass karala final URL eka ganna",
  category: "tools",

  async execute(sock, msg, args, { prefix }) {
    const from = msg.key.remoteJid;
    const reply = (text) =>
      sock.sendMessage(from, { text }, { quoted: msg });

    // ── Input validation ──────────────────────────────────────
    if (!args || args.length === 0) {
      return reply(
        `╔═══════════════════════╗\n` +
        `║   🔗 GPLINK BYPASS    ║\n` +
        `╚═══════════════════════╝\n\n` +
        `*Usage:* ${prefix}gplink <url>\n\n` +
        `*Example:*\n` +
        `${prefix}gplink https://gplink.in/abcd\n` +
        `${prefix}gplink https://shrinkme.io/xyz\n\n` +
        `_Short link ekak denna, mama bypass karala real URL eka denna._`
      );
    }

    const inputUrl = args[0].trim();

    if (!isValidUrl(inputUrl)) {
      return reply(
        `❌ *Invalid URL!*\n\n` +
        `Valid URL ekak denna.\n` +
        `Example: \`https://gplink.in/abc123\``
      );
    }

    // ── Processing message ────────────────────────────────────
    await reply(
      `⏳ *Bypassing...*\n\n` +
      `🔗 Input: \`${inputUrl}\`\n` +
      `_Please wait..._`
    );

    // ── Bypass ────────────────────────────────────────────────
    try {
      const result = await followRedirects(inputUrl);

      const inputDomain = getDomain(inputUrl);
      const outputDomain = getDomain(result.finalUrl);
      const isSame = inputDomain === outputDomain;

      if (result.success && result.finalUrl && !isSame) {
        return reply(
          `╔══════════════════════════╗\n` +
          `║  ✅ BYPASS SUCCESS!      ║\n` +
          `╚══════════════════════════╝\n\n` +
          `🔗 *Original URL:*\n${inputUrl}\n\n` +
          `✨ *Final URL:*\n${result.finalUrl}\n\n` +
          `📡 *Redirects followed:* ${result.steps}\n` +
          `🌐 *Destination:* ${outputDomain}\n\n` +
          `_🔰 SHAVIYA-XMD V2 | CDT_`
        );
      } else if (isSame) {
        return reply(
          `⚠️ *Bypass Result*\n\n` +
          `🔗 *Original:*\n${inputUrl}\n\n` +
          `🔁 *Result:* ${result.finalUrl}\n\n` +
          `_Redirect detect karanna bari una. Manually check karanna._\n\n` +
          `_🔰 SHAVIYA-XMD V2 | CDT_`
        );
      } else {
        return reply(
          `❌ *Bypass Failed*\n\n` +
          `Link eka bypass karanna bari una.\n` +
          `CAPTCHA or bot-protection ena link ekak wenna puluwan.\n\n` +
          `_🔰 SHAVIYA-XMD V2 | CDT_`
        );
      }
    } catch (err) {
      console.error("[GPLink Bypass Error]", err.message);
      return reply(
        `❌ *Error occurred!*\n\n` +
        `\`${err.message}\`\n\n` +
        `Link eka valid da kiyala check karanna.\n\n` +
        `_🔰 SHAVIYA-XMD V2 | CDT_`
      );
    }
  },
};
