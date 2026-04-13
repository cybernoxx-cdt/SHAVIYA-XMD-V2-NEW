// ============================================
//   HIDETAG + FORWARD PLUGIN
//   CDT - Crash Delta Team
//   Compatible: Baileys / gifted-baileys
// ============================================

const config = require('../config');

const handler = async (m, { conn, args, usedPrefix, command }) => {

    // ── Permission check ──────────────────────────────────────
    const isOwner =
        [conn.decodeJid(conn.user.id), ...config.owner].includes(m.sender);
    const isSudo  = (config.sudo  || []).includes(m.sender);
    const isAdmin = m.isGroup
        ? (await conn.groupMetadata(m.chat).catch(() => ({ participants: [] })))
              .participants
              .find(p => conn.decodeJid(p.id) === m.sender)
              ?.admin != null
        : false;

    if (!isOwner && !isSudo && !isAdmin) {
        return m.reply(`❌ *Permission Denied!*\nOnly admins/sudo/owner can use this command.`);
    }

    if (!m.isGroup) {
        return m.reply(`❌ This command only works in *groups*!`);
    }

    // ── Get group members ─────────────────────────────────────
    const groupMeta   = await conn.groupMetadata(m.chat);
    const participants = groupMeta.participants.map(p => p.id);

    if (participants.length === 0) {
        return m.reply(`❌ Could not fetch group members.`);
    }

    // ── Build the message text ────────────────────────────────
    const text = args.join(' ') || (m.quoted ? m.quoted.text : '');

    if (!text && !m.quoted) {
        return m.reply(
            `❓ *Usage:*\n` +
            `\`${usedPrefix}${command} <message>\`\n` +
            `or reply to a message with \`${usedPrefix}${command}\``
        );
    }

    // ── Hidden @mentions (hidetag) ────────────────────────────
    const mentions = participants;

    // Build invisible mention string (zero-width spaces between @tags)
    const hiddenMentions = participants.map(() => '@\u200b').join('');

    const broadcastText = text
        ? `${text}\n\n${hiddenMentions}`
        : hiddenMentions;

    // ── Send to GROUP (hidetag broadcast) ─────────────────────
    await conn.sendMessage(
        m.chat,
        {
            text: broadcastText,
            mentions: mentions,
        },
        { quoted: m }
    );

    // ── Forward / send to each member's INBOX ─────────────────
    if (
        command === 'hidetaginbox' ||
        command === 'tagallinbox'  ||
        command === 'fwdinbox'     ||
        command === 'forwardinbox'
    ) {
        let sent = 0, failed = 0;

        for (const jid of participants) {
            // Skip bots / self
            if (jid === conn.decodeJid(conn.user.id)) continue;

            try {
                await conn.sendMessage(jid, {
                    text: text || '📢 Group announcement',
                    mentions: [jid],
                });
                sent++;
                // Small delay to avoid rate-limit
                await delay(400);
            } catch {
                failed++;
            }
        }

        await conn.sendMessage(
            m.chat,
            {
                text:
                    `✅ *Inbox Forward Complete!*\n` +
                    `📤 Sent   : ${sent}\n` +
                    `❌ Failed : ${failed}`,
            },
            { quoted: m }
        );
    }
};

// ── Helper ────────────────────────────────────────────────────
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ── Command registration ──────────────────────────────────────
handler.command = [
    // Group hidetag only
    'hidetag',
    'tagall',
    'everyone',
    'alltag',
    'mentionall',
    'tagmembers',
    'tageveryone',
    'hitetag',      // common typo alias

    // Group hidetag + forward to inbox
    'hidetaginbox',
    'tagallinbox',
    'fwdinbox',
    'forwardinbox',
    'inboxtag',
    'sendinbox',
];

handler.help    = ['hidetag <text>', 'tagall <text>', 'hidetaginbox <text>'];
handler.tags    = ['group', 'admin'];
handler.group   = true;   // group only
handler.admin   = false;  // checked manually above (owner/sudo also allowed)

module.exports = handler;

/*
══════════════════════════════════════════
  📋 COMMAND LIST
══════════════════════════════════════════

  ── Hidetag (group broadcast only) ──
  .hidetag      → Tag all members silently in group
  .tagall       → Alias
  .everyone     → Alias
  .alltag       → Alias
  .mentionall   → Alias
  .tagmembers   → Alias
  .tageveryone  → Alias
  .hitetag      → Typo-friendly alias

  ── Hidetag + Forward to each DM inbox ──
  .hidetaginbox → Tag in group + DM every member
  .tagallinbox  → Alias
  .fwdinbox     → Alias
  .forwardinbox → Alias
  .inboxtag     → Alias
  .sendinbox    → Alias

  ── Usage ──
  .tagall Hello everyone!
  .hidetaginbox Important announcement!
  (or reply to any message with the command)

══════════════════════════════════════════
*/
