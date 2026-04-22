const axios = require("axios");

module.exports = {
  name: "bypass",
  command: ["bypass"],
  description: "Bypass GPLink and get direct URL",

  async execute(client, message, args) {
    try {
      // ❌ No link
      if (!args[0]) {
        return message.reply("❌ Usage: .bypass <gplink url>");
      }

      const url = args[0];

      // ⚠️ Validate link
      if (!url.includes("gplinks")) {
        return message.reply("⚠️ Please send a valid GPLink URL");
      }

      message.reply("⏳ Bypassing link...");

      // 🔄 Try multiple APIs (fallback system)
      const apis = [
        `https://api.bypass.vip/?url=${encodeURIComponent(url)}`,
        `https://bypass.bot.nu/bypass?url=${encodeURIComponent(url)}`
      ];

      let finalLink = null;

      for (let api of apis) {
        try {
          const res = await axios.get(api, { timeout: 10000 });

          if (res.data.result) {
            finalLink = res.data.result;
            break;
          }

          // some APIs return different format
          if (res.data.destination) {
            finalLink = res.data.destination;
            break;
          }

        } catch (e) {
          continue;
        }
      }

      // ❌ All APIs failed
      if (!finalLink) {
        return message.reply("❌ Failed to bypass. Try again later.");
      }

      // ✅ Success
      return message.reply(
        `✅ Bypassed Successfully!\n\n🔗 ${finalLink}\n\n⚠️ Open link to get your key`
      );

    } catch (err) {
      console.error(err);
      return message.reply("❌ Error while bypassing link");
    }
  }
};
