/**
 * ╔══════════════════════════════════════════════╗
 * ║   FITGIRL PC GAMES DOWNLOADER PLUGIN        ║
 * ║   SHAVIYA-XMD V2 | Crash Delta Team (CDT)  ║
 * ║   Author: Savendra Dampriya (CDT)           ║
 * ╚══════════════════════════════════════════════╝
 *
 *  .fg <game>      — Search FitGirl Repacks
 *  .fginfo <game>  — Full info + download links
 *  .fglatest       — Latest uploaded repacks
 *  .fghelp         — Plugin help menu
 */

const { cmd } = require('../command');
const axios   = require('axios');

// ─── CONFIG ──────────────────────────────────────
const API_BASE = 'https://api-web-shadow-v1.vercel.app/api/pcgame/fitgirl';
const API_KEY  = 'shadow-moviex';
const FOOTER   = '🤖 *SHAVIYA-XMD V2 | CDT*';
const THUMB    = 'https://files.catbox.moe/f18ceb.jpg';
const MAX_SEARCH = 5;
const MAX_LATEST = 8;

// ─── HELPER: call the Shadow API ─────────────────
async function shadowAPI(endpoint, params = {}) {
    const url = new URL(`${API_BASE}/${endpoint}`);
    url.searchParams.set('key', API_KEY);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    const res = await axios.get(url.toString(), {
        headers: { 'User-Agent': 'SHAVIYA-XMD/2.0 (CDT)' },
        timeout: 20000
    });

    return res.data;
}

// ─── HELPER: normalise array from any response shape ─
function toArray(data) {
    if (Array.isArray(data)) return data;
    return data?.results || data?.data || data?.games || data?.items || [];
}

// ─── HELPER: format repack size ──────────────────
function sz(g) {
    return g?.size || g?.repack_size || g?.filesize || 'N/A';
}

// ─── HELPER: trim long text ───────────────────────
function trim(str, max = 280) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── HELPER: build search result message ─────────
function buildSearch(games) {
    if (!games?.length) return '❌ *No results found.*';

    let msg = `🎮 *FITGIRL REPACKS — Search Results*\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    games.slice(0, MAX_SEARCH).forEach((g, i) => {
        const title = g.title || g.name || 'Unknown';
        msg += `*${i + 1}. ${title}*\n`;
        if (g.genre)            msg += `   📁 Genre   : ${g.genre}\n`;
        if (sz(g) !== 'N/A')    msg += `   💾 Size    : ${sz(g)}\n`;
        if (g.original_size)    msg += `   📦 Original: ${g.original_size}\n`;
        if (g.date || g.posted) msg += `   📅 Date    : ${g.date || g.posted}\n`;
        if (g.url  || g.link)   msg += `   🔗 ${g.url || g.link}\n`;
        msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 Use *.fginfo <game name>* for full details + links\n`;
    msg += FOOTER;
    return msg;
}

// ─── HELPER: render download links (any format) ──
function renderLinks(links) {
    if (!links) return '';
    let out = `\n📥 *Download Links*\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (typeof links === 'string') {
        out += `🔗 ${links}\n`;
    } else if (Array.isArray(links)) {
        links.forEach((l, i) => {
            if (typeof l === 'string') {
                out += `   ${i + 1}. ${l}\n`;
            } else {
                const label = l.name || l.host || l.provider || `Link ${i + 1}`;
                const href  = l.url  || l.link  || l.href   || '';
                out += `   *${i + 1}. ${label}*\n      ${href}\n`;
            }
        });
    } else if (typeof links === 'object') {
        // { "1fichier": "url", "gofile": "url", ... }
        Object.entries(links).forEach(([host, href], i) => {
            out += `   *${i + 1}. ${host}*\n      ${href}\n`;
        });
    }

    return out;
}

// ─── HELPER: build full info card ────────────────
function buildInfo(g) {
    if (!g) return '❌ *No game data found.*';

    let msg = `🎮 *${g.title || g.name || 'Unknown Game'}*\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (g.genre)                     msg += `📁 *Genre*       : ${g.genre}\n`;
    if (g.languages)                 msg += `🌐 *Languages*   : ${g.languages}\n`;
    if (sz(g) !== 'N/A')             msg += `💾 *Repack Size* : ${sz(g)}\n`;
    if (g.original_size)             msg += `📦 *Original*    : ${g.original_size}\n`;
    if (g.date || g.posted)          msg += `📅 *Posted*      : ${g.date || g.posted}\n`;
    if (g.version)                   msg += `🔖 *Version*     : ${g.version}\n`;
    if (g.company || g.developer)    msg += `🏢 *Developer*   : ${g.company || g.developer}\n`;

    const desc = g.description || g.about;
    if (desc) msg += `\n📝 *About*\n${trim(desc)}\n`;

    const feat = g.repack_features || g.features;
    if (feat) {
        const list = Array.isArray(feat) ? feat.map(f => `• ${f}`).join('\n') : feat;
        msg += `\n✅ *Repack Features*\n${list}\n`;
    }

    const links = g.download_links || g.links || g.magnet || null;
    if (links) msg += renderLinks(links);

    if (g.url || g.link) msg += `\n🌐 *FitGirl Page*\n   ${g.url || g.link}\n`;

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += FOOTER;
    return msg;
}

// ─── HELPER: build latest repacks card ───────────
function buildLatest(games) {
    if (!games?.length) return '❌ *No latest repacks found.*';

    let msg = `🆕 *FITGIRL — Latest Repacks*\n`;
    msg    += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    games.slice(0, MAX_LATEST).forEach((g, i) => {
        msg += `*${i + 1}. ${g.title || g.name || 'Unknown'}*\n`;
        if (sz(g) !== 'N/A')    msg += `   💾 ${sz(g)}\n`;
        if (g.date || g.posted) msg += `   📅 ${g.date || g.posted}\n`;
        if (g.url  || g.link)   msg += `   🔗 ${g.url || g.link}\n`;
        msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 Use *.fginfo <game name>* for download links\n`;
    msg += FOOTER;
    return msg;
}

// ═══════════════════════════════════════════════════
//  CMD 1 — .fg  (Search)
// ═══════════════════════════════════════════════════
cmd({
    pattern:   'fg',
    alias:     ['fitgirl', 'pcgame', 'pcgames'],
    react:     '🎮',
    desc:      'Search FitGirl PC game repacks',
    category:  'downloader',
    filename:  __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `❌ *Usage:* .fg <game name>\n` +
            `📌 *Example:* .fg GTA V`
        );

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
        await reply('🔍 *Searching FitGirl Repacks…*');

        const data  = await shadowAPI('search', { query: q.trim() });
        const games = toArray(data);

        console.log(`[fg] search "${q}" → ${games.length} results`);
        await conn.sendMessage(from, { text: buildSearch(games) }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[fg] error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Search failed!*\n_${e.message}_`);
    }
});

// ═══════════════════════════════════════════════════
//  CMD 2 — .fginfo  (Full info + download links)
// ═══════════════════════════════════════════════════
cmd({
    pattern:   'fginfo',
    alias:     ['fgget', 'fgdown', 'pcinfo'],
    react:     '⚙️',
    desc:      'Full FitGirl game info with download links',
    category:  'downloader',
    filename:  __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(
            `❌ *Usage:* .fginfo <game name>\n` +
            `📌 *Example:* .fginfo Cyberpunk 2077`
        );

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply('⚙️ *Fetching game info + download links…*');

        let gameData = null;

        // Try /info endpoint first
        try {
            const infoRes = await shadowAPI('info', { query: q.trim() });
            gameData = Array.isArray(infoRes)
                ? infoRes[0]
                : (infoRes?.result || infoRes?.data || infoRes?.game || infoRes);
        } catch {
            // fallback → search and take first result
            const searchRes = await shadowAPI('search', { query: q.trim() });
            const list = toArray(searchRes);
            gameData = list[0] || null;
        }

        if (!gameData) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No game found for:* _${q}_`);
        }

        console.log(`[fginfo] found: ${gameData.title || gameData.name}`);

        const card  = buildInfo(gameData);
        const thumb = gameData.image || gameData.thumbnail || gameData.cover || THUMB;

        // Try to send with thumbnail image
        try {
            await conn.sendMessage(
                from,
                { image: { url: thumb }, caption: card },
                { quoted: mek }
            );
        } catch {
            // Image failed — send as text
            await conn.sendMessage(from, { text: card }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[fginfo] error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Failed to get game info!*\n_${e.message}_`);
    }
});

// ═══════════════════════════════════════════════════
//  CMD 3 — .fglatest  (Latest repacks)
// ═══════════════════════════════════════════════════
cmd({
    pattern:   'fglatest',
    alias:     ['fgnew', 'pclatest'],
    react:     '🆕',
    desc:      'Show latest FitGirl repacks',
    category:  'downloader',
    filename:  __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: '📡', key: mek.key } });
        await reply('📡 *Fetching latest FitGirl repacks…*');

        const data  = await shadowAPI('latest');
        const games = toArray(data);

        console.log(`[fglatest] → ${games.length} repacks`);
        await conn.sendMessage(from, { text: buildLatest(games) }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[fglatest] error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Failed to fetch latest repacks!*\n_${e.message}_`);
    }
});

// ═══════════════════════════════════════════════════
//  CMD 4 — .fghelp  (Help menu)
// ═══════════════════════════════════════════════════
cmd({
    pattern:   'fghelp',
    alias:     ['pchelp'],
    react:     '📖',
    desc:      'FitGirl plugin help menu',
    category:  'downloader',
    filename:  __filename
},
async (conn, mek, m, { from }) => {
    const help = `
🎮 *FITGIRL REPACKS — Plugin Help*
━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Commands*

🔍 *.fg <game>*
   Search FitGirl Repacks by game name
   _Example: .fg red dead redemption 2_

⚙️ *.fginfo <game>*
   Full game details + all download links
   _Example: .fginfo elden ring_

🆕 *.fglatest*
   Show the latest uploaded repacks

📖 *.fghelp*
   Show this help menu

━━━━━━━━━━━━━━━━━━━━━━━━
📦 Powered by *FitGirl Repacks*
🌐 API by *Shadow API (CDT)*
━━━━━━━━━━━━━━━━━━━━━━━━
${FOOTER}`.trim();

    await conn.sendMessage(from, { text: help }, { quoted: mek });
});
