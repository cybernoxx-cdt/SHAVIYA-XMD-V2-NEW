// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHAVIYA-XMD V2 | numinfo.js
// CMD: .numinfo <number>
// Sri Lanka numbers only | 100% fixed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use strict';

const { cmd } = require('../command');

const SL_CARRIERS = {
  '070': { name: 'Mobitel',         sim: 'Sri Lanka Telecom Mobitel (Pvt) Ltd',            type: '4G/5G' },
  '071': { name: 'Mobitel',         sim: 'Sri Lanka Telecom Mobitel (Pvt) Ltd',            type: '4G/5G' },
  '072': { name: 'Hutch',           sim: 'Hutchison Telecommunications Lanka (Pvt) Ltd',   type: '4G'   },
  '074': { name: 'Hutch',           sim: 'Hutchison Telecommunications Lanka (Pvt) Ltd',   type: '4G'   },
  '075': { name: 'Airtel',          sim: 'Airtel Lanka (Pvt) Ltd',                         type: '4G'   },
  '076': { name: 'Airtel',          sim: 'Airtel Lanka (Pvt) Ltd',                         type: '4G'   },
  '077': { name: 'Dialog',          sim: 'Dialog Axiata PLC',                              type: '4G/5G' },
  '078': { name: 'Hutch',           sim: 'Hutchison Telecommunications Lanka (Pvt) Ltd',   type: '4G'   },
  '079': { name: 'Dialog',          sim: 'Dialog Axiata PLC',                              type: '4G/5G' },
  '010': { name: 'Dialog',          sim: 'Dialog Axiata PLC',                              type: '4G/5G' },
  '011': { name: 'Dialog Landline', sim: 'Dialog Axiata PLC (Colombo Landline)',            type: 'PSTN' },
  '038': { name: 'SLT Landline',    sim: 'Sri Lanka Telecom PLC (Kalutara)',                type: 'PSTN' },
  '081': { name: 'SLT Landline',    sim: 'Sri Lanka Telecom PLC (Kandy)',                   type: 'PSTN' },
  '091': { name: 'SLT Landline',    sim: 'Sri Lanka Telecom PLC (Galle)',                   type: 'PSTN' },
  '041': { name: 'SLT Landline',    sim: 'Sri Lanka Telecom PLC (Matara)',                  type: 'PSTN' },
};

const MOBILE_REGIONS = {
  '070': { city: 'Colombo',      district: 'Colombo',      province: 'Western',       lat: 6.9271, lon: 79.8612 },
  '071': { city: 'Kandy',        district: 'Kandy',        province: 'Central',       lat: 7.2906, lon: 80.6337 },
  '072': { city: 'Galle',        district: 'Galle',        province: 'Southern',      lat: 6.0535, lon: 80.2210 },
  '074': { city: 'Negombo',      district: 'Gampaha',      province: 'Western',       lat: 7.2083, lon: 79.8358 },
  '075': { city: 'Anuradhapura', district: 'Anuradhapura', province: 'North Central', lat: 8.3114, lon: 80.4037 },
  '076': { city: 'Jaffna',       district: 'Jaffna',       province: 'Northern',      lat: 9.6615, lon: 80.0255 },
  '077': { city: 'Negombo',      district: 'Gampaha',      province: 'Western',       lat: 7.2083, lon: 79.8358 },
  '078': { city: 'Matara',       district: 'Matara',       province: 'Southern',      lat: 5.9549, lon: 80.5550 },
  '079': { city: 'Colombo',      district: 'Colombo',      province: 'Western',       lat: 6.9271, lon: 79.8612 },
  '010': { city: 'Colombo',      district: 'Colombo',      province: 'Western',       lat: 6.9271, lon: 79.8612 },
};

const LANDLINE_REGIONS = {
  '011': { city: 'Colombo',      district: 'Colombo',       province: 'Western',       lat: 6.9271, lon: 79.8612 },
  '031': { city: 'Gampaha',      district: 'Gampaha',       province: 'Western',       lat: 7.0873, lon: 79.9998 },
  '038': { city: 'Kalutara',     district: 'Kalutara',      province: 'Western',       lat: 6.5854, lon: 79.9607 },
  '081': { city: 'Kandy',        district: 'Kandy',         province: 'Central',       lat: 7.2906, lon: 80.6337 },
  '066': { city: 'Matale',       district: 'Matale',        province: 'Central',       lat: 7.4675, lon: 80.6234 },
  '052': { city: 'Nuwara Eliya', district: 'Nuwara Eliya',  province: 'Central',       lat: 6.9497, lon: 80.7891 },
  '055': { city: 'Badulla',      district: 'Badulla',       province: 'Uva',           lat: 6.9934, lon: 81.0550 },
  '091': { city: 'Galle',        district: 'Galle',         province: 'Southern',      lat: 6.0535, lon: 80.2210 },
  '041': { city: 'Matara',       district: 'Matara',        province: 'Southern',      lat: 5.9549, lon: 80.5550 },
  '047': { city: 'Hambantota',   district: 'Hambantota',    province: 'Southern',      lat: 6.1241, lon: 81.1185 },
  '021': { city: 'Jaffna',       district: 'Jaffna',        province: 'Northern',      lat: 9.6615, lon: 80.0255 },
  '023': { city: 'Mannar',       district: 'Mannar',        province: 'Northern',      lat: 8.9760, lon: 79.9044 },
  '024': { city: 'Vavuniya',     district: 'Vavuniya',      province: 'Northern',      lat: 8.7514, lon: 80.4971 },
  '026': { city: 'Trincomalee',  district: 'Trincomalee',   province: 'Eastern',       lat: 8.5874, lon: 81.2152 },
  '065': { city: 'Batticaloa',   district: 'Batticaloa',    province: 'Eastern',       lat: 7.7102, lon: 81.6924 },
  '067': { city: 'Ampara',       district: 'Ampara',        province: 'Eastern',       lat: 7.2983, lon: 81.6747 },
  '025': { city: 'Anuradhapura', district: 'Anuradhapura',  province: 'North Central', lat: 8.3114, lon: 80.4037 },
  '027': { city: 'Polonnaruwa',  district: 'Polonnaruwa',   province: 'North Central', lat: 7.9403, lon: 81.0188 },
  '037': { city: 'Kurunegala',   district: 'Kurunegala',    province: 'North Western', lat: 7.4863, lon: 80.3647 },
  '032': { city: 'Puttalam',     district: 'Puttalam',      province: 'North Western', lat: 8.0362, lon: 79.8283 },
  '045': { city: 'Ratnapura',    district: 'Ratnapura',     province: 'Sabaragamuwa',  lat: 6.6828, lon: 80.3992 },
  '035': { city: 'Kegalle',      district: 'Kegalle',       province: 'Sabaragamuwa',  lat: 7.2513, lon: 80.3464 },
};

const SL_DEFAULT = { city: 'Sri Lanka', district: 'Unknown', province: 'Unknown', lat: 7.8731, lon: 80.7718 };

const LANDLINE_PREFIXES = ['011','031','038','081','091','041','066','052','055','047','021','023','024','026','065','067','025','027','037','032','045','035'];

function normalize(raw) {
  let n = String(raw).replace(/[\s\-\+\(\)]/g, '');
  if (n.startsWith('94')) n = '0' + n.slice(2);
  if (!n.startsWith('0')) n = '0' + n;
  return n;
}

function isValidLK(n) {
  return /^0[1-9]\d{8}$/.test(n);
}

function intlFormat(n) { return '+94' + n.slice(1); }

function prettyFormat(n) { return n.replace(/^(0\d{2})(\d{3})(\d{4})$/, '$1 $2 $3'); }

function getInfo(n) {
  const p3 = n.slice(0, 3);
  const carrier = SL_CARRIERS[p3] || { name: 'Unknown Carrier', sim: 'Unknown Operator', type: 'Unknown' };
  const isLandline = LANDLINE_PREFIXES.includes(p3);
  const region = isLandline
    ? (LANDLINE_REGIONS[p3] || SL_DEFAULT)
    : (MOBILE_REGIONS[p3]  || SL_DEFAULT);
  return { carrier, region, isLandline };
}

cmd({
  pattern:  'numinfo',
  alias:    ['numberinfo', 'siminfo', 'numdetails'],
  react:    '📱',
  desc:     'Sri Lanka number details & carrier info',
  category: 'tools',
  use:      '<number>',
  filename: __filename,
}, async (conn, mek, m, { q, reply, from }) => {

  let input = q ? q.trim() : '';

  if (!input && mek.message && mek.message.extendedTextMessage) {
    const ctx = mek.message.extendedTextMessage.contextInfo;
    if (ctx && ctx.mentionedJid && ctx.mentionedJid[0]) {
      input = ctx.mentionedJid[0].replace('@s.whatsapp.net', '');
    }
  }

  if (!input) {
    return reply(
      `╔═══════════════════════╗\n` +
      `║ 📱 *SHAVIYA-XMD | NUMINFO* ║\n` +
      `╚═══════════════════════╝\n\n` +
      `❌ *Usage:*\n` +
      `• *.numinfo 0771234567*\n` +
      `• *.numinfo 94771234567*\n` +
      `• *.numinfo +94771234567*\n\n` +
      `> 🇱🇰 Sri Lanka numbers only\n` +
      `> Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`
    );
  }

  const normalized = normalize(input);

  if (!isValidLK(normalized)) {
    return reply(
      `❌ *Invalid number!*\n\n` +
      `Only Sri Lanka 🇱🇰 numbers supported.\n` +
      `Format: *07XXXXXXXX* or *94XXXXXXXXX*\n\n` +
      `> Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`
    );
  }

  const { carrier, region, isLandline } = getInfo(normalized);
  const intl     = intlFormat(normalized);
  const pretty   = prettyFormat(normalized);
  const lineType = isLandline ? '☎️ Landline (PSTN)' : '📱 Mobile';
  const gmaps    = `https://maps.google.com/?q=${region.lat},${region.lon}`;

  const text =
    `╔══════════════════════════╗\n` +
    `║  📱 *SHAVIYA-XMD | NUM INFO*  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `📞 *Number:*         ${pretty}\n` +
    `🌐 *Intl Format:*    ${intl}\n` +
    `🇱🇰 *Country:*        Sri Lanka\n` +
    `✅ *Status:*         Active\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📡 *Carrier / SIM Info*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 *Network:*        ${carrier.name}\n` +
    `🔖 *SIM Owner:*      ${carrier.sim}\n` +
    `📶 *Line Type:*      ${lineType}\n` +
    `⚡ *Technology:*     ${carrier.type}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🗺️ *Location Info*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏙️ *City/Area:*      ${region.city}\n` +
    `📍 *District:*       ${region.district}\n` +
    `🌏 *Province:*       ${region.province}\n` +
    `🕐 *Timezone:*       Asia/Colombo (UTC+5:30)\n` +
    `💰 *Currency:*       Sri Lankan Rupee (LKR)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Google Maps*\n` +
    `${gmaps}\n\n` +
    `> 🤖 Powered By *Sʜᴀᴠɪʏᴀ-Xᴍᴅ* 👑`;

  await conn.sendMessage(from, { text }, { quoted: mek });

  await conn.sendMessage(from, {
    location: {
      degreesLatitude:  region.lat,
      degreesLongitude: region.lon,
      name:    `${carrier.name} — ${region.city}`,
      address: `${region.district}, ${region.province}, Sri Lanka 🇱🇰`
    }
  }, { quoted: mek });

});
