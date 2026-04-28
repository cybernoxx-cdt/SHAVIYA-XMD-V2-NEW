// ============================================================
//  system.js — SHAVIYA-XMD V2
//  Premium System Stats — © Mr Savendra
// ============================================================

const { cmd }     = require('../command');
const { runtime } = require('../lib/functions');
const config      = require('../config');
const os          = require('os');

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:© Mr Savendra;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD'
        }
    }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── CPU load average ──
function getCpuLoad() {
    const load = os.loadavg();
    return `${load[0].toFixed(2)} | ${load[1].toFixed(2)} | ${load[2].toFixed(2)}`;
}

// ── Uptime bar ──
function uptimeBar(seconds) {
    const days  = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins  = Math.floor((seconds % 3600) / 60);
    const secs  = Math.floor(seconds % 60);
    let parts = [];
    if (days)  parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (mins)  parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
}

// ── RAM progress bar ──
function ramBar(used, total) {
    const pct   = Math.round((used / total) * 10);
    const filled = '█'.repeat(pct);
    const empty  = '░'.repeat(10 - pct);
    const percent = ((used / total) * 100).toFixed(1);
    return `${filled}${empty} ${percent}%`;
}

cmd({
    pattern:  'system',
    alias:    ['botinfo', 'sysinfo', 'stats'],
    desc:     'Show bot system statistics',
    category: 'main',
    react:    '📟',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // ── React ──
        await conn.sendMessage(from, {
            react: { text: '📟', key: mek.key }
        });

        await conn.sendPresenceUpdate('composing', from);
        await sleep(700);
        await conn.sendPresenceUpdate('available', from);

        // ── Gather stats ──
        const ramUsed  = process.memoryUsage().heapUsed / 1024 / 1024;
        const ramTotal = os.totalmem() / 1024 / 1024;
        const ramUsedF = ramUsed.toFixed(2);
        const ramTotF  = ramTotal.toFixed(2);
        const bar      = ramBar(ramUsed, ramTotal);
        const uptime   = uptimeBar(process.uptime());
        const rtime    = runtime(process.uptime());
        const host     = os.hostname();
        const platform = os.platform();
        const arch     = os.arch();
        const cpuLoad  = getCpuLoad();
        const cpuModel = os.cpus()[0]?.model?.trim().split(' ').slice(0, 3).join(' ') || 'Unknown';
        const nodeVer  = process.version;
        const mode     = (config.MODE || 'public').toUpperCase();
        const version  = config.BOT_VERSION || '2.0.0';
        const prefix   = config.PREFIX || '.';

        const status =
`*╭─「 📟 Sʜᴀᴠɪʏᴀ Xᴍᴅ SYSTEM INFO 」─*
*│*
*│ 🤖 BOT    :* SHAVIYA-XMD V2
*│ 👤 OWNER  :* Savendra Dampriya
*│ 📟 Version:* ${version}
*│ 🔑 Prefix :* [ ${prefix} ]
*│ 🌐 Mode   :* ${mode}
*│*
*│ ⏱️ Uptime :* ${rtime}
*│*
*│ 💾 RAM Usage:*
*│* ${bar}
*│* ${ramUsedF}MB / ${ramTotF}MB
*│*
*│ 🖥️ Host   :* ${host}
*│ 🧬 OS     :* ${platform} (${arch})
*│ ⚙️ CPU    :* ${cpuModel}
*│ 📊 Load   :* ${cpuLoad}
*│ 🟢 Node   :* ${nodeVer}
*│*
*╰──────────────●●►*
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ Xᴍᴅ`;

        try {
            await conn.sendMessage(from, {
                image: { url: 'https://whiteshadow-uploader.vercel.app/files/iwd6.jpg' },
                caption: status,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '@newsletter',
                        newsletterName: '© Mr Savendra',
                        serverMessageId: 143
                    }
                }
            }, { quoted: FakeVCard });
        } catch (_) {
            await reply(status);
        }

    } catch (e) {
        console.error('[SYSTEM ERROR]', e);
        reply('⚠️ Error: ' + e.message);
    }
});
