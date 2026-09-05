```js
/**
 * ============================================================
 * SHAVIYA-XMD V2
 * WhiteShadow CineSubz API Plugin
 * ============================================================
 *
 * Commands:
 *   .cinesubz <movie name>
 *   .cine <movie name>
 *   .cz <movie name>
 *
 * Flow:
 *   Search
 *      ↓
 *   Show results
 *      ↓
 *   Reply with number
 *      ↓
 *   Extract selected movie
 *      ↓
 *   Show extracted API response
 *
 * API:
 *   Search:
 *   https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-search
 *
 *   Extract:
 *   https://whiteshadow-x-api.onrender.com/api/movie/cinesubz-extract
 *
 * API KEY:
 *   e76n2P
 *
 * ============================================================
 */

const axios = require("axios");
const { cmd } = require("../command");

// ============================================================
// CONFIG
// ============================================================

const API_BASE =
    "https://whiteshadow-x-api.onrender.com/api/movie";

const API_KEY = "e76n2P";

const SEARCH_ENDPOINT =
    `${API_BASE}/cinesubz-search`;

const EXTRACT_ENDPOINT =
    `${API_BASE}/cinesubz-extract`;

const MAX_RESULTS = 10;

const REPLY_TIMEOUT = 120000;

// ============================================================
// HELPERS
// ============================================================

function cleanText(text) {
    if (!text) return "";

    return String(text)
        .replace(/\r/g, "")
        .trim();
}

function safeTitle(title) {
    return String(title || "Movie")
        .replace(/[\\/:*?"<>|]/g, "")
        .substring(0, 150);
}

function detectType(item) {

    /*
     * API result URL normally contains:
     *
     * /movies/
     * /tvshows/
     */

    const url = String(item?.url || "").toLowerCase();

    if (
        url.includes("/tvshows/") ||
        url.includes("/tvshow/") ||
        url.includes("/series/")
    ) {
        return "tv";
    }

    return "mv";
}

// ============================================================
// REACT
// ============================================================

async function react(conn, jid, key, emoji) {

    try {

        await conn.sendMessage(jid, {
            react: {
                text: emoji,
                key
            }
        });

    } catch (_) {}

}

// ============================================================
// WAIT FOR REPLY
// ============================================================

function waitForReply(
    conn,
    from,
    replyToId,
    timeout = REPLY_TIMEOUT
) {

    return new Promise((resolve, reject) => {

        let finished = false;

        const cleanup = () => {

            if (finished) return;

            finished = true;

            try {
                conn.ev.off(
                    "messages.upsert",
                    handler
                );
            } catch (_) {}

        };

        const handler = (update) => {

            try {

                const msg =
                    update?.messages?.[0];

                if (!msg?.message) return;

                if (
                    msg.key?.remoteJid !== from
                ) {
                    return;
                }

                const message =
                    msg.message;

                const context =
                    message?.extendedTextMessage
                        ?.contextInfo;

                const text =
                    message?.conversation ||
                    message?.extendedTextMessage
                        ?.text ||
                    message?.imageMessage
                        ?.caption ||
                    message?.videoMessage
                        ?.caption ||
                    "";

                if (!text) return;

                if (
                    context?.stanzaId !== replyToId
                ) {
                    return;
                }

                cleanup();

                resolve({
                    msg,
                    text: cleanText(text)
                });

            } catch (_) {}

        };

        conn.ev.on(
            "messages.upsert",
            handler
        );

        setTimeout(() => {

            cleanup();

            reject(
                new Error(
                    "Reply timeout"
                )
            );

        }, timeout);

    });

}

// ============================================================
// API REQUEST
// ============================================================

async function apiGet(url, params = {}) {

    const response = await axios.get(
        url,
        {
            params,
            timeout: 45000,
            validateStatus: () => true,
            headers: {
                "User-Agent":
                    "SHAVIYA-XMD/2.0"
            }
        }
    );

    if (
        response.status < 200 ||
        response.status >= 300
    ) {

        throw new Error(
            `API HTTP ${response.status}`
        );

    }

    return response.data;

}

// ============================================================
// SEARCH
// ============================================================

async function searchCineSubz(query) {

    const data = await apiGet(
        SEARCH_ENDPOINT,
        {
            q: query,
            apitoken: API_KEY
        }
    );

    if (
        !data ||
        data.success !== true
    ) {

        return {
            success: false,
            results: []
        };

    }

    return {
        success: true,
        creator: data.creator,
        total: Number(data.total || 0),
        results: Array.isArray(data.results)
            ? data.results
            : []
    };

}

// ============================================================
// EXTRACT
// ============================================================

async function extractCineSubz(
    id,
    type
) {

    return await apiGet(
        EXTRACT_ENDPOINT,
        {
            id: id,
            type: type,
            apitoken: API_KEY
        }
    );

}

// ============================================================
// FORMAT SEARCH RESULTS
// ============================================================

function formatSearchResults(results) {

    let text =
        "╭━━━〔 🎬 CINESUBZ SEARCH 〕━━━╮\n\n";

    results.forEach((movie, index) => {

        const number =
            index + 1;

        const title =
            cleanText(movie.title) ||
            "Unknown";

        const year =
            movie.year ||
            "N/A";

        const imdb =
            movie.imdb ||
            "N/A";

        text +=
            `*${number}.* ${title}\n`;

        text +=
            `   📅 ${year}  ⭐ ${imdb}\n`;

        if (movie.genres) {

            text +=
                `   🎭 ${movie.genres}\n`;

        }

        text += "\n";

    });

    text +=
        "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n";

    text +=
        "↳ *Reply with the movie number*";

    return text;

}

// ============================================================
// FORMAT EXTRACT RESULT
// ============================================================

function formatExtractResponse(
    data,
    movie
) {

    let text =
        "╭━━━〔 🎬 CINESUBZ EXTRACT 〕━━━╮\n\n";

    text +=
        `🎬 *${cleanText(movie?.title)}*\n\n`;

    text +=
        `🆔 ID: ${movie?.id || "N/A"}\n`;

    text +=
        `📅 Year: ${movie?.year || "N/A"}\n`;

    text +=
        `⭐ IMDb: ${movie?.imdb || "N/A"}\n`;

    text +=
        `⏱️ Runtime: ${movie?.runtime || "N/A"}\n\n`;

    text +=
        "━━━━━━━━━━━━━━━━━━━━\n";

    text +=
        "📦 *EXTRACT API RESPONSE*\n\n";

    /*
     * We intentionally keep this generic because
     * different API versions may return different
     * extraction field names.
     */

    if (
        data &&
        typeof data === "object"
    ) {

        if (
            data.success !== undefined
        ) {

            text +=
                `✅ Success: ${data.success}\n`;

        }

        if (data.creator) {

            text +=
                `👤 Creator: ${data.creator}\n`;

        }

        if (data.message) {

            text +=
                `💬 ${data.message}\n`;

        }

        if (data.url) {

            text +=
                `🔗 URL: ${data.url}\n`;

        }

        if (data.download) {

            text +=
                `⬇️ Download: ${data.download}\n`;

        }

        if (data.data) {

            text +=
                "\n📁 Data found in API response.";

        }

    }

    text +=
        "\n\n━━━━━━━━━━━━━━━━━━━━\n";

    text +=
        "⚡ *WhiteShadow API*";

    return text;

}

// ============================================================
// MAIN COMMAND
// ============================================================

cmd({

    pattern: "cinesubz3",

    alias: [
        "cine3",
        "cz3"
    ],

    desc:
        "Search CineSubz using WhiteShadow API",

    category:
        "downloader",

    react:
        "🎬",

    filename:
        __filename

}, async (
    conn,
    mek,
    m,
    {
        from,
        q,
        reply
    }
) => {

    try {

        // ====================================================
        // QUERY CHECK
        // ====================================================

        const query =
            cleanText(q);

        if (!query) {

            return reply(
                "╭━━〔 🎬 CINESUBZ 〕━━╮\n\n" +
                "❌ Please enter a movie name.\n\n" +
                "Example:\n" +
                "`.cinesubz Batman`\n\n" +
                "or\n\n" +
                "`.cz Avengers`\n\n" +
                "╰━━━━━━━━━━━━━━━━━━╯"
            );

        }

        // ====================================================
        // SEARCH REACTION
        // ====================================================

        await react(
            conn,
            from,
            m.key,
            "🔍"
        );

        console.log(
            `[CINESUBZ] Searching: ${query}`
        );

        // ====================================================
        // SEARCH API
        // ====================================================

        const search =
            await searchCineSubz(
                query
            );

        console.log(
            "[CINESUBZ] Search response:",
            JSON.stringify(
                search,
                null,
                2
            )
        );

        if (
            !search.success ||
            !search.results.length
        ) {

            await react(
                conn,
                from,
                m.key,
                "❌"
            );

            return reply(
                `❌ *No results found for:* ${query}`
            );

        }

        // ====================================================
        // LIMIT RESULTS
        // ====================================================

        const results =
            search.results
                .slice(
                    0,
                    MAX_RESULTS
                );

        // ====================================================
        // SEND RESULT LIST
        // ====================================================

        const listText =
            formatSearchResults(
                results
            );

        const listMessage =
            await conn.sendMessage(
                from,
                {
                    text: listText
                },
                {
                    quoted: mek
                }
            );

        // ====================================================
        // WAIT FOR NUMBER
        // ====================================================

        let selected;

        try {

            selected =
                await waitForReply(
                    conn,
                    from,
                    listMessage.key.id
                );

        } catch (err) {

            return reply(
                "⌛ Selection timed out.\n\n" +
                "Please search again."
            );

        }

        // ====================================================
        // PARSE NUMBER
        // ====================================================

        const number =
            parseInt(
                selected.text
                    .replace(/[^0-9]/g, ""),
                10
            );

        if (
            !Number.isInteger(number) ||
            number < 1 ||
            number > results.length
        ) {

            await react(
                conn,
                from,
                selected.msg.key,
                "❌"
            );

            return reply(
                `❌ Invalid selection.\n\n` +
                `Choose a number between *1* and *${results.length}*.`
            );

        }

        const movie =
            results[number - 1];

        await react(
            conn,
            from,
            selected.msg.key,
            "🎬"
        );

        // ====================================================
        // MOVIE TYPE
        // ====================================================

        const type =
            detectType(movie);

        console.log(
            `[CINESUBZ] Selected: ${movie.title}`
        );

        console.log(
            `[CINESUBZ] ID: ${movie.id}`
        );

        console.log(
            `[CINESUBZ] Type: ${type}`
        );

        // ====================================================
        // SEND SELECTED INFO
        // ====================================================

        let selectedText =
            "╭━━━〔 🎬 SELECTED 〕━━━╮\n\n";

        selectedText +=
            `🎬 *${cleanText(movie.title)}*\n\n`;

        selectedText +=
            `🆔 *ID:* ${movie.id || "N/A"}\n`;

        selectedText +=
            `📅 *Year:* ${movie.year || "N/A"}\n`;

        selectedText +=
            `⭐ *IMDb:* ${movie.imdb || "N/A"}\n`;

        selectedText +=
            `⏱️ *Runtime:* ${movie.runtime || "N/A"}\n`;

        selectedText +=
            `🎭 *Genres:* ${movie.genres || "N/A"}\n`;

        selectedText +=
            `📺 *Type:* ${type === "tv" ? "TV Series" : "Movie"}\n\n`;

        selectedText +=
            "⏳ Extracting download information...";

        const processingMessage =
            await conn.sendMessage(
                from,
                {
                    text: selectedText
                },
                {
                    quoted: selected.msg
                }
            );

        // ====================================================
        // EXTRACT API
        // ====================================================

        await react(
            conn,
            from,
            processingMessage.key,
            "⏳"
        );

        const extracted =
            await extractCineSubz(
                movie.id,
                type
            );

        console.log(
            "[CINESUBZ] Extract response:",
            JSON.stringify(
                extracted,
                null,
                2
            )
        );

        // ====================================================
        // EXTRACT FAILED
        // ====================================================

        if (
            !extracted
        ) {

            await react(
                conn,
                from,
                processingMessage.key,
                "❌"
            );

            return reply(
                "❌ Extract API returned an empty response."
            );

        }

        if (
            extracted.success === false
        ) {

            await react(
                conn,
                from,
                processingMessage.key,
                "❌"
            );

            return reply(
                "❌ Failed to extract movie information.\n\n" +
                `Message: ${extracted.message || "Unknown API error"}`
            );

        }

        // ====================================================
        // SEND EXTRACT RESULT
        // ====================================================

        const extractText =
            formatExtractResponse(
                extracted,
                movie
            );

        await conn.sendMessage(
            from,
            {
                text: extractText
            },
            {
                quoted: processingMessage
            }
        );

        // ====================================================
        // POSTER
        // ====================================================

        if (movie.img) {

            try {

                await conn.sendMessage(
                    from,
                    {
                        image: {
                            url: movie.img
                        },
                        caption:
                            `🎬 *${cleanText(movie.title)}*\n\n` +
                            `🆔 ID: ${movie.id}\n` +
                            `📅 ${movie.year || "N/A"}\n` +
                            `⭐ IMDb: ${movie.imdb || "N/A"}\n` +
                            `📺 ${type === "tv" ? "TV Series" : "Movie"}`
                    },
                    {
                        quoted: processingMessage
                    }
                );

            } catch (posterError) {

                console.log(
                    "[CINESUBZ] Poster error:",
                    posterError.message
                );

            }

        }

        await react(
            conn,
            from,
            processingMessage.key,
            "✅"
        );

    } catch (error) {

        console.error(
            "[CINESUBZ] CRITICAL ERROR:",
            error
        );

        await react(
            conn,
            from,
            m.key,
            "❌"
        );

        return reply(
            "❌ *CineSubz Error*\n\n" +
            `${error.message || "Unknown error"}`
        );

    }

});

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    searchCineSubz,
    extractCineSubz,
    detectType
};
```
