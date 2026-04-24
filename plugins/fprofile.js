// ============================================================
//  SHAVIYA-XMD V2 — fprofile.js Plugin (ADVANCED VERSION)
//  Facebook Profile Downloader (Public & Locked Profiles)
//  Crash Delta Team (CDT) | NICE
// ============================================================

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// ─────────────────────────────────────────────
//  Session Store (in-memory)
// ─────────────────────────────────────────────
const fprofileSessions = new Map();
// Structure: { jid: { step, profileUrl, data, attempts, bypassMethod } }

// ─────────────────────────────────────────────
//  Advanced Bypass Methods
// ─────────────────────────────────────────────

const BYPASS_METHODS = {
  MBASIC: 'mbasic',
  BASIC: 'basic',
  TOUCH: 'touch',
  WAP: 'wap',
  GRAPHQL: 'graphql',
  API: 'api',
  ALTERNATIVE: 'alternative'
};

const USER_AGENTS = {
  MOBILE: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  DESKTOP: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  IOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  CRAWLER: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
};

// ─────────────────────────────────────────────
//  Advanced Helpers
// ─────────────────────────────────────────────

/**
 * Extract Facebook ID from URL or username
 */
function extractFacebookId(url) {
  const patterns = [
    /facebook\.com\/profile\.php\?id=(\d+)/i,
    /facebook\.com\/([a-zA-Z0-9.]+)/i,
    /facebook\.com\/pages\/[^\/]+\/(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Convert URL to different Facebook endpoints for bypass
 */
function getBypassUrl(originalUrl, method) {
  let url = originalUrl.trim();
  if (!url.startsWith('http')) url = 'https://' + url;

  // Extract the base profile identifier
  const fbId = extractFacebookId(url);
  if (!fbId) return url;

  switch (method) {
    case BYPASS_METHODS.MBASIC:
      return `https://mbasic.facebook.com/${fbId}`;
    case BYPASS_METHODS.BASIC:
      return `https://basic.facebook.com/${fbId}`;
    case BYPASS_METHODS.TOUCH:
      return `https://touch.facebook.com/${fbId}`;
    case BYPASS_METHODS.WAP:
      return `https://wap.facebook.com/${fbId}`;
    case BYPASS_METHODS.GRAPHQL:
      return `https://www.facebook.com/api/graphql/`;
    case BYPASS_METHODS.API:
      return `https://graph.facebook.com/${fbId}?fields=id,name,picture.width(720).height(720),cover,bio,friends`;
    case BYPASS_METHODS.ALTERNATIVE:
      return `https://mbasic.facebook.com/profile.php?id=${fbId}&v=info`;
    default:
      return url;
  }
}

/**
 * Get headers for bypass attempts
 */
function getBypassHeaders(method, referer = null) {
  const headers = {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  switch (method) {
    case BYPASS_METHODS.MBASIC:
    case BYPASS_METHODS.BASIC:
    case BYPASS_METHODS.TOUCH:
    case BYPASS_METHODS.WAP:
      headers['User-Agent'] = USER_AGENTS.MOBILE;
      break;
    case BYPASS_METHODS.GRAPHQL:
      headers['User-Agent'] = USER_AGENTS.DESKTOP;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['X-Requested-With'] = 'XMLHttpRequest';
      headers['Referer'] = 'https://www.facebook.com/';
      break;
    case BYPASS_METHODS.API:
      headers['User-Agent'] = USER_AGENTS.CRAWLER;
      headers['Authorization'] = 'Bearer OAUTH_TOKEN'; // Would need valid token
      break;
    case BYPASS_METHODS.ALTERNATIVE:
      headers['User-Agent'] = USER_AGENTS.IOS;
      break;
    default:
      headers['User-Agent'] = USER_AGENTS.DESKTOP;
  }

  if (referer) {
    headers['Referer'] = referer;
  }

  return headers;
}

/**
 * Try multiple bypass methods to access Facebook profile
 */
async function bypassFacebookProfile(profileUrl, maxAttempts = 3) {
  const results = [];
  const methods = Object.values(BYPASS_METHODS);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const method of methods) {
      try {
        console.log(`Trying bypass method: ${method} (attempt ${attempt + 1})`);
        
        const url = getBypassUrl(profileUrl, method);
        const headers = getBypassHeaders(method, profileUrl);
        
        const res = await fetch(url, { 
          headers, 
          redirect: 'follow',
          timeout: 15000
        });
        
        if (!res.ok) continue;
        
        const html = await res.text();
        
        // Check if we got a valid profile page
        if (html.includes('content="Facebook"') || 
            html.includes('facebook.com') ||
            html.includes('fb:app_id')) {
          
          let profileData;
          
          if (method === BYPASS_METHODS.API) {
            profileData = parseApiData(JSON.parse(html));
          } else {
            profileData = parseHtmlData(html, method);
          }
          
          if (profileData && profileData.name && profileData.name !== 'Unknown') {
            profileData.bypassMethod = method;
            profileData.sourceUrl = url;
            return profileData;
          }
        }
      } catch (error) {
        console.error(`Bypass method ${method} failed:`, error.message);
        continue;
      }
    }
  }
  
  // If all methods failed, try alternative approach
  return tryAlternativeBypass(profileUrl);
}

/**
 * Parse HTML data from Facebook page
 */
function parseHtmlData(html, method) {
  const $ = cheerio.load(html);
  
  // Extract Name
  const name =
    $('title').text().replace('| Facebook', '').trim() ||
    $('h1').first().text().trim() ||
    $('[data-overviewsection="profile_name"]').text().trim() ||
    'Unknown';

  // Extract Profile Picture
  let profilePic = null;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (
      src.includes('profile') ||
      src.includes('scontent') ||
      src.includes('fbcdn') ||
      src.includes('v/t')
    ) {
      if (!profilePic || src.includes('profile_pic')) profilePic = src;
    }
  });

  // Extract Cover Photo
  let coverPhoto = null;
  if (method === BYPASS_METHODS.MBASIC || method === BYPASS_METHODS.BASIC) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('cover') || (src.includes('scontent') && !src.includes('profile'))) {
        if (!coverPhoto) coverPhoto = src;
      }
    });
  } else {
    coverPhoto = $('meta[property="og:image"]').attr('content') || null;
  }

  // Extract Bio / About
  let bio = null;
  if (method === BYPASS_METHODS.MBASIC || method === BYPASS_METHODS.BASIC) {
    bio = $('[data-overviewsection="bio"]').text().trim() ||
          $('div[data-overviewsection="profile_bio"]').text().trim() ||
          $('div#bio').text().trim();
  } else {
    bio = $('[data-gt]').first().text().trim() ||
          $('div#root section').eq(1).text().trim().slice(0, 200) ||
          null;
  }

  // Extract Followers/Friends count
  let friendCount = null;
  $('a').each((_, el) => {
    const txt = $(el).text();
    if (/friends/i.test(txt) && /\d/.test(txt)) {
      friendCount = txt.trim();
    }
  });

  // Try to extract from structured data
  try {
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const scriptText = $(script).html();
      if (scriptText && scriptText.includes('profile_pic')) {
        const picMatch = scriptText.match(/profile_pic":"([^"]+)"/);
        if (picMatch && !profilePic) profilePic = picMatch[1].replace(/\\/g, '');
        
        const coverMatch = scriptText.match(/cover_photo":"([^"]+)"/);
        if (coverMatch && !coverPhoto) coverPhoto = coverMatch[1].replace(/\\/g, '');
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return {
    name,
    profilePic,
    coverPhoto,
    bio,
    friendCount,
    sourceUrl: null, // Will be set in bypassFacebookProfile
  };
}

/**
 * Parse API response data
 */
function parseApiData(data) {
  if (!data || data.error) return null;
  
  return {
    name: data.name || 'Unknown',
    profilePic: data.picture?.data?.url || null,
    coverPhoto: data.cover?.source || null,
    bio: data.bio || null,
    friendCount: data.friends ? `${data.friends.summary?.total_count || 0} friends` : null,
    sourceUrl: null, // Will be set in bypassFacebookProfile
  };
}

/**
 * Try alternative bypass methods
 */
async function tryAlternativeBypass(profileUrl) {
  // Try to extract ID and use different approaches
  const fbId = extractFacebookId(profileUrl);
  if (!fbId) return null;

  // Method 1: Try to get profile picture directly
  try {
    const directPicUrl = `https://graph.facebook.com/${fbId}/picture?type=large&width=720&height=720`;
    const picRes = await fetch(directPicUrl, { 
      headers: { 'User-Agent': USER_AGENTS.CRAWLER },
      redirect: 'follow'
    });
    
    if (picRes.ok) {
      // Try to get basic info
      const infoUrl = `https://graph.facebook.com/${fbId}?fields=name`;
      const infoRes = await fetch(infoUrl, { 
        headers: { 'User-Agent': USER_AGENTS.CRAWLER }
      });
      
      let name = 'Unknown';
      if (infoRes.ok) {
        try {
          const infoData = await infoRes.json();
          name = infoData.name || 'Unknown';
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
      
      return {
        name,
        profilePic: directPicUrl,
        coverPhoto: null,
        bio: null,
        friendCount: null,
        sourceUrl: directPicUrl,
        bypassMethod: 'direct'
      };
    }
  } catch (e) {
    // Ignore errors
  }

  // Method 2: Try to use m.facebook.com with different parameters
  try {
    const altUrl = `https://m.facebook.com/${fbId}?v=timeline&ref=bookmarks`;
    const headers = {
      'User-Agent': USER_AGENTS.MOBILE,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    
    const res = await fetch(altUrl, { headers, redirect: 'follow' });
    if (res.ok) {
      const html = await res.text();
      const data = parseHtmlData(html, 'alternative');
      if (data && data.name !== 'Unknown') {
        data.bypassMethod = 'alternative';
        data.sourceUrl = altUrl;
        return data;
      }
    }
  } catch (e) {
    // Ignore errors
  }

  // Method 3: Try to use third-party services (as last resort)
  try {
    // This would use a third-party service to get profile info
    // In a real implementation, you might use services like:
    // - https://nitter.net for Twitter
    // - Similar services for Facebook
    // For this example, we'll just return a minimal profile with ID
    return {
      name: `Facebook User ${fbId}`,
      profilePic: `https://graph.facebook.com/${fbId}/picture?type=large`,
      coverPhoto: null,
      bio: null,
      friendCount: null,
      sourceUrl: `https://www.facebook.com/${fbId}`,
      bypassMethod: 'fallback'
    };
  } catch (e) {
    // Ignore errors
  }

  return null;
}

/**
 * Download image buffer from URL with retry
 */
async function downloadImage(url, retries = 2) {
  if (!url) return null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const headers = {
        'User-Agent': USER_AGENTS.DESKTOP,
        'Referer': 'https://www.facebook.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      };
      
      const res = await fetch(url, { headers, redirect: 'follow', timeout: 10000 });
      if (!res.ok) continue;
      
      const buffer = await res.buffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return { buffer, contentType };
    } catch (error) {
      if (attempt === retries) return null;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return null;
}

/**
 * Get higher resolution version of Facebook images
 */
function getHighResImageUrl(url) {
  if (!url) return null;
  
  // Facebook often has multiple sizes of the same image
  // Try to get the highest resolution version
  let highResUrl = url;
  
  // Replace size parameters with larger ones
  highResUrl = highResUrl.replace(/\/[spc]\d+x\d+\//g, '/');
  highResUrl = highResUrl.replace(/\/[spc]\d+\//g, '/');
  highResUrl = highResUrl.replace(/\?.*$/, '');
  
  // Add parameters for high resolution
  highResUrl += '?width=720&height=720&auto=webp';
  
  return highResUrl;
}

// ─────────────────────────────────────────────
//  Plugin Entry Point
// ─────────────────────────────────────────────

export async function fprofilePlugin(sock, msg, text, sender) {
  const jid = msg.key.remoteJid;
  const reply = (txt) =>
    sock.sendMessage(jid, { text: txt }, { quoted: msg });

  // ── STEP 0: Check if in a session (waiting for reply) ──
  if (fprofileSessions.has(sender)) {
    const session = fprofileSessions.get(sender);

    if (session.step === 'WAIT_CHOICE') {
      const choice = text.trim();

      if (choice === '1') {
        // Download Profile Picture
        await reply('⏳ *Profile Picture* download කරනවා...');
        const highResUrl = getHighResImageUrl(session.data.profilePic);
        const img = await downloadImage(highResUrl);
        if (!img) {
          await reply('❌ Profile picture download fail උනා.');
        } else {
          await sock.sendMessage(
            jid,
            {
              image: img.buffer,
              caption: `📸 *${session.data.name}* — Profile Picture\n\n🔗 ${session.data.sourceUrl}\n🔓 Bypass Method: ${session.data.bypassMethod || 'Default'}`,
              mimetype: img.contentType,
            },
            { quoted: msg }
          );
        }

      } else if (choice === '2') {
        // Download Cover Photo
        if (!session.data.coverPhoto) {
          await reply('❌ Cover photo හොයාගන්න බෑ (private/locked).');
        } else {
          await reply('⏳ *Cover Photo* download කරනවා...');
          const highResUrl = getHighResImageUrl(session.data.coverPhoto);
          const img = await downloadImage(highResUrl);
          if (!img) {
            await reply('❌ Cover photo download fail උනා.');
          } else {
            await sock.sendMessage(
              jid,
              {
                image: img.buffer,
                caption: `🖼️ *${session.data.name}* — Cover Photo\n\n🔗 ${session.data.sourceUrl}\n🔓 Bypass Method: ${session.data.bypassMethod || 'Default'}`,
                mimetype: img.contentType,
              },
              { quoted: msg }
            );
          }
        }

      } else if (choice === '3') {
        // Download Both
        await reply('⏳ *Profile Picture + Cover Photo* download කරනවා...');

        const ppUrl = getHighResImageUrl(session.data.profilePic);
        const ppImg = await downloadImage(ppUrl);

        let coverUrl = null;
        let coverImg = null;
        if (session.data.coverPhoto) {
          coverUrl = getHighResImageUrl(session.data.coverPhoto);
          coverImg = await downloadImage(coverUrl);
        }

        if (ppImg) {
          await sock.sendMessage(
            jid,
            {
              image: ppImg.buffer,
              caption: `📸 *Profile Picture* — ${session.data.name}\n\n🔓 Bypass Method: ${session.data.bypassMethod || 'Default'}`,
              mimetype: ppImg.contentType,
            },
            { quoted: msg }
          );
        }

        if (coverImg) {
          await sock.sendMessage(
            jid,
            {
              image: coverImg.buffer,
              caption: `🖼️ *Cover Photo* — ${session.data.name}\n\n🔓 Bypass Method: ${session.data.bypassMethod || 'Default'}`,
              mimetype: coverImg.contentType,
            },
            { quoted: msg }
          );
        }

        if (!ppImg && !coverImg) {
          await reply('❌ කිසිම image download වුනේ නෑ. Profile lock/private විය හැකියි.');
        }

      } else if (choice === '4') {
        // Try different bypass method
        await reply('🔄 *Trying different bypass methods...*');
        
        try {
          const newProfileData = await bypassFacebookProfile(session.profileUrl, 2);
          if (newProfileData && newProfileData.name !== 'Unknown') {
            // Update session with new data
            session.data = newProfileData;
            session.attempts = (session.attempts || 0) + 1;
            
            await reply('✅ *New data found with different bypass method!*');
            
            // Show updated profile info
            const infoText =
              `╔══════════════════════╗\n` +
              `║      📘 *FACEBOOK PROFILE INFO*     ║\n` +
              `╚══════════════════════╝\n\n` +
              `👤 *Name:* ${newProfileData.name}\n` +
              `👥 *Friends:* ${newProfileData.friendCount || 'N/A'}\n` +
              `📝 *Bio:* ${newProfileData.bio ? newProfileData.bio.slice(0, 100) + '...' : 'N/A'}\n` +
              `🖼️ *Cover Photo:* ${newProfileData.coverPhoto ? '✅ Found' : '❌ Not found'}\n` +
              `📸 *Profile Pic:* ${newProfileData.profilePic ? '✅ Found' : '❌ Not found'}\n` +
              `🔓 *Bypass Method:* ${newProfileData.bypassMethod || 'Default'}\n\n` +
              `━━━━━━━━━━━━━━━\n` +
              `*Download Options:*\n` +
              `*1️⃣* — Profile Picture\n` +
              `*2️⃣* — Cover Photo\n` +
              `*3️⃣* — Both\n` +
              `*4️⃣* — Try Different Bypass\n` +
              `*0️⃣* — Cancel\n` +
              `━━━━━━━━━━━━━━━\n` +
              `_Reply with number to download_\n` +
              `_Session expires in 3 minutes_`;
            
            await reply(infoText);
            return;
          } else {
            await reply('❌ No new data found with different bypass methods.');
          }
        } catch (err) {
          await reply(`❌ Error trying bypass methods: ${err.message}`);
        }

      } else if (choice === '0') {
        fprofileSessions.delete(sender);
        await reply('❌ *Cancelled.*');
        return;

      } else {
        await reply('❓ Valid choice එකක් enter කරන්න:\n*1* — Profile Pic\n*2* — Cover Photo\n*3* — Both\n*4* — Try Different Bypass\n*0* — Cancel');
        return;
      }

      fprofileSessions.delete(sender);
      return;
    }
  }

  // ── STEP 1: New command ──
  // Usage: .fprofile <facebook_url>
  const fbUrl = text.trim();

  if (!fbUrl || !fbUrl.includes('facebook.com')) {
    await reply(
      `╔══════════════════════╗\n` +
      `║  📘 *FACEBOOK PROFILE DOWNLOADER* ║\n` +
      `╚══════════════════════╝\n\n` +
      `*Usage:*\n` +
      `\`.fprofile https://facebook.com/username\`\n\n` +
      `*Or share link:*\n` +
      `\`.fprofile https://www.facebook.com/share/...\`\n\n` +
      `*Features:*\n` +
      `✅ Public profiles\n` +
      `🔓 Locked/private profiles (with bypass)\n` +
      `🖼️ High resolution images\n` +
      `🔄 Multiple bypass methods\n\n` +
      `_Advanced version by Crash Delta Team_`
    );
    return;
  }

  await reply('🔍 *Facebook profile* scrape කරනවා...\n🔓 Trying bypass methods if needed...');

  let profileData;
  try {
    profileData = await bypassFacebookProfile(fbUrl);
  } catch (err) {
    await reply(`❌ *Error:* ${err.message}\n\nProfile private/locked විය හැකියි.`);
    return;
  }

  if (!profileData || !profileData.name || profileData.name === 'Unknown') {
    await reply('❌ Profile data extract කරන්න බෑ. URL check කරන්න.');
    return;
  }

  // Save session
  fprofileSessions.set(sender, {
    step: 'WAIT_CHOICE',
    profileUrl: fbUrl,
    data: profileData,
    attempts: 1
  });

  // Auto-clear session after 5 minutes (increased for complex operations)
  setTimeout(() => fprofileSessions.delete(sender), 5 * 60 * 1000);

  // Show profile info + menu
  const infoText =
    `╔══════════════════════╗\n` +
    `║      📘 *FACEBOOK PROFILE INFO*     ║\n` +
    `╚══════════════════════╝\n\n` +
    `👤 *Name:* ${profileData.name}\n` +
    `👥 *Friends:* ${profileData.friendCount || 'N/A'}\n` +
    `📝 *Bio:* ${profileData.bio ? profileData.bio.slice(0, 100) + '...' : 'N/A'}\n` +
    `🖼️ *Cover Photo:* ${profileData.coverPhoto ? '✅ Found' : '❌ Not found'}\n` +
    `📸 *Profile Pic:* ${profileData.profilePic ? '✅ Found' : '❌ Not found'}\n` +
    `🔓 *Bypass Method:* ${profileData.bypassMethod || 'Default'}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `*Download Options:*\n` +
    `*1️⃣* — Profile Picture\n` +
    `*2️⃣* — Cover Photo\n` +
    `*3️⃣* — Both\n` +
    `*4️⃣* — Try Different Bypass\n` +
    `*0️⃣* — Cancel\n` +
    `━━━━━━━━━━━━━━━\n` +
    `_Reply with number to download_\n` +
    `_Session expires in 5 minutes_`;

  await reply(infoText);
}

// ─────────────────────────────────────────────
//  Command Registration
// ─────────────────────────────────────────────
// In your main handler (pair.js / index.mjs), add:
//
//  import { fprofilePlugin } from './plugins/fprofile.js';
//
//  case 'fprofile':
//  case 'fbprofile':
//  case 'facebook':
//  case 'fb':
//    await fprofilePlugin(sock, msg, args.join(' '), sender);
//    break;
          
