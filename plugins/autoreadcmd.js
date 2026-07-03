const { cmd } = require("../command");
const { getSetting } = require("../lib/settings");

// ═══════════════════════════════════════════════════════════════
//  Auto Read CMD — marks every incoming command message as read
//  (blue ticks) when the bot is about to process it.
//
//  Setting: autoReadCmd (per-session, MongoDB + file backed via
//  lib/settings.js — same system as every other toggle in the bot).
//  Default: ON.
//
//  Toggle: .set autoreadcmd on / off   (already wired in plugins/settings.js)
//
//  This plugin only adds the missing ACTION — reading the message —
//  the setting itself already existed and already saves correctly.
// ═══════════════════════════════════════════════════════════════

cmd({ on: "body", dontAddCommandList: true },
  async (conn, mek, m, { isCmd, sessionId }) => {
    try {
      if (!isCmd) return;
      if (!mek?.key?.id) return;
      if (mek.key.fromMe) return;

      const enabled = getSetting("autoReadCmd", sessionId || "main");
      // Default ON — only skip if explicitly set to false.
      if (enabled === false || enabled === "false") return;

      await conn.readMessages([mek.key]).catch(() => {});
    } catch (_) {
      // never block the command pipeline
    }
  }
);
