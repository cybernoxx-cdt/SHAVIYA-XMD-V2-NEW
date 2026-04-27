// ============================================================
//  readmore.js — SHAVIYA-XMD V2
//  .readmore <your text>
//  WhatsApp "Read More" collapsed message generator
//  CDT — Crash Delta Team
// ============================================================

const { cmd } = require("../command");

// ── The magic: U+200B (Zero Width Space) x2001 fills the
//    WhatsApp preview buffer so the rest collapses behind
//    a "Read More" tap — works on Android & iOS ──
const ZWSP  = "\u200B";
const FILL  = ZWSP.repeat(2001);   // buffer filler
const TITLE_FONT = (t) =>
  [...t].map(c => {
    const code = c.codePointAt(0);
    if (code >= 65 && code <= 90)  return String.fromCodePoint(code + 0x1D5D3); // A-Z → 𝗔
    if (code >= 97 && code <= 122) return String.fromCodePoint(code + 0x1D5CD); // a-z → 𝗮
    if (code >= 48 && code <= 57)  return String.fromCodePoint(code + 0x1D7CE); // 0-9 → 𝟎
    return c;
  }).join("");

cmd({
  pattern: "readmore",
  alias:   ["rm", "readm"],
  desc:    "WhatsApp Read More message generator",
  category:"tools",
  react:   "📖",
  filename: __filename,

  async function(conn, mek, m, { from, q, reply, sender }) {
    // ── Input validation ──
    if (!q || q.trim().length === 0) {
      return reply(
`📖 *𝗥𝗘𝗔𝗗 𝗠𝗢𝗥𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥*

❌ Text ekak denna!

*Usage:*
\`.readmore <your text>\`

*Example:*
\`.readmore This is my secret message that will be hidden!\`

_WhatsApp wala "Read More" button ekak generate wenawa_ 👇`
      );
    }

    const text = q.trim();

    // ── Split on user-provided separator || auto-split at 80 chars ──
    let previewPart = "";
    let hiddenPart  = "";

    const SEP = "|||";
    if (text.includes(SEP)) {
      // Manual split: .readmore visible text ||| hidden text
      const idx   = text.indexOf(SEP);
      previewPart = text.slice(0, idx).trim();
      hiddenPart  = text.slice(idx + SEP.length).trim();
    } else {
      // Auto-split: first line visible, rest hidden (or 80-char split)
      const lines = text.split(/\r?\n/);
      if (lines.length > 1) {
        previewPart = lines[0].trim();
        hiddenPart  = lines.slice(1).join("\n").trim();
      } else if (text.length > 80) {
        previewPart = text.slice(0, 80).trim();
        hiddenPart  = text.slice(80).trim();
      } else {
        // Short single line — put decorative hidden block
        previewPart = text;
        hiddenPart  = "✨ Tap Read More to see the full message!";
      }
    }

    // ── Build the Read More message ──
    const readMoreMsg =
`${previewPart}
${FILL}
${hiddenPart}`;

    try {
      await conn.sendMessage(from, { text: readMoreMsg }, { quoted: mek });
    } catch (e) {
      return reply("❌ Read More message send karana gaman error una: " + e.message);
    }

    // ── Usage tip (sent separately so it doesn't break the effect) ──
    await new Promise(r => setTimeout(r, 1000));
    await reply(
`✅ *Read More message sent!*

_Tap the message above to see the hidden part_ 👆

💡 *Tip:* Manual split karanna \`|||\` use karanna:
\`.readmore visible part ||| hidden part\``
    );
  }
});
