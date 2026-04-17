/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        FITGIRL PC GAMES DOWNLOADER PLUGIN               ║
 * ║        SHAVIYA-XMD V2 | Crash Delta Team (CDT)          ║
 * ║        Author: Savendra Dampriya (CDT)                   ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 *  Commands:
 *    .fg <game name>        — Search FitGirl Repacks
 *    .fginfo <game name>    — Get full game info + download links
 *    .fglatest             — Latest FitGirl repacks
 *    .fghelp               — Show plugin help
 */

import fetch from 'node-fetch'

// ─── CONFIG ──────────────────────────────────────────────────
const API_BASE = 'https://api-web-shadow-v1.vercel.app/api/pcgame/fitgirl'
const API_KEY  = 'shadow-moviex'
const MAX_RESULTS = 5

// ─── HELPER: fetch wrapper ────────────────────────────────────
async function shadowFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`)
  url.searchParams.set('key', API_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'SHAVIYA-XMD/2.0 (CDT)' },
    timeout: 15000
  })

  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json()
}

// ─── HELPER: format file size ─────────────────────────────────
function fmtSize(str) {
  if (!str) return 'N/A'
  return String(str).trim()
}

// ─── HELPER: trim long text ───────────────────────────────────
function trim(str, max = 300) {
  if (!str) return 'N/A'
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ─── HELPER: build search result card ────────────────────────
function buildSearchCard(games) {
  if (!games || games.length === 0) return '❌ *No results found.*'

  let msg = `🎮 *FITGIRL REPACKS — Search Results*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  games.slice(0, MAX_RESULTS).forEach((g, i) => {
    msg += `*${i + 1}. ${g.title || g.name || 'Unknown'}*\n`
    if (g.genre)      msg += `   📁 Genre   : ${g.genre}\n`
    if (g.size || g.repack_size) msg += `   💾 Size    : ${fmtSize(g.size || g.repack_size)}\n`
    if (g.original_size)         msg += `   📦 Original: ${fmtSize(g.original_size)}\n`
    if (g.date || g.posted)      msg += `   📅 Date    : ${g.date || g.posted}\n`
    if (g.url || g.link)         msg += `   🔗 Link    : ${g.url || g.link}\n`
    msg += `\n`
  })

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `💡 Use *.fginfo <game name>* for download links\n`
  msg += `🤖 *SHAVIYA-XMD V2 | CDT*`
  return msg
}

// ─── HELPER: build full info card ────────────────────────────
function buildInfoCard(g) {
  if (!g) return '❌ *No game data found.*'

  let msg = `🎮 *${g.title || g.name || 'Unknown Game'}*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  if (g.genre)         msg += `📁 *Genre*       : ${g.genre}\n`
  if (g.languages)     msg += `🌐 *Languages*   : ${g.languages}\n`
  if (g.size || g.repack_size) msg += `💾 *Repack Size* : ${fmtSize(g.size || g.repack_size)}\n`
  if (g.original_size) msg += `📦 *Original*    : ${fmtSize(g.original_size)}\n`
  if (g.date || g.posted) msg += `📅 *Posted*      : ${g.date || g.posted}\n`
  if (g.version)       msg += `🔖 *Version*     : ${g.version}\n`
  if (g.company || g.developer) msg += `🏢 *Developer*   : ${g.company || g.developer}\n`

  if (g.description || g.about) {
    msg += `\n📝 *About*\n${trim(g.description || g.about)}\n`
  }

  if (g.repack_features || g.features) {
    const feat = g.repack_features || g.features
    const list = Array.isArray(feat) ? feat.join('\n   • ') : feat
    msg += `\n✅ *Repack Features*\n   • ${list}\n`
  }

  // ─── Download Links ───────────────────────────────────────
  const links = g.download_links || g.links || g.magnet || []

  if (links && (Array.isArray(links) ? links.length > 0 : true)) {
    msg += `\n📥 *Download Links*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`

    if (typeof links === 'string') {
      // single magnet or URL
      msg += `🔗 ${links}\n`
    } else if (Array.isArray(links)) {
      links.forEach((l, i) => {
        if (typeof l === 'string') {
          msg += `   ${i + 1}. ${l}\n`
        } else if (typeof l === 'object') {
          const label = l.name || l.host || l.provider || `Link ${i + 1}`
          const url   = l.url  || l.link  || l.href   || ''
          msg += `   *${i + 1}. ${label}*\n      ${url}\n`
        }
      })
    } else if (typeof links === 'object') {
      // key-value pairs like { "1fichier": "url", "gofile": "url" }
      Object.entries(links).forEach(([host, url], i) => {
        msg += `   *${i + 1}. ${host}*\n      ${url}\n`
      })
    }
  }

  if (g.url || g.link) {
    msg += `\n🌐 *FitGirl Page*\n   ${g.url || g.link}\n`
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `🤖 *SHAVIYA-XMD V2 | CDT*`
  return msg
}

// ─── HELPER: latest repacks card ─────────────────────────────
function buildLatestCard(games) {
  if (!games || games.length === 0) return '❌ *No latest repacks found.*'

  let msg = `🆕 *FITGIRL — Latest Repacks*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  games.slice(0, 8).forEach((g, i) => {
    msg += `*${i + 1}. ${g.title || g.name || 'Unknown'}*\n`
    if (g.size || g.repack_size) msg += `   💾 ${fmtSize(g.size || g.repack_size)}\n`
    if (g.date || g.posted)      msg += `   📅 ${g.date || g.posted}\n`
    if (g.url || g.link)         msg += `   🔗 ${g.url || g.link}\n`
    msg += `\n`
  })

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `💡 Use *.fginfo <name>* for full details\n`
  msg += `🤖 *SHAVIYA-XMD V2 | CDT*`
  return msg
}

// ─── COMMAND: .fg ─────────────────────────────────────────────
handler(
  async (m, { conn, text, args }) => {
    if (!text) return m.reply(
      `❌ *Usage:* .fg <game name>\n` +
      `📌 *Example:* .fg GTA V`
    )

    await m.reply('🔍 *Searching FitGirl Repacks…*')

    try {
      const data = await shadowFetch('search', { query: text.trim() })

      // Normalise response — API may return array or { results: [] } or { data: [] }
      const games = Array.isArray(data)
        ? data
        : (data.results || data.data || data.games || [])

      await conn.sendMessage(m.chat, { text: buildSearchCard(games) }, { quoted: m })
    } catch (e) {
      console.error('[fg] search error:', e.message)
      await m.reply(`❌ *Search failed!*\n${e.message}`)
    }
  },
  {
    command: /^fg$/i,
    description: 'Search FitGirl PC game repacks',
    category: 'downloader',
    usage: '.fg <game name>'
  }
)

// ─── COMMAND: .fginfo ─────────────────────────────────────────
handler(
  async (m, { conn, text }) => {
    if (!text) return m.reply(
      `❌ *Usage:* .fginfo <game name>\n` +
      `📌 *Example:* .fginfo Cyberpunk 2077`
    )

    await m.reply('⚙️ *Fetching game info + download links…*')

    try {
      // Try /info endpoint first, fall back to /search
      let gameData = null

      try {
        const infoRes = await shadowFetch('info', { query: text.trim() })
        gameData = Array.isArray(infoRes)
          ? infoRes[0]
          : (infoRes.result || infoRes.data || infoRes.game || infoRes)
      } catch {
        // fallback to search
        const searchRes = await shadowFetch('search', { query: text.trim() })
        const list = Array.isArray(searchRes)
          ? searchRes
          : (searchRes.results || searchRes.data || [])
        gameData = list[0] || null
      }

      if (!gameData) return m.reply(`❌ *No game found for:* _${text}_`)

      const card = buildInfoCard(gameData)

      // Send thumbnail if available
      const thumb = gameData.image || gameData.thumbnail || gameData.cover || null
      if (thumb) {
        await conn.sendMessage(
          m.chat,
          {
            image: { url: thumb },
            caption: card
          },
          { quoted: m }
        )
      } else {
        await conn.sendMessage(m.chat, { text: card }, { quoted: m })
      }
    } catch (e) {
      console.error('[fginfo] error:', e.message)
      await m.reply(`❌ *Failed to get game info!*\n${e.message}`)
    }
  },
  {
    command: /^fginfo$/i,
    description: 'Get full FitGirl game info with download links',
    category: 'downloader',
    usage: '.fginfo <game name>'
  }
)

// ─── COMMAND: .fglatest ───────────────────────────────────────
handler(
  async (m, { conn }) => {
    await m.reply('📡 *Fetching latest FitGirl repacks…*')

    try {
      const data = await shadowFetch('latest')
      const games = Array.isArray(data)
        ? data
        : (data.results || data.data || data.games || [])

      await conn.sendMessage(m.chat, { text: buildLatestCard(games) }, { quoted: m })
    } catch (e) {
      console.error('[fglatest] error:', e.message)
      await m.reply(`❌ *Failed to fetch latest repacks!*\n${e.message}`)
    }
  },
  {
    command: /^fglatest$/i,
    description: 'Show latest FitGirl repacks',
    category: 'downloader',
    usage: '.fglatest'
  }
)

// ─── COMMAND: .fghelp ─────────────────────────────────────────
handler(
  async (m, { conn }) => {
    const help = `
🎮 *FITGIRL REPACKS — Plugin Help*
━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Commands*

*.fg <game>*
   Search for a PC game on FitGirl Repacks
   _Example: .fg red dead redemption 2_

*.fginfo <game>*
   Full game details + all download links
   _Example: .fginfo elden ring_

*.fglatest*
   Show the latest uploaded repacks

*.fghelp*
   Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━
📦 Powered by *FitGirl Repacks*
🤖 *SHAVIYA-XMD V2 | CDT*
`.trim()

    await conn.sendMessage(m.chat, { text: help }, { quoted: m })
  },
  {
    command: /^fghelp$/i,
    description: 'FitGirl plugin help',
    category: 'downloader',
    usage: '.fghelp'
  }
)
