// ============================================================
//  readmore.js — SHAVIYA-XMD V2
//  .readmore <text>  →  WhatsApp "Read More" collapsed message
//  CDT — Crash Delta Team
// ============================================================

const { cmd } = require('../command');

// ── Zero Width Space trick ──
// 2001x U+200B fills WhatsApp's preview buffer so the rest
// of the message collapses behind a "Read More" tap button.
// Works on Android & iOS WhatsApp.
const ZWSP = '\u200B';
const FILL = ZWSP.repeat(2001);

const FakeVCard = {
    key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast'
    },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

cmd({
    pattern: 'readmore',
    alias: ['rm', 'readm', 'rmore'],
    desc: 'WhatsApp Read More hidden message generator',
    category: 'tools',
    react: '📖',
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender }) => {
    try {

        // ── React first ──
        await conn.sendMessage(from, {
            react: { text: '📖', key: mek.key }
        });

        // ── No input check ──
        if (!q || !q.trim()) {
            return conn.sendMessage(from, {
                text:
`📖 *𝗥𝗘𝗔𝗗𝗠𝗢𝗥𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥* — SHAVIYA-XMD V2

❌ *Text ekak denna oni!*

✦ ──────────────────── ✦

*🔹 Auto Split (first line visible):*
\`.readmore Your visible text here\`

*🔹 Multi-line (first line visible, rest hidden):*
\`.readmore First line\`
\`Second line hidden\`
\`More hidden text...\`

*🔹 Manual Split with |||:*
\`.readmore Visible part ||| Hidden part goes here\`

✦ ──────────────────── ✦
> 💎 *Powered by CDT — Sʜᴀᴠɪʏᴀ Xᴍᴅ*`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@newsletter',
                        newsletterName: '💎 SHAVIYA-XMD V2',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        }

        const text = q.trim();
        let previewPart = '';
        let hiddenPart  = '';

        const SEP = '|||';

        if (text.includes(SEP)) {
            // ── Manual split mode: .readmore visible ||| hidden ──
            const idx   = text.indexOf(SEP);
            previewPart = text.slice(0, idx).trim();
            hiddenPart  = text.slice(idx + SEP.length).trim();
        } else {
            const lines = text.split(/\r?\n/);
            if (lines.length > 1) {
                // ── Multi-line: first line visible, rest hidden ──
                previewPart = lines[0].trim();
                hiddenPart  = lines.slice(1).join('\n').trim();
            } else if (text.length > 80) {
                // ── Long single-line: split at 80 chars ──
                previewPart = text.slice(0, 80).trim();
                hiddenPart  = text.slice(80).trim();
            } else {
                // ── Short text: show all, add branded hidden block ──
                previewPart = text;
                hiddenPart  =
`✦ ──────────────────── ✦
💎 *Sʜᴀᴠɪʏᴀ Xᴍᴅ 𝗩𝟮*
⊹ Powered by Shaviya
✦ ──────────────────── ✦`;
            }
        }

        // ── Build Read More message ──
        const readMoreMsg = `${previewPart}\n${FILL}\n${hiddenPart}`;

        // ── Send the Read More message ──
        await conn.sendMessage(from, {
            text: readMoreMsg,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '@newsletter',
                    newsletterName: '💎 SHAVIYA-XMD V2',
                    serverMessageId: 143
                }
            }
        }, { quoted: FakeVCard });

    } catch (e) {
        console.error('[READMORE ERROR]', e);
        reply('❌ Read More error: ' + e.message);
    }
});
