/**
 * ============================================================
 * SHAVIYA-XMD V2
 * WhiteShadow CineSubz V3 Plugin
 * ============================================================
 *
 * Command:
 *   .cz3 <movie name>
 *
 * Flow:
 *   Search -> reply with number -> extract -> show servers
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
const API_TIMEOUT = 45000;

// Pending reply sessions
const pending = new Map();

// ============================================================
// TEXT HELPERS
// ============================================================

function cleanText(value) {
    return String(value ?? "")
        .replace(/\r/g, "")
        .trim();
}

// ============================================================
// MESSAGE TEXT
// ============================================================

function getMessageText(message) {
    if (!message) return "";

    return cleanText(
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.buttonsResponseMessage?.selectedButtonId ||
        message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ""
    );
}

// ============================================================
// UNWRAP MESSAGE
// ============================================================

function unwrapMessage(message) {
    if (!message) return null;

    return (
        message.ephemeralMessage?.message ||
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.viewOnceMessageV2Extension?.message ||
        message
    );
}

// ============================================================
// CONTEXT INFO
// ============================================================

function getContextInfo(message) {
    const msg = unwrapMessage(message);

    return (
        msg?.extendedTextMessage?.contextInfo ||
        msg?.imageMessage?.contextInfo ||
        msg?.videoMessage?.contextInfo ||
        msg?.documentMessage?.contextInfo ||
        null
    );
}

// ============================================================
// DETECT MOVIE / TV
// ============================================================

function detectType(item) {
    const url = cleanText(item?.url).toLowerCase();

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
// REACTION
// ============================================================

async function react(conn, jid, key, emoji) {
    try {
        if (!key) return;

        await conn.sendMessage(jid, {
            react: {
                text: emoji,
                key
            }
        });
    } catch (_) {}
}

// ============================================================
// API ERROR
// ============================================================

function apiErrorMessage(error) {
    if (error?.response) {
        const status = error.response.status;
        const body = error.response.data;

        if (body?.message) {
            return `HTTP ${status}: ${body.message}`;
        }

        if (body?.error) {
            return `HTTP ${status}: ${body.error}`;
        }

        return `HTTP ${status}`;
    }

    if (error?.code === "ECONNABORTED") {
        return "API request timed out.";
    }

    return error?.message || "Unknown API error";
}

// ============================================================
// API GET
// ============================================================

async function apiGet(url, params = {}) {
    const response = await axios.get(url, {
        params,
        timeout: API_TIMEOUT,

        validateStatus: () => true,

        headers: {
            Accept: "application/json",
            "User-Agent": "SHAVIYA-XMD/2.0"
        }
    });

    if (
        response.status < 200 ||
        response.status >= 300
    ) {
        const message =
            response.data?.message ||
            response.data?.error ||
            `HTTP ${response.status}`;

        throw new Error(message);
    }

    if (
        !response.data ||
        typeof response.data !== "object"
    ) {
        throw new Error(
            "API returned invalid JSON."
        );
    }

    return response.data;
}

// ============================================================
// SEARCH CINESUBZ
// ============================================================

async function searchCineSubz(query) {
    const data = await apiGet(
        SEARCH_ENDPOINT,
        {
            q: query,
            apitoken: API_KEY
        }
    );

    if (data.success !== true) {
        return {
            success: false,
            message:
                data.message ||
                "Search API failed.",
            results: []
        };
    }

    return {
        success: true,
        total: Number(data.total || 0),

        results:
            Array.isArray(data.results)
                ? data.results
                : []
    };
}

// ============================================================
// EXTRACT CINESUBZ
// ============================================================

async function extractCineSubz(id, type) {
    return apiGet(
        EXTRACT_ENDPOINT,
        {
            id: String(id),

            type:
                type === "tv"
                    ? "tv"
                    : "mv",

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
        text +=
            `*${index + 1}.* ` +
            `${cleanText(movie?.title) || "Unknown"}\n`;

        text +=
            `   📅 ${movie?.year || "N/A"} ` +
            ` ⭐ ${movie?.imdb || "N/A"}\n`;

        if (movie?.genres) {
            text +=
                `   🎭 ${cleanText(movie.genres)}\n`;
        }

        text += "\n";
    });

    text +=
        "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n";

    text +=
        "↳ *Reply to this message with a number.*";

    return text;
}

// ============================================================
// FORMAT SERVER RESULTS
// ============================================================

function formatServers(data, movie, type) {
    const results =
        Array.isArray(data?.results)
            ? data.results
            : [];

    let text =
        "╭━━━〔 🎬 CINESUBZ RESULT 〕━━━╮\n\n";

    text +=
        `🎬 *${cleanText(movie?.title) || "Unknown"}*\n`;

    text +=
        `🆔 ID: ${movie?.id || data?.movie_id || "N/A"}\n`;

    text +=
        `📺 Type: ${
            type === "tv"
                ? "TV Series"
                : "Movie"
        }\n\n`;

    if (!results.length) {
        text +=
            "❌ No server links were returned by the API.\n";
    } else {
        text +=
            "📡 *Available Servers:*\n\n";

        results.forEach((item, index) => {
            const server =
                item?.server ??
                index + 1;

            const mediaType =
                cleanText(item?.type) ||
                "unknown";

            const direct =
                item?.is_direct_mp4 === true
                    ? "Direct MP4"
                    : "Non-direct";

            text +=
                `*${server}.* ` +
                `${mediaType.toUpperCase()} — ` +
                `${direct}\n`;

            if (item?.link) {
                text +=
                    `🔗 ${item.link}\n`;
            } else {
                text +=
                    "⚠️ Link unavailable\n";
            }

            text += "\n";
        });
    }

    text +=
        "━━━━━━━━━━━━━━━━━━━━\n";

    text +=
        "⚡ *WhiteShadow API*";

    return text;
}

// ============================================================
// PENDING SESSION KEY
// ============================================================

function makePendingKey(
    from,
    messageId
) {
    return `${from}:${messageId}`;
}

// ============================================================
// WAIT FOR USER REPLY
// ============================================================

function waitForSelection(
    conn,
    from,
    originalMessageId
) {
    const key =
        makePendingKey(
            from,
            originalMessageId
        );

    const old = pending.get(key);

    if (old) {
        old.cleanup();
    }

    return new Promise(
        (resolve, reject) => {

            let timer;

            const cleanup = () => {
                if (timer) {
                    clearTimeout(timer);
                }

                if (
                    pending.get(key)?.handler ===
                    handler
                ) {
                    pending.delete(key);
                }

                try {
                    conn.ev.off(
                        "messages.upsert",
                        handler
                    );
                } catch (_) {}
            };

            const handler = (update) => {
                try {
                    const incoming =
                        update?.messages?.[0];

                    if (
                        !incoming?.message
                    ) {
                        return;
                    }

                    const remoteJid =
                        incoming.key?.remoteJid;

                    if (
                        remoteJid !== from
                    ) {
                        return;
                    }

                    if (
                        remoteJid ===
                        "status@broadcast"
                    ) {
                        return;
                    }

                    const message =
                        unwrapMessage(
                            incoming.message
                        );

                    const text =
                        getMessageText(
                            message
                        );

                    if (!text) {
                        return;
                    }

                    const context =
                        getContextInfo(
                            message
                        );

                    // Only accept reply to our result message
                    if (
                        context?.stanzaId !==
                        originalMessageId
                    ) {
                        return;
                    }

                    cleanup();

                    resolve({
                        msg: incoming,
                        text
                    });

                } catch (_) {}
            };

            pending.set(
                key,
                {
                    handler,
                    cleanup
                }
            );

            conn.ev.on(
                "messages.upsert",
                handler
            );

            timer = setTimeout(
                () => {
                    cleanup();

                    reject(
                        new Error(
                            "Reply timeout"
                        )
                    );
                },
                REPLY_TIMEOUT
            );
        }
    );
}

// ============================================================
// SEND POSTER
// ============================================================

async function sendPoster(
    conn,
    from,
    movie,
    quoted
) {
    const imageUrl =
        cleanText(movie?.img);

    if (!imageUrl) return;

    try {
        await conn.sendMessage(
            from,
            {
                image: {
                    url: imageUrl
                },

                caption:
                    `🎬 *${
                        cleanText(
                            movie?.title
                        ) || "Movie"
                    }*\n\n` +

                    `🆔 ${
                        movie?.id || "N/A"
                    }\n` +

                    `📅 ${
                        movie?.year || "N/A"
                    }\n` +

                    `⭐ ${
                        movie?.imdb || "N/A"
                    }`
            },

            {
                quoted
            }
        );

    } catch (error) {
        console.log(
            "[CINESUBZ3] Poster error:",
            error?.message
        );
    }
}

// ============================================================
// COMMAND
// ============================================================

cmd(
    {
        pattern: "cz3",

        alias: [],

        desc:
            "Search CineSubz using WhiteShadow API",

        category:
            "downloader",

        react:
            "🎬",

        filename:
            __filename
    },

    async (
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
            // QUERY
            // ====================================================

            const query =
                cleanText(q);

            if (!query) {

                return reply(
                    "╭━━〔 🎬 CINESUBZ 〕━━╮\n\n" +

                    "❌ Please enter a movie name.\n\n" +

                    "Example:\n" +

                    "`.cz3 Batman`\n\n" +

                    "╰━━━━━━━━━━━━━━━━━━╯"
                );
            }

            // ====================================================
            // SEARCH REACTION
            // ====================================================

            await react(
                conn,
                from,
                m?.key,
                "🔍"
            );

            console.log(
                `[CINESUBZ3] Searching: ${query}`
            );

            // ====================================================
            // SEARCH API
            // ====================================================

            const search =
                await searchCineSubz(
                    query
                );

            console.log(
                "[CINESUBZ3] Search response:",
                JSON.stringify(
                    search,
                    null,
                    2
                )
            );

            // ====================================================
            // NO RESULTS
            // ====================================================

            if (
                !search.success ||
                !search.results.length
            ) {

                await react(
                    conn,
                    from,
                    m?.key,
                    "❌"
                );

                return reply(
                    `❌ *No results found for:* ${query}\n\n` +

                    (
                        search.message
                            ? `_${search.message}_`
                            : ""
                    )
                );
            }

            // ====================================================
            // LIMIT
            // ====================================================

            const results =
                search.results.slice(
                    0,
                    MAX_RESULTS
                );

            // ====================================================
            // SEND SEARCH RESULTS
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

            if (
                !listMessage?.key?.id
            ) {
                throw new Error(
                    "Could not create selection message."
                );
            }

            // ====================================================
            // WAIT FOR NUMBER
            // ====================================================

            let selected;

            try {

                selected =
                    await waitForSelection(
                        conn,
                        from,
                        listMessage.key.id
                    );

            } catch (error) {

                await react(
                    conn,
                    from,
                    listMessage.key,
                    "⌛"
                );

                return reply(
                    "⌛ *Selection timed out.*\n\n" +

                    "Please use:\n" +

                    "`.cz3 <movie name>`\n\n" +

                    "again."
                );
            }

            // ====================================================
            // STRICT NUMBER CHECK
            // ====================================================

            const rawSelection =
                cleanText(
                    selected.text
                );

            const match =
                rawSelection.match(
                    /^(\d+)$/
                );

            if (!match) {

                await react(
                    conn,
                    from,
                    selected.msg?.key,
                    "❌"
                );

                return reply(
                    `❌ Invalid selection.\n\n` +

                    `Reply with a number from ` +

                    `*1* to *${results.length}*.`
                );
            }

            const number =
                Number(match[1]);

            if (
                !Number.isSafeInteger(
                    number
                ) ||
                number < 1 ||
                number > results.length
            ) {

                await react(
                    conn,
                    from,
                    selected.msg?.key,
                    "❌"
                );

                return reply(
                    `❌ Invalid selection.\n\n` +

                    `Reply with a number from ` +

                    `*1* to *${results.length}*.`
                );
            }

            // ====================================================
            // SELECT MOVIE
            // ====================================================

            const movie =
                results[number - 1];

            if (!movie?.id) {
                throw new Error(
                    "Selected result does not contain a movie ID."
                );
            }

            const type =
                detectType(movie);

            console.log(
                `[CINESUBZ3] Selected: ${movie.title}`
            );

            console.log(
                `[CINESUBZ3] ID: ${movie.id}`
            );

            console.log(
                `[CINESUBZ3] Type: ${type}`
            );

            await react(
                conn,
                from,
                selected.msg?.key,
                "🎬"
            );

            // ====================================================
            // PROCESSING MESSAGE
            // ====================================================

            const processing =
                await conn.sendMessage(
                    from,
                    {
                        text:
                            "╭━━━〔 🎬 SELECTED 〕━━━╮\n\n" +

                            `🎬 *${
                                cleanText(
                                    movie.title
                                ) || "Unknown"
                            }*\n\n` +

                            `🆔 *ID:* ${
                                movie.id
                            }\n` +

                            `📅 *Year:* ${
                                movie.year ||
                                "N/A"
                            }\n` +

                            `⭐ *IMDb:* ${
                                movie.imdb ||
                                "N/A"
                            }\n` +

                            `📺 *Type:* ${
                                type === "tv"
                                    ? "TV Series"
                                    : "Movie"
                            }\n\n` +

                            "⏳ *Extracting server information...*\n" +

                            "╰━━━━━━━━━━━━━━━━━━━━━━╯"
                    },
                    {
                        quoted:
                            selected.msg
                    }
                );

            // ====================================================
            // EXTRACT API
            // ====================================================

            const extracted =
                await extractCineSubz(
                    movie.id,
                    type
                );

            console.log(
                "[CINESUBZ3] Extract response:",
                JSON.stringify(
                    extracted,
                    null,
                    2
                )
            );

            // ====================================================
            // INVALID RESPONSE
            // ====================================================

            if (
                !extracted ||
                typeof extracted !==
                    "object"
            ) {

                throw new Error(
                    "Extract API returned an invalid response."
                );
            }

            // ====================================================
            // API FAILURE
            // ====================================================

            if (
                extracted.success ===
                false
            ) {

                throw new Error(
                    extracted.message ||
                    "Extract API request failed."
                );
            }

            // ====================================================
            // SERVERS
            // ====================================================

            const servers =
                Array.isArray(
                    extracted.results
                )
                    ? extracted.results
                    : [];

            // ====================================================
            // NO SERVERS
            // ====================================================

            if (!servers.length) {

                await react(
                    conn,
                    from,
                    processing?.key,
                    "❌"
                );

                return reply(
                    "❌ *No servers were returned for this title.*"
                );
            }

            // ====================================================
            // VALID LINKS ONLY
            // ====================================================

            const validServers =
                servers.filter(
                    (item) =>
                        cleanText(
                            item?.link
                        )
                );

            if (!validServers.length) {

                await react(
                    conn,
                    from,
                    processing?.key,
                    "❌"
                );

                return reply(
                    "❌ *The API returned servers, but no usable links were found.*"
                );
            }

            // ====================================================
            // SEND SERVER INFORMATION
            // ====================================================

            await conn.sendMessage(
                from,
                {
                    text:
                        formatServers(
                            {
                                ...extracted,
                                results:
                                    validServers
                            },
                            movie,
                            type
                        )
                },
                {
                    quoted:
                        processing
                }
            );

            // ====================================================
            // SEND POSTER
            // ====================================================

            await sendPoster(
                conn,
                from,
                movie,
                processing
            );

            // ====================================================
            // SUCCESS
            // ====================================================

            await react(
                conn,
                from,
                processing?.key,
                "✅"
            );

        } catch (error) {

            console.error(
                "[CINESUBZ3] ERROR:",
                error
            );

            try {
                await react(
                    conn,
                    from,
                    m?.key,
                    "❌"
                );
            } catch (_) {}

            return reply(
                "❌ *CineSubz Error*\n\n" +
                `${apiErrorMessage(error)}`
            );
        }
    }
);

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    searchCineSubz,
    extractCineSubz,
    detectType
};
