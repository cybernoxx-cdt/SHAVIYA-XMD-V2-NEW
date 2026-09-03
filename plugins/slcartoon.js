const axios = require("axios");
const { cmd } = require("../command");

const API_KEY =
  process.env.ZANTA_API_KEY ||
  "YOUR_API_KEY_HERE";

const SEARCH_API =
  "https://api.zanta-mini.store/api/slcartoons/search";

const DOWNLOAD_API =
  "https://api.zanta-mini.store/api/slcartoons/dl";

/* =========================================================
   HELPERS
========================================================= */

function unwrapMessage(message) {
  if (!message) return null;

  if (message.ephemeralMessage?.message) {
    return unwrapMessage(message.ephemeralMessage.message);
  }

  if (message.viewOnceMessage?.message) {
    return unwrapMessage(message.viewOnceMessage.message);
  }

  if (message.viewOnceMessageV2?.message) {
    return unwrapMessage(message.viewOnceMessageV2.message);
  }

  if (message.viewOnceMessageV2Extension?.message) {
    return unwrapMessage(message.viewOnceMessageV2Extension.message);
  }

  return message;
}


function getContextInfo(message) {
  const msg = unwrapMessage(message);

  if (!msg) return null;

  const types = [
    "extendedTextMessage",
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "documentMessage",
    "stickerMessage",
    "buttonsResponseMessage",
    "listResponseMessage",
    "templateButtonReplyMessage",
  ];

  for (const type of types) {
    if (msg[type]?.contextInfo) {
      return msg[type].contextInfo;
    }
  }

  return null;
}


function getMessageText(message) {
  const msg = unwrapMessage(message);

  if (!msg) return "";

  if (typeof msg.conversation === "string") {
    return msg.conversation;
  }

  if (msg.extendedTextMessage?.text) {
    return msg.extendedTextMessage.text;
  }

  if (msg.imageMessage?.caption) {
    return msg.imageMessage.caption;
  }

  if (msg.videoMessage?.caption) {
    return msg.videoMessage.caption;
  }

  if (msg.documentMessage?.caption) {
    return msg.documentMessage.caption;
  }

  if (msg.buttonsResponseMessage?.selectedButtonId) {
    return msg.buttonsResponseMessage.selectedButtonId;
  }

  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  }

  if (msg.templateButtonReplyMessage?.selectedId) {
    return msg.templateButtonReplyMessage.selectedId;
  }

  return "";
}


function normalizeNumber(jid) {
  if (!jid) return "";

  return String(jid)
    .split("@")[0]
    .replace(/[^0-9]/g, "");
}


function isSameUser(incoming, sender) {
  const incomingParticipant =
    incoming?.key?.participant ||
    incoming?.participant ||
    incoming?.key?.remoteJid ||
    "";

  const incomingNum = normalizeNumber(incomingParticipant);
  const senderNum = normalizeNumber(sender);

  if (incomingParticipant === sender) {
    return true;
  }

  if (incomingNum && senderNum && incomingNum === senderNum) {
    return true;
  }

  // WhatsApp LID support
  if (String(incomingParticipant).endsWith("@lid")) {
    return true;
  }

  return false;
}


/*
 * Check whether this incoming message is a reply
 * to the exact menu message we sent.
 */
function isReplyTo(incomingMessage, targetMessageId) {
  if (!incomingMessage?.message) return false;
  if (!targetMessageId) return false;

  const contextInfo = getContextInfo(incomingMessage.message);

  if (!contextInfo) return false;

  return contextInfo.stanzaId === targetMessageId;
}


/*
 * Wait for a NUMBER reply to a specific WhatsApp message.
 *
 * This is intentionally using conn.ev.on("messages.upsert")
 * exactly like the working .cz2 style.
 */
function waitForReply(conn, from, sender, targetMessageId, timeout = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    let finished = false;

    const cleanup = () => {
      try {
        conn.ev.off("messages.upsert", listener);
      } catch (e) {}

      clearTimeout(timer);
    };

    const finish = (value) => {
      if (finished) return;

      finished = true;
      cleanup();
      resolve(value);
    };

    const listener = async (update) => {
      try {
        if (!update) return;

        /*
         * Ignore append/history events.
         * We only want live incoming replies.
         */
        if (update.type === "append") return;

        const messages = update.messages || [];

        for (const incoming of messages) {
          try {
            if (!incoming?.message) continue;

            /*
             * Same chat only
             */
            if (incoming.key?.remoteJid !== from) {
              continue;
            }

            /*
             * Ignore bot's own messages
             */
            if (incoming.key?.fromMe) {
              continue;
            }

            /*
             * Must be a reply to our menu
             */
            if (!isReplyTo(incoming, targetMessageId)) {
              continue;
            }

            /*
             * Must be the same user who used the command
             */
            if (!isSameUser(incoming, sender)) {
              continue;
            }

            const text = getMessageText(incoming);

            if (!text) continue;

            const clean = text.trim();

            /*
             * Only accept numbers
             */
            if (!/^\d+$/.test(clean)) {
              continue;
            }

            const number = parseInt(clean, 10);

            finish({
              number,
              text: clean,
              message: incoming,
            });

            return;
          } catch (err) {
            console.error("SL CARTOON REPLY ERROR:", err);
          }
        }
      } catch (err) {
        console.error("SL CARTOON LISTENER ERROR:", err);
      }
    };

    conn.ev.on("messages.upsert", listener);

    const timer = setTimeout(() => {
      finish(null);
    }, timeout);
  });
}


/* =========================================================
   API
========================================================= */

async function searchCartoon(query) {
  const response = await axios.get(SEARCH_API, {
    params: {
      apiKey: API_KEY,
      text: query,
    },
    timeout: 30000,
  });

  return response.data;
}


async function downloadCartoon(url) {
  const response = await axios.get(DOWNLOAD_API, {
    params: {
      apiKey: API_KEY,
      text: url,
    },
    timeout: 60000,
  });

  return response.data;
}


/* =========================================================
   MAIN COMMAND
========================================================= */

cmd(
  {
    pattern: "slcartoon",
    alias: [
      "slcartoons",
      "sc",
      "cartoon",
    ],
    react: "🎬",
    desc: "Search Sinhala dubbed cartoons",
    category: "download",
    fromMe: false,
    filename: __filename,
  },

  async (
    conn,
    mek,
    m,
    {
      from,
      q,
      sender,
      reply,
    }
  ) => {
    try {
      /*
       * Search query
       */
      if (!q || !q.trim()) {
        return reply(
          "❌ Please enter a cartoon name.\n\n" +
          "Example:\n" +
          ".slcartoon Ben 10"
        );
      }

      const query = q.trim();

      await conn.sendMessage(
        from,
        {
          react: {
            text: "🔎",
            key: mek.key,
          },
        }
      );

      /*
       * Search API
       */
      const data = await searchCartoon(query);

      if (!data?.success) {
        return reply(
          "❌ Cartoon search failed.\n\n" +
          "Please try again later."
        );
      }

      const results = Array.isArray(data.results)
        ? data.results
        : [];

      if (!results.length) {
        return reply(
          `❌ No cartoons found for: *${query}*`
        );
      }


      /* =====================================================
         SEARCH RESULT MENU
      ===================================================== */

      let menu = "";

      menu += "╭━━━〔 🎬 SL CARTOON 〕━━━╮\n";
      menu += `┃ 🔎 Search: *${query}*\n`;
      menu += `┃ 📚 Results: *${results.length}*\n`;
      menu += "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n";

      results.forEach((item, index) => {
        const number = index + 1;

        const title =
          item.title ||
          "Unknown Cartoon";

        const rating =
          item.rating ||
          "N/A";

        const quality =
          item.quality ||
          "HD";

        menu += `*${number}.* ${title}\n`;
        menu += `   ⭐ ${rating}  •  🎞️ ${quality}\n\n`;
      });

      menu +=
        "╭━━〔 🎯 SELECT 〕━━╮\n" +
        "┃ Reply with the number\n" +
        "┃ Example: *1*\n" +
        "┃\n" +
        "┃ ⏳ Menu expires in 10 minutes\n" +
        "╰━━━━━━━━━━━━━━━━━━╯";


      const listMsg = await conn.sendMessage(
        from,
        {
          text: menu,
        },
        {
          quoted: mek,
        }
      );

      /*
       * IMPORTANT:
       *
       * We use the actual sent message ID.
       * The incoming reply's contextInfo.stanzaId
       * must match this ID.
       */
      const listMsgId =
        listMsg?.key?.id;

      if (!listMsgId) {
        return reply(
          "❌ Could not create reply listener."
        );
      }


      /* =====================================================
         WAIT FOR SEARCH RESULT NUMBER
      ===================================================== */

      const selected = await waitForReply(
        conn,
        from,
        sender,
        listMsgId,
        10 * 60 * 1000
      );

      if (!selected) {
        return;
      }


      /* =====================================================
         VALIDATE RESULT NUMBER
      ===================================================== */

      const selectedIndex =
        selected.number - 1;

      if (
        selectedIndex < 0 ||
        selectedIndex >= results.length
      ) {
        await conn.sendMessage(
          from,
          {
            text:
              `❌ Invalid number.\n\n` +
              `Please choose a number from *1* to *${results.length}*.`,
          },
          {
            quoted: selected.message,
          }
        );

        return;
      }


      const selectedCartoon =
        results[selectedIndex];

      const cartoonTitle =
        selectedCartoon.title ||
        "Unknown Cartoon";

      const cartoonUrl =
        selectedCartoon.url;

      if (!cartoonUrl) {
        return conn.sendMessage(
          from,
          {
            text:
              "❌ Download URL not found for this cartoon.",
          },
          {
            quoted: selected.message,
          }
        );
      }


      /* =====================================================
         GET EPISODES
      ===================================================== */

      await conn.sendMessage(
        from,
        {
          text:
            `⏳ Getting episodes for:\n*${cartoonTitle}*`,
        },
        {
          quoted: selected.message,
        }
      );

      const downloadData =
        await downloadCartoon(cartoonUrl);

      if (
        !downloadData?.success ||
        !downloadData?.results
      ) {
        return conn.sendMessage(
          from,
          {
            text:
              "❌ Failed to get cartoon episodes.",
          },
          {
            quoted: selected.message,
          }
        );
      }

      const cartoon =
        downloadData.results;

      const episodes =
        Array.isArray(cartoon.episodes)
          ? cartoon.episodes
          : [];

      if (!episodes.length) {
        return conn.sendMessage(
          from,
          {
            text:
              "❌ No episodes found for this cartoon.",
          },
          {
            quoted: selected.message,
          }
        );
      }


      /* =====================================================
         EPISODE MENU
      ===================================================== */

      let episodeMenu = "";

      episodeMenu +=
        "╭━━━〔 🎬 EPISODES 〕━━━╮\n";

      episodeMenu +=
        `┃ 📺 ${cartoonTitle}\n`;

      episodeMenu +=
        `┃ 🎞️ Episodes: *${episodes.length}*\n`;

      episodeMenu +=
        "╰━━━━━━━━━━━━━━━━━━━━━╯\n\n";


      episodes.forEach((episode, index) => {
        const number = index + 1;

        const ep =
          episode.episode ||
          String(number).padStart(2, "0");

        const title =
          episode.title ||
          `Episode ${ep}`;

        episodeMenu +=
          `*${number}.* EP ${ep} — ${title}\n`;
      });


      episodeMenu +=
        "\n╭━━〔 🎯 SELECT EPISODE 〕━━╮\n" +
        "┃ Reply with episode number\n" +
        "┃ Example: *1*\n" +
        "┃\n" +
        "┃ ⏳ Menu expires in 10 minutes\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━━╯";


      const epMenu =
        await conn.sendMessage(
          from,
          {
            text: episodeMenu,
          },
          {
            quoted: selected.message,
          }
        );


      const epMenuId =
        epMenu?.key?.id;

      if (!epMenuId) {
        return reply(
          "❌ Could not create episode listener."
        );
      }


      /* =====================================================
         WAIT FOR EPISODE NUMBER
      ===================================================== */

      const epSelected =
        await waitForReply(
          conn,
          from,
          sender,
          epMenuId,
          10 * 60 * 1000
        );

      if (!epSelected) {
        return;
      }


      /* =====================================================
         VALIDATE EPISODE
      ===================================================== */

      const episodeIndex =
        epSelected.number - 1;

      if (
        episodeIndex < 0 ||
        episodeIndex >= episodes.length
      ) {
        return conn.sendMessage(
          from,
          {
            text:
              `❌ Invalid episode number.\n\n` +
              `Choose from *1* to *${episodes.length}*.`,
          },
          {
            quoted: epSelected.message,
          }
        );
      }


      const episode =
        episodes[episodeIndex];

      const streamUrl =
        episode.stream_url ||
        episode.url ||
        episode.download_url;

      if (!streamUrl) {
        return conn.sendMessage(
          from,
          {
            text:
              "❌ Video URL not found for this episode.",
          },
          {
            quoted: epSelected.message,
          }
        );
      }


      /* =====================================================
         SEND SELECTED VIDEO
      ===================================================== */

      const epNumber =
        episode.episode ||
        String(epSelected.number).padStart(2, "0");

      const epTitle =
        episode.title ||
        `Episode ${epNumber}`;


      await conn.sendMessage(
        from,
        {
          text:
            `⏳ Downloading / sending...\n\n` +
            `🎬 *${cartoonTitle}*\n` +
            `📺 *${epTitle}*\n\n` +
            `Please wait...`,
        },
        {
          quoted: epSelected.message,
        }
      );


      try {
        await conn.sendMessage(
          from,
          {
            video: {
              url: streamUrl,
            },

            mimetype: "video/mp4",

            fileName:
              `${cartoonTitle} - Episode ${epNumber}.mp4`,

            caption:
              `🎬 *${cartoonTitle}*\n\n` +
              `📺 *${epTitle}*\n` +
              `🎞️ Episode: *${epNumber}*\n\n` +
              `> Powered by SL Cartoon`,
          },
        );
      } catch (videoError) {
        console.error(
          "SL CARTOON VIDEO ERROR:",
          videoError
        );

        /*
         * Fallback:
         * If WhatsApp/Baileys fails to send as video,
         * send the direct URL instead.
         */
        await conn.sendMessage(
          from,
          {
            text:
              `❌ Video sending failed.\n\n` +
              `🎬 *${cartoonTitle}*\n` +
              `📺 *${epTitle}*\n\n` +
              `🔗 Direct Link:\n${streamUrl}`,
          },
          {
            quoted: epSelected.message,
          }
        );
      }


      /* =====================================================
         DONE REACTION
      ===================================================== */

      await conn.sendMessage(
        from,
        {
          react: {
            text: "✅",
            key: epSelected.message.key,
          },
        }
      );

    } catch (error) {
      console.error(
        "SL CARTOON PLUGIN ERROR:",
        error
      );

      try {
        await reply(
          "❌ An error occurred while processing the cartoon.\n\n" +
          "Please try again."
        );
      } catch (e) {}
    }
  }
);
