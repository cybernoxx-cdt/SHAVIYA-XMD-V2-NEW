const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

cmd({
  pattern: 'setdpmeme',
  desc: 'Set bot profile picture from a meme',
  category: 'more',
  filename: __filename
}, async (conn, m) => {
  try {
    // ✅ Owner check
    const sender = m.sender?.split('@')[0] || '';
    const ownerNum = (config.OWNER_NUM || config.owner || '')
      .toString()
      .replace(/[^0-9]/g, '');

    if (sender !== ownerNum) {
      return m.reply('❌ Only the bot owner can use this command.');
    }

    await m.reply('⏳ Fetching meme...');

    // 🖼️ Fetch meme JSON
    const { data: json } = await axios.get('https://meme-api.com/gimme', {
      timeout: 10000
    });

    if (!json?.url) return m.reply('❌ Failed to get meme URL.');

    // 📥 Download image as buffer
    const { data: imgData } = await axios.get(json.url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const buffer = Buffer.from(imgData);

    // 🛡️ Set profile picture
    await conn.updateProfilePicture(conn.user.id, buffer);

    return m.reply(`✅ Meme DP set!\n📌 *${json.title || 'Meme'}*\n🔗 r/${json.subreddit || 'memes'}`);

  } catch (err) {
    console.error('[setdpmeme]', err.message);

    if (err.message?.includes('not-authorized')) {
      return m.reply('❌ Bot not authorized to change DP.\nWhatsApp privacy settings check කරන්න.');
    }
    return m.reply('❌ Failed to set meme DP. Try again.');
  }
});
