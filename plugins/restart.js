// ================= SHAVIYA-XMD V2 — Restart Plugin =================
// Plugin  : restart.js
// Author  : SHAVIYA TECH
// Desc    : Owner-only bot restart — preserves all settings on restart
// ==================================================================

const { cmd } = require("../command");

if (!global._botStartTime) global._botStartTime = Date.now();

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

cmd({
  pattern:  "restart",
  alias:    ["reboot", "rst"],
  category: "owner",
  desc:     "Restart the bot (owner only)",
  react:    "🔄",
}, async function(conn, mek, m, { from, isOwner, senderNumber, sessionId }) {

  if (!isOwner) {
    return conn.sendMessage(from, {
      text: [
        "╔══════════════════════╗",
        "║   ⛔  ACCESS DENIED  ║",
        "╚══════════════════════╝",
        "",
        "This command is restricted to the *bot owner* only.",
      ].join("\n")
    }, { quoted: mek });
  }

  const uptime = formatUptime(Date.now() - global._botStartTime);

  await conn.sendMessage(from, {
    text: [
      "╔════════════════════════════╗",
      "║  🔄  *SHAVIYA-XMD V2 RESTART* ║",
      "╚════════════════════════════╝",
      "",
      `📌 *Session :* ${sessionId}`,
      `⏱️ *Uptime  :* ${uptime}`,
      `👤 *By      :* @${senderNumber}`,
      "",
      "⚡ Bot is restarting...",
      "✅ Back online in a few seconds!",
      "",
      "_All settings will be preserved_ ✅",
    ].join("\n"),
    mentions: [`${senderNumber}@s.whatsapp.net`],
  }, { quoted: mek });

  if (typeof global.setRestartFlag === "function") {
    global.setRestartFlag();
  }

  setTimeout(() => process.exit(0), 2500);
});
