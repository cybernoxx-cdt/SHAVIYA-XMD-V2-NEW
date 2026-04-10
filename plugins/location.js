// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHAVIYA-XMD V2 | location.js
// CMD: .location <place name>
// Uses OpenStreetMap Nominatim — free, no API key
// Also handles incoming WhatsApp location messages
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use strict';

const { cmd }  = require('../command');
const axios    = require('axios');

cmd({
  pattern:  'location',
  alias:    ['loc', 'maps', 'findlocation', 'getlocation'],
  react:    '📍',
  desc:     'Search location and get Google Maps link + pin',
  category: 'tools',
  use:      '<place name>',
  filename: __filename,
}, async (conn, mek, m, { q, reply, from }) => {

  // ── Handle user sending their own WhatsApp location ──────────────
  const msg = mek.message;
  const locMsg = msg && (msg.liveLocationMessage || msg.locationMessage);
  if (locMsg) {
    const lat  = locMsg.degreesLatitude;
    const lon  = locMsg.degreesLongitude;
    const name = locMsg.name    || 'Your Location';
    const addr = locMsg.address || '';
    const gmaps = `https://maps.google.com/?q=${lat},${lon}`;

    return conn.sendMessage(from, {
      text:
        `╔══════════════════════════╗\n` +
        `║  📍 *SHAVIYA-XMD | LOCATION*  ║\n` +
        `╚══════════════════════════╝\n\n` +
        `📌 *Name:*       ${name}\n` +
        `🏠 *Address:*    ${addr || 'N/A'}\n` +
        `🌐 *Latitude:*   ${lat}\n` +
        `🌐 *Longitude:*  ${lon}\n\n` +
        `🔗 *Google Maps:*\n${gmaps}\n\n` +
        `> 🤖 Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`
    }, { quoted: mek });
  }

  // ── Search by text query ──────────────────────────────────────────
  const query = q ? q.trim() : '';

  if (!query) {
    return reply(
      `╔══════════════════════════╗\n` +
      `║  🗺️ *SHAVIYA-XMD | LOCATION*  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `❌ *Usage:*\n` +
      `• *.location Colombo Fort*\n` +
      `• *.location Kandy Temple of Tooth*\n` +
      `• *.location Galle Face Green*\n\n` +
      `📍 Or send your *WhatsApp Live Location* to get the Maps link\n\n` +
      `> 🌍 Works for any location worldwide\n` +
      `> Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`
    );
  }

  await reply('⏳ *Searching location...*');

  try {
    const encoded = encodeURIComponent(query);
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`,
      {
        headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/2.0' },
        timeout: 10000
      }
    );

    const data = res.data;

    if (!data || data.length === 0) {
      return reply(
        `❌ *Location not found:* ${query}\n\nTry a more specific name.\n\n> Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`
      );
    }

    const place    = data[0];
    const lat      = parseFloat(place.lat).toFixed(6);
    const lon      = parseFloat(place.lon).toFixed(6);
    const dispName = place.display_name || query;
    const addr     = place.address      || {};
    const type     = place.type || place.class || 'place';

    const city     = addr.city || addr.town || addr.village || addr.county || 'N/A';
    const state    = addr.state || 'N/A';
    const country  = addr.country || 'N/A';
    const postcode = addr.postcode || 'N/A';

    const gmaps  = `https://maps.google.com/?q=${lat},${lon}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

    const text =
      `╔══════════════════════════╗\n` +
      `║  🗺️ *SHAVIYA-XMD | LOCATION*  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `📌 *Place:*\n${dispName}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏙️ *City/Town:*    ${city}\n` +
      `🏛️ *State:*        ${state}\n` +
      `🌍 *Country:*      ${country}\n` +
      `📮 *Postcode:*     ${postcode}\n` +
      `🏷️ *Type:*         ${type}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📐 *Coordinates*\n` +
      `🌐 *Latitude:*     ${lat}\n` +
      `🌐 *Longitude:*    ${lon}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 *Links*\n` +
      `📍 Google Maps:\n${gmaps}\n\n` +
      `🗺️ OpenStreetMap:\n${osmUrl}\n\n` +
      `> 🤖 Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`;

    // Send text message
    await conn.sendMessage(from, { text }, { quoted: mek });

    // Send WhatsApp location pin card
    await conn.sendMessage(from, {
      location: {
        degreesLatitude:  parseFloat(lat),
        degreesLongitude: parseFloat(lon),
        name:    query,
        address: `${city !== 'N/A' ? city + ', ' : ''}${country}`
      }
    }, { quoted: mek });

  } catch (e) {
    console.error('[LOCATION] Error:', e.message);
    reply(`❌ *Error:* ${e.message}\n\nPlease try again.\n\n> Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`);
  }

});
