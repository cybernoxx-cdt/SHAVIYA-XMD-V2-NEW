'use strict';

/**
 * ============================================================
 * SHAVIYA-XMD V2
 * SUDU AI AGENT
 * ============================================================
 *
 * Works with:
 *
 *   sudu kohomada?
 *   Sudu mata adarei da?
 *   සුදු කොහොමද?
 *
 *   .sudu kohomada?
 *   .සුදු කොහොමද?
 *
 * API:
 *   ZANTA-MD /wife
 *
 * API KEY:
 *   HARD CODED BELOW
 * ============================================================
 */

const { cmd } = require('../command');
const axios = require('axios');


/* ============================================================
   API SETTINGS
============================================================ */

const API_URL =
    'https://api.zanta-mini.store/api/wife';

const API_KEY =
    'zan_vWpU1lkr_g6wwxdlvyv';


/* ============================================================
   CONFIG
============================================================ */

const CONFIG = {

    /*
     * Maximum text sent to API
     */
    maxTextLength: 2000,

    /*
     * API timeout
     */
    timeoutMs: 60000,

    /*
     * Small cooldown per chat
     */
    cooldownMs: 1000,

    /*
     * Group support
     */
    groupsEnabled: true,

    /*
     * Ignore bot's own messages
     */
    ignoreFromMe: true,

};


/* ============================================================
   COOLDOWN
============================================================ */

const cooldowns = new Map();


function canRun(chatId) {

    const now = Date.now();

    const last =
        cooldowns.get(chatId) || 0;

    if (
        now - last <
        CONFIG.cooldownMs
    ) {
        return false;
    }

    cooldowns.set(chatId, now);

    /*
     * Prevent unlimited memory growth
     */
    if (cooldowns.size > 5000) {

        for (
            const [key, timestamp]
            of cooldowns
        ) {

            if (
                now - timestamp >
                CONFIG.cooldownMs * 10
            ) {

                cooldowns.delete(key);

            }
        }
    }

    return true;
}


/* ============================================================
   TEXT HELPERS
============================================================ */

function cleanText(value) {

    return String(value || '')
        .replace(/\s+/gu, ' ')
        .trim();

}


/*
 * Remove sudu / සුදු from beginning of message.
 *
 * Examples:
 *
 * sudu hello
 * -> hello
 *
 * සුදු කොහොමද
 * -> කොහොමද
 *
 * .sudu hello
 * -> hello
 *
 * .සුදු hello
 * -> hello
 */

function removeTrigger(text) {

    let clean =
        cleanText(text);

    /*
     * Remove optional dot prefix
     */
    clean =
        clean.replace(/^\.\s*/u, '');

    /*
     * Remove trigger from beginning
     */
    clean =
        clean.replace(
            /^(?:sudu|සුදු)(?:\s+|$)/iu,
            ''
        );

    return cleanText(clean);
}


/* ============================================================
   API RESPONSE PARSER
============================================================ */

function getApiReply(data) {

    /*
     * Current API response:
     *
     * {
     *   success: true,
     *   result: {
     *      reply: "...",
     *      model: "..."
     *   }
     * }
     */

    const candidates = [

        data?.result?.reply,

        data?.reply,

        data?.result?.answer,

        data?.answer,

        data?.data?.reply,

        data?.data?.answer,

    ];


    const found =
        candidates.find(
            value =>
                typeof value === 'string' &&
                value.trim()
        );


    return found
        ? found.trim()
        : '';
}


/* ============================================================
   API REQUEST
============================================================ */

async function askSudu(text) {

    const prompt =
        cleanText(text)
            .slice(
                0,
                CONFIG.maxTextLength
            ) || 'Hi';


    console.log(
        `[SUDU-AI] Sending prompt: ${prompt}`
    );


    const response =
        await axios.get(
            API_URL,
            {

                params: {

                    apiKey:
                        API_KEY,

                    text:
                        prompt,

                },

                timeout:
                    CONFIG.timeoutMs,

                headers: {

                    Accept:
                        'application/json',

                    'User-Agent':
                        'SHAVIYA-XMD-V2-SUDU-AI/2.0',

                },

                validateStatus:
                    status =>
                        status >= 200 &&
                        status < 500,

            }
        );


    const data =
        response.data;


    console.log(
        '[SUDU-AI] API status:',
        response.status
    );


    /*
     * HTTP error
     */

    if (
        response.status >= 400
    ) {

        const errorMessage =
            data?.message ||
            data?.error ||
            `HTTP ${response.status}`;

        throw new Error(
            String(errorMessage)
        );

    }


    /*
     * API success=false
     */

    if (
        data?.success === false
    ) {

        throw new Error(
            String(
                data?.message ||
                data?.error ||
                'API returned success=false'
            )
        );

    }


    /*
     * Get AI response
     */

    const reply =
        getApiReply(data);


    if (!reply) {

        console.error(
            '[SUDU-AI] Unexpected API response:',
            JSON.stringify(data)
        );

        throw new Error(
            'API returned no AI reply'
        );

    }


    return {

        reply,

        model:
            data?.result?.model ||
            data?.model ||
            null,

    };

}


/* ============================================================
   SEND AI RESPONSE
============================================================ */

async function runSudu(
    conn,
    mek,
    {
        from,
        text,
        reply
    }
) {

    try {

        /*
         * Basic checks
         */

        if (
            CONFIG.ignoreFromMe &&
            mek?.key?.fromMe
        ) {
            return;
        }


        if (!from) {
            return;
        }


        if (
            !CONFIG.groupsEnabled &&
            from.endsWith('@g.us')
        ) {
            return;
        }


        /*
         * Cooldown
         */

        if (!canRun(from)) {
            return;
        }


        /*
         * Get actual question
         */

        const prompt =
            cleanText(text) || 'Hi';


        /*
         * React immediately
         */

        await conn.sendMessage(
            from,
            {
                react: {
                    text: '💗',
                    key: mek.key
                }
            }
        ).catch(() => {});


        /*
         * API request
         */

        const result =
            await askSudu(prompt);


        /*
         * Send AI reply
         */

        await conn.sendMessage(
            from,
            {
                text:
                    result.reply
            },
            {
                quoted:
                    mek
            }
        );


        /*
         * Success reaction
         */

        await conn.sendMessage(
            from,
            {
                react: {
                    text: '❤️',
                    key: mek.key
                }
            }
        ).catch(() => {});


        console.log(
            '[SUDU-AI] Response sent successfully'
        );


    } catch (error) {

        console.error(
            '[SUDU-AI] ERROR:',
            error?.message ||
            error
        );


        /*
         * Error reaction
         */

        await conn.sendMessage(
            from,
            {
                react: {
                    text: '❌',
                    key: mek.key
                }
            }
        ).catch(() => {});


        /*
         * Tell user
         */

        try {

            await conn.sendMessage(
                from,
                {
                    text:
                        '❌ *Sudu AI* response එක ගන්න බැරි වුණා.\n\n' +
                        'ටිකකින් ආයෙත් try කරන්න.'
                },
                {
                    quoted:
                        mek
                }
            );

        } catch (sendError) {

            console.error(
                '[SUDU-AI] ERROR MESSAGE FAILED:',
                sendError?.message ||
                sendError
            );

        }

    }

}


/* ============================================================
   NO PREFIX LISTENER
===============================================================
 *
 * Handles:
 *
 *   sudu hello
 *   Sudu hello
 *   සුදු hello
 *   සුදු කොහොමද
 *
 * IMPORTANT:
 *
 * We intentionally do NOT use command parser here.
 * This catches normal WhatsApp messages.
 *
 * If message starts with "." we ignore it here,
 * because .sudu is handled by the command below.
 *
============================================================ */

cmd(
    {
        on:
            'body',

        dontAddCommandList:
            true,

        filename:
            __filename,
    },

    async (
        conn,
        mek,
        m,
        {
            from,
            body,
            reply
        }
    ) => {

        try {

            if (!body) {
                return;
            }


            const original =
                cleanText(body);


            /*
             * IMPORTANT:
             *
             * Dot commands are handled
             * by the command handler below.
             *
             * So body listener must ignore:
             *
             * .sudu
             * .සුදු
             */

            if (
                original.startsWith('.')
            ) {
                return;
            }


            /*
             * Check whether message begins
             * with sudu / සුදු.
             *
             * We intentionally require it at
             * the beginning so normal words like
             * "suddenly" won't trigger.
             */

            const triggerMatch =
                /^(?:sudu|සුදු)(?:\s+|$)/iu
                    .test(original);


            if (!triggerMatch) {
                return;
            }


            /*
             * Remove trigger
             */

            const question =
                removeTrigger(original);


            /*
             * Run AI
             */

            await runSudu(
                conn,
                mek,
                {
                    from,
                    text:
                        question || 'Hi',
                    reply
                }
            );


        } catch (error) {

            console.error(
                '[SUDU-AI BODY ERROR]:',
                error?.message ||
                error
            );

        }

    }
);


/* ============================================================
   DOT COMMAND
===============================================================
 *
 * Handles:
 *
 *   .sudu hello
 *   .සුදු hello
 *
 * Also:
 *
 *   .wifeai hello
 *   .girlfriendai hello
 *   .suduai hello
 *
============================================================ */

cmd(
    {
        pattern:
            'sudu',

        alias: [
            'සුදු',
            'wifeai',
            'girlfriendai',
            'suduai'
        ],

        react:
            '💗',

        desc:
            'Sudu AI Wife/Girlfriend Agent',

        category:
            'ai',

        fromMe:
            false,

        filename:
            __filename,
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

            if (
                CONFIG.ignoreFromMe &&
                mek?.key?.fromMe
            ) {
                return;
            }


            if (!from) {
                return;
            }


            if (
                !CONFIG.groupsEnabled &&
                from.endsWith('@g.us')
            ) {
                return;
            }


            /*
             * IMPORTANT:
             *
             * Command parser already removed:
             *
             * .sudu
             *
             * from q.
             *
             * So q is only the user's message.
             */

            const question =
                cleanText(q) || 'Hi';


            /*
             * Run AI
             */

            await runSudu(
                conn,
                mek,
                {
                    from,
                    text:
                        question,
                    reply
                }
            );


        } catch (error) {

            console.error(
                '[SUDU-AI COMMAND ERROR]:',
                error?.message ||
                error
            );


            try {

                await conn.sendMessage(
                    from,
                    {
                        text:
                            '❌ *Sudu AI* error එකක් ආවා. ටිකකින් ආයෙත් try කරන්න.'
                    },
                    {
                        quoted:
                            mek
                    }
                );

            } catch (e) {}

        }

    }
);


/* ============================================================
   LOADED
============================================================ */

console.log(
    '💗 SUDU AI loaded | no-prefix: sudu / සුදු | commands: .sudu / .සුදු'
);
