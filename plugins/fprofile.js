// ============================================================
//  SHAVIYA-XMD V2 — fprofile.js Plugin
//  Facebook Profile Downloader (Public Profiles)
//  Crash Delta Team (CDT) | NICE
// ============================================================

const { cmd } = require('../command');

// ─────────────────────────────────────────────
//  Session Store (in-memory)
// ─────────────────────────────────────────────
const fprofileSessions = new Map();

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

const USER_AGENTS = {
  MOBILE: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  DESKTOP: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function extractFacebookId(url) {
  const patterns = [
    /facebook\.com\/profile\.php\?id=(\d+)/i,
    /facebook\.com\/people\/[^/]+\/(\d+)/i,
    /facebook\.com\/([a-zA-Z0-9.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1] !== 'share') return match[1];
  }
  return null;
}

async function scrapeFacebookProfile(profileUrl) {
  let url = profileUrl.trim();
  if (!url.startsWith('http')) url = 'https://' + url;

  const fbId = extractFacebookId(url);
  const mbasicUrl = fbId
    ? `https://mbasic.facebook.com/${fbId}`
    : url.replace('www.facebook.com', 'mbasic.facebook.com').replace('m.facebook.com', 'mbasic.facebook.com');

  const fetch = (await import('node-fetch')).default;
  const cheerio = await import('cheerio');

  const headers = {
    'User-Agent': USER_AGENTS.MOBILE,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache',
  };

  const res = await fetch(mbasicUrl, { headers, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const $ = cheerio.load(html);

  const name =
    $('title').text().replace('| Facebook', '').replace('Facebook', '').trim() ||
    $('h1').first().text().trim() ||
    'Unknown';

  let profilePic = null;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if ((src.includes('scontent') || src.includes('fbcdn') || src.includes('v/t')) && !profilePic) {
      profilePic = src;
    }
  });

  try {
    $('script').each((_, el) => {
      const txt = $(el).html() || '';
      if (txt.includes('profile_pic') && !profilePic) {
        const m = txt.match(/"profile_pic_uri":"([^"]+)"/);
        if (m) profilePic = m[1].replace(/\\/g, '');
      }
    });
  } catch (_) {}

  const coverPhoto = $('meta[property="og:image"]').attr('content') || null;

  const bio =
    $('[data-overviewsection="bio"]').text().trim() ||
    $('div#bio').text().trim() ||
    null;

  let friendCount = null;
  $('a').each((_, el) => {
    const txt = $(el).text();
    if (/friends/i.test(txt) && /\d/.test(txt) && !friendCount) {
      friendCount = txt.trim();
    }
  });

  if (fbId && !profilePic) {
    profilePic = `https://graph.facebook.com/${fbId}/picture?type=large&width=720&height=720`;
  }

  return { name, profilePic, coverPhoto, bio, friendCount, sourceUrl: mbasicUrl };
}

function getHighResUrl(url) {
  if (!url) return null;
  let u = url;
  u = u.replace(/\/[spc]\d+x\d+\//g, '/');
  u = u.replace(/\/[spc]\d+\//g, '/');
  u = u.split('?')[0];
  return u;
}

async function downloadImage(url) {
  if (!url) return null;
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENTS.DESKTOP,
        'Referer': 'https://www.facebook.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const buffer = await res.buffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────
//  Session Reply Handler (on:body)
// ─────────────────────────────────────────────
cmd({
  on: 'body',
  pattern: '',
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, body, isCmd, sender, reply }) => {
  if (isCmd) return;
  if (!fprofileSessions.has(sender)) return;

  const session = fprofileSessions.get(sender);
  if (session.step !== 'WAIT_CHOICE') return;

  const choice = body.trim();

  if (choice === '1') {
    await reply('⏳ *Profile Picture* download කරනවා...');
    const img = await downloadImage(getHighResUrl(session.data.profilePic));
    if (!img) return reply('❌ Profile picture download fail. Private/locked විය හැකියි.');
    await conn.sendMessage(from, {
      image: img.buffer,
      caption: `📸 *${session.data.name}* — Profile Picture\n\n🔗 ${session.data.sourceUrl}\n\n_SHAVIYA-XMD V2 | CDT_`,
      mimetype: img.contentType,
    }, { quoted: mek });

  } else if (choice === '2') {
    if (!session.data.coverPhoto) return reply('❌ Cover photo හොයාගන්න බෑ. Profile locked/private.');
    await reply('⏳ *Cover Photo* download කරනවා...');
    const img = await downloadImage(session.data.coverPhoto);
    if (!img) return reply('❌ Cover photo download fail.');
    await conn.sendMessage(from, {
      image: img.buffer,
      caption: `🖼️ *${session.data.name}* — Cover Photo\n\n🔗 ${session.data.sourceUrl}\n\n_SHAVIYA-XMD V2 | CDT_`,
      mimetype: img.contentType,
    }, { quoted: mek });

  } else if (choice === '3') {
    await reply('⏳ *Profile Picture + Cover Photo* download කරනවා...');
    const ppImg = await downloadImage(getHighResUrl(session.data.profilePic));
    const coverImg = session.data.coverPhoto ? await downloadImage(session.data.coverPhoto) : null;

    if (ppImg) {
      await conn.sendMessage(from, {
        image: ppImg.buffer,
        caption: `📸 *Profile Picture* — ${session.data.name}`,
        mimetype: ppImg.contentType,
      }, { quoted: mek });
    }
    if (coverImg) {
      await conn.sendMessage(from, {
        image: coverImg.buffer,
        caption: `🖼️ *Cover Photo* — ${session.data.name}`,
        mimetype: coverImg.contentType,
      }, { quoted: mek });
    }
    if (!ppImg && !coverImg) return reply('❌ Images download වුනේ නෑ. Profile private/locked.');

  } else if (choice === '0') {
    fprofileSessions.delete(sender);
    return reply('❌ *Cancelled.*');

  } else {
    return; // ignore other messages
  }

  fprofileSessions.delete(sender);
});

// ─────────────────────────────────────────────
//  Main Command
// ─────────────────────────────────────────────
cmd({
  pattern: 'fprofile',
  alias: ['fbprofile', 'fb', 'facebook'],
  react: '📘',
  desc: 'Facebook profile picture & cover photo downloader',
  category: 'tools',
  use: '.fprofile <facebook_url>',
  filename: __filename
}, async (conn, mek, m, { from, q, sender, reply }) => {

  const fbUrl = q ? q.trim() : '';

  if (!fbUrl || !fbUrl.includes('facebook.com')) {
    return reply(
      `╔══════════════════════╗\n` +
      `║  📘 *FB PROFILE DOWNLOADER*  ║\n` +
      `╚══════════════════════╝\n\n` +
      `*Usage:*\n.fprofile https://facebook.com/username\n\n` +
      `*Share link also works:*\n.fprofile https://www.facebook.com/share/...\n\n` +
      `*Features:*\n` +
      `📸 Profile Picture (High-res)\n` +
      `🖼️ Cover Photo\n` +
      `👤 Name, Bio, Friends count\n\n` +
      `_SHAVIYA-XMD V2 | Crash Delta Team_`
    );
  }

  await reply('🔍 *Facebook profile* scrape කරනවා...\n_Please wait..._');

  let profileData;
  try {
    profileData = await scrapeFacebookProfile(fbUrl);
  } catch (err) {
    return reply(`❌ *Error:* ${err.message}\n\nURL check කරන්න හෝ profile private නම් data ගන්න බෑ.`);
  }

  if (!profileData || !profileData.name || profileData.name === 'Unknown') {
    return reply('❌ Profile data extract කරන්න බෑ.\n\n• URL wrong\n• Profile locked/private\n• Facebook blocked the request');
  }

  fprofileSessions.set(sender, {
    step: 'WAIT_CHOICE',
    profileUrl: fbUrl,
    data: profileData,
  });
  setTimeout(() => fprofileSessions.delete(sender), 5 * 60 * 1000);

  await reply(
    `╔══════════════════════╗\n` +
    `║      📘 *FACEBOOK PROFILE*     ║\n` +
    `╚══════════════════════╝\n\n` +
    `👤 *Name:* ${profileData.name}\n` +
    `👥 *Friends:* ${profileData.friendCount || 'N/A'}\n` +
    `📝 *Bio:* ${profileData.bio ? profileData.bio.slice(0, 100) + '...' : 'N/A'}\n` +
    `🖼️ *Cover Photo:* ${profileData.coverPhoto ? '✅ Found' : '❌ Not found'}\n` +
    `📸 *Profile Pic:* ${profileData.profilePic ? '✅ Found' : '❌ Not found'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Reply with number:*\n` +
    `*1️⃣* — Download Profile Picture\n` +
    `*2️⃣* — Download Cover Photo\n` +
    `*3️⃣* — Download Both\n` +
    `*0️⃣* — Cancel\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `_Session expires in 5 minutes_`
  );
});
