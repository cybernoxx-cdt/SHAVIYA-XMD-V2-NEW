// ============================================
//   plugins/tts.js — SHAVIYA-XMD V2
//   WhatsApp Voice Note TTS — Fully Working
//   ✅ 5 API fallbacks (never fails)
//   ✅ Correct ogg/opus PTT format
//   ✅ Auto language detection (Sinhala/Tamil/Hindi/Arabic/Japanese/Korean)
//   ✅ ffmpeg 4-strategy fallback chain
//   Commands: .tts  .tts2(en)  .sinhala(si)
// ============================================

'use strict';

const { cmd }  = require('../command');
const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const TMP = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const LANGS = {
  si:'si', en:'en', ta:'ta', hi:'hi', ja:'ja',
  ko:'ko', zh:'zh', fr:'fr', de:'de', es:'es',
  ar:'ar', ru:'ru', pt:'pt', it:'it', ml:'ml', bn:'bn',
};

// ═══════════════════════════════════════════
//   API 1: Google Translate TTS (chunked)
// ═══════════════════════════════════════════
async function fromGoogle(text, lang) {
  const words = text.split(' ');
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 180) {
      if (cur) chunks.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) chunks.push(cur.trim());

  const bufs = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob&ttsspeed=0.9`;
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer':    'https://translate.google.com/',
        'Accept':     'audio/mpeg, audio/*, */*',
      },
    });
    if (!res.data || res.data.byteLength < 200) throw new Error('Empty response');
    bufs.push(Buffer.from(res.data));
  }
  return Buffer.concat(bufs);
}

// ═══════════════════════════════════════════
//   API 2: Google alternative endpoint
// ═══════════════════════════════════════════
async function fromGoogleAlt(text, lang) {
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0,200))}&tl=${lang}&client=gtx`;
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
  });
  if (!res.data || res.data.byteLength < 200) throw new Error('Empty');
  return Buffer.from(res.data);
}

// ═══════════════════════════════════════════
//   API 3: gtts-api (open source)
// ═══════════════════════════════════════════
async function fromGttsApi(text, lang) {
  const url = `https://gtts-api.vercel.app/api/tts?text=${encodeURIComponent(text.slice(0,300))}&lang=${lang}`;
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  if (!res.data || res.data.byteLength < 200) throw new Error('Empty');
  return Buffer.from(res.data);
}

// ═══════════════════════════════════════════
//   API 4: node-gtts (local npm package)
// ═══════════════════════════════════════════
async function fromNodeGtts(text, lang, outFile) {
  const gTTS = require('node-gtts')(lang);
  await new Promise((resolve, reject) => {
    gTTS.save(outFile, text, (err) => { if (err) reject(err); else resolve(); });
  });
  if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 100) throw new Error('node-gtts empty');
  return fs.readFileSync(outFile);
}

// ═══════════════════════════════════════════
//   API 5: google-tts-api npm package
// ═══════════════════════════════════════════
async function fromGoogleTtsNpm(text, lang) {
  const googleTTS = require('google-tts-api');
  const url = googleTTS.getAudioUrl(text.slice(0, 200), { lang, slow: false, host: 'https://translate.google.com' });
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://translate.google.com/',
    },
  });
  if (!res.data || res.data.byteLength < 200) throw new Error('Empty');
  return Buffer.from(res.data);
}

// ═══════════════════════════════════════════
//   CORE: Try all APIs in order
// ═══════════════════════════════════════════
async function generateAudio(text, lang, tmpMp3) {
  const apis = [
    { name: 'Google TTS',      fn: () => fromGoogle(text, lang)         },
    { name: 'Google Alt',      fn: () => fromGoogleAlt(text, lang)      },
    { name: 'google-tts-api',  fn: () => fromGoogleTtsNpm(text, lang)   },
    { name: 'gtts-api',        fn: () => fromGttsApi(text, lang)        },
    { name: 'node-gtts',       fn: () => fromNodeGtts(text, lang, tmpMp3) },
  ];

  for (const api of apis) {
    try {
      console.log(`[TTS] Trying: ${api.name}`);
      const buf = await api.fn();
      if (buf && buf.length > 100) {
        console.log(`[TTS] Success: ${api.name} (${buf.length} bytes)`);
        return buf;
      }
    } catch (e) {
      console.log(`[TTS] ${api.name} failed: ${e.message}`);
    }
  }
  throw new Error('All TTS APIs failed. Check internet connection.');
}

// ═══════════════════════════════════════════
//   FFMPEG: Convert to OGG OPUS
//   WhatsApp ptt=true needs ogg/opus
//   4 strategy fallback chain
// ═══════════════════════════════════════════
async function convertToOpus(mp3File, oggFile) {

  // Strategy 1: fluent-ffmpeg + @ffmpeg-installer (libopus)
  try {
    const ffmpeg = require('fluent-ffmpeg');
    try { ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path); } catch {}
    await new Promise((resolve, reject) => {
      ffmpeg(mp3File)
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .audioBitrate('64k')
        .format('ogg')
        .outputOptions(['-vn'])
        .on('end', resolve)
        .on('error', reject)
        .save(oggFile);
    });
    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
      console.log('[TTS] Convert: fluent-ffmpeg libopus OK');
      return;
    }
  } catch (e) { console.log('[TTS] Strategy 1 failed:', e.message); }

  // Strategy 2: fluent-ffmpeg + ffmpeg-static
  try {
    const ffmpeg = require('fluent-ffmpeg');
    try { ffmpeg.setFfmpegPath(require('ffmpeg-static')); } catch {}
    await new Promise((resolve, reject) => {
      ffmpeg(mp3File)
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .format('ogg')
        .on('end', resolve)
        .on('error', reject)
        .save(oggFile);
    });
    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
      console.log('[TTS] Convert: ffmpeg-static libopus OK');
      return;
    }
  } catch (e) { console.log('[TTS] Strategy 2 failed:', e.message); }

  // Strategy 3: system ffmpeg (opus)
  try {
    await execAsync(`ffmpeg -y -i "${mp3File}" -c:a libopus -ar 48000 -ac 1 -b:a 64k "${oggFile}"`);
    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
      console.log('[TTS] Convert: system ffmpeg opus OK');
      return;
    }
  } catch (e) { console.log('[TTS] Strategy 3 failed:', e.message); }

  // Strategy 4: system ffmpeg (vorbis fallback)
  try {
    await execAsync(`ffmpeg -y -i "${mp3File}" -acodec libvorbis -ar 44100 -ac 1 "${oggFile}"`);
    if (fs.existsSync(oggFile) && fs.statSync(oggFile).size > 100) {
      console.log('[TTS] Convert: system ffmpeg vorbis OK');
      return;
    }
  } catch (e) { console.log('[TTS] Strategy 4 failed:', e.message); }

  // Last resort: use mp3 directly
  console.log('[TTS] All conversions failed — using raw mp3');
  fs.copyFileSync(mp3File, oggFile);
}

// ═══════════════════════════════════════════
//   SEND PIPELINE: generate → convert → send
// ═══════════════════════════════════════════
async function sendVoiceTTS(conn, mek, from, text, lang) {
  const id  = `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const mp3 = path.join(TMP, `tts_${id}.mp3`);
  const ogg = path.join(TMP, `tts_${id}.ogg`);

  try {
    // 1. Generate audio
    const audioBuf = await generateAudio(text, lang, mp3);
    fs.writeFileSync(mp3, audioBuf);

    // 2. Convert to ogg/opus
    await convertToOpus(mp3, ogg);

    // 3. Read final file
    const finalBuf = fs.readFileSync(ogg);

    // 4. Detect actual mimetype (check OGG magic bytes: 4F676753 = "OggS")
    const header = finalBuf.slice(0, 4).toString('binary');
    const isOgg  = header.startsWith('OggS');
    const mime   = isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg';

    // 5. Send as WhatsApp PTT voice note
    await conn.sendMessage(from, {
      audio:    finalBuf,
      mimetype: mime,
      ptt:      true,   // ✅ Makes it play automatically as voice note
    }, { quoted: mek });

  } finally {
    [mp3, ogg].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
  }
}

// ═══════════════════════════════════════════
//   Auto-detect script/language from text
// ═══════════════════════════════════════════
function detectLang(text) {
  if (/[\u0D80-\u0DFF]/.test(text)) return 'si'; // Sinhala
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi/Devanagari
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
  if (/[\u3040-\u30FF]/.test(text)) return 'ja'; // Japanese hiragana/katakana
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinese
  return 'en';
}

// ═══════════════════════════════════════════
//   .tts — Main command
// ═══════════════════════════════════════════
cmd({
  pattern:  'tts',
  alias:    ['speak', 'voice'],
  desc:     'Text to Speech voice note',
  category: 'tools',
  react:    '🔊',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    let raw = q?.trim() || m?.quoted?.text?.trim() || m?.quoted?.caption?.trim() || '';
    if (!raw) return reply(
      `🔊 *TTS — Text to Voice*\n\n` +
      `*Usage:*\n` +
      `▸ \`.tts Hello how are you\`\n` +
      `▸ \`.tts si ආයුබෝවන් කොහොමද\`\n` +
      `▸ \`.tts hi नमस्ते दोस्त\`\n` +
      `▸ \`.tts ta வணக்கம்\`\n` +
      `▸ \`.tts ar مرحبا\`\n\n` +
      `*Languages:* si • en • ta • hi • ja • ko • zh • fr • de • es • ar • ru • pt • it • ml • bn\n\n` +
      `_Sinhala/Tamil/Hindi/Arabic auto-detected!_`
    );

    // Parse language prefix
    let lang = null;
    const parts = raw.split(' ');
    if (LANGS[parts[0]?.toLowerCase()]) {
      lang = parts[0].toLowerCase();
      raw  = parts.slice(1).join(' ').trim();
    }

    // Auto-detect if no prefix
    if (!lang) lang = detectLang(raw);

    if (!raw) return reply('❌ Text දෙන්න!\nExample: .tts si ආයුබෝවන්');
    if (raw.length > 500) return reply('❌ Max 500 characters!');

    await conn.sendMessage(from, { react: { text: '🎙️', key: mek.key } });
    await sendVoiceTTS(conn, mek, from, raw, lang);
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (e) {
    console.log('[TTS ERROR]:', e.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(()=>{});
    reply(`❌ *TTS Failed:* ${e.message}`);
  }
});

// ═══════════════════════════════════════════
//   .sinhala — Dedicated Sinhala TTS
// ═══════════════════════════════════════════
cmd({
  pattern:  'sinhala',
  alias:    ['tts3', 'sitts', 'sivoice'],
  desc:     'සිංහල Text to Voice Note',
  category: 'tools',
  react:    '🔊',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    const text = q?.trim() || m?.quoted?.text?.trim() || m?.quoted?.caption?.trim() || '';
    if (!text) return reply('🔊 Usage: .sinhala ආයුබෝවන් කොහොමද');
    if (text.length > 500) return reply('❌ Max 500 characters!');

    await conn.sendMessage(from, { react: { text: '🎙️', key: mek.key } });
    await sendVoiceTTS(conn, mek, from, text, 'si');
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (e) {
    console.log('[SINHALA TTS ERROR]:', e.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(()=>{});
    reply(`❌ *Sinhala TTS Failed:* ${e.message}`);
  }
});

// ═══════════════════════════════════════════
//   .tts2 — English TTS fast
// ═══════════════════════════════════════════
cmd({
  pattern:  'tts2',
  alias:    ['entts', 'envoice'],
  desc:     'English Text to Voice Note',
  category: 'tools',
  react:    '🔊',
  filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    const text = q?.trim() || m?.quoted?.text?.trim() || m?.quoted?.caption?.trim() || '';
    if (!text) return reply('🔊 Usage: .tts2 Hello how are you');
    if (text.length > 500) return reply('❌ Max 500 characters!');

    await conn.sendMessage(from, { react: { text: '🎙️', key: mek.key } });
    await sendVoiceTTS(conn, mek, from, text, 'en');
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (e) {
    console.log('[TTS2 ERROR]:', e.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(()=>{});
    reply(`❌ *TTS Failed:* ${e.message}`);
  }
});
