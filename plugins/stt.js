// plugins/stt.js — SHAVIYA-XMD V2
// .stt — Speech to Text (Voice Note Transcriber)

'use strict';

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Resolve ffmpeg path
let ffmpegPath = 'ffmpeg';
try {
    const staticBin = require('ffmpeg-static');
    if (staticBin && fs.existsSync(staticBin)) {
        try { fs.chmodSync(staticBin, 0o755); } catch (_) {}
        ffmpegPath = staticBin;
    }
} catch (_) {}
try {
    if (ffmpegPath === 'ffmpeg') {
        const inst = require('@ffmpeg-installer/ffmpeg');
        if (inst?.path && fs.existsSync(inst.path)) ffmpegPath = inst.path;
    }
} catch (_) {}

cmd({
    pattern: 'stt',
    alias: ['voice2text', 'transcribe', 'v2t', 'voiceread'],
    desc: 'Transcribe voice note to text',
    category: 'utility',
    react: '🎙️',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        const quoted = m.quoted || mek;
        const mime = quoted?.message?.audioMessage?.mimetype ||
                     quoted?.message?.pttMessage?.mimetype ||
                     quoted?.message?.documentMessage?.mimetype || '';

        const isAudio = mime.includes('audio') || mime.includes('ogg') || mime.includes('opus');

        if (!isAudio) return reply(
            `🎙️ *VOICE TO TEXT*\n\n` +
            `Reply to a voice note with:\n.stt\n\n` +
            `Language options (add after cmd):\n` +
            `• .stt en → English\n` +
            `• .stt si → Sinhala\n` +
            `• .stt auto → Auto detect\n\n` +
            `> 🎙️ *SHAVIYA-XMD V2 · STT*`
        );

        await conn.sendPresenceUpdate('composing', from);
        await reply('⏳ Transcribing voice note...');

        const buffer = await conn.downloadMediaMessage(quoted);
        const tmpOgg = path.join(os.tmpdir(), `stt_in_${Date.now()}.ogg`);
        const tmpWav = path.join(os.tmpdir(), `stt_out_${Date.now()}.wav`);
        fs.writeFileSync(tmpOgg, buffer);

        // Convert ogg/opus to wav for better API compatibility
        try {
            await execPromise(`"${ffmpegPath}" -y -i "${tmpOgg}" -ar 16000 -ac 1 -f wav "${tmpWav}"`, { timeout: 30000 });
        } catch (convErr) {
            console.error('[stt] ffmpeg convert error:', convErr.message);
            // Continue with original file if conversion fails
        }

        const audioFile = fs.existsSync(tmpWav) ? tmpWav : tmpOgg;
        const audioBuffer = fs.readFileSync(audioFile);
        const base64Audio = audioBuffer.toString('base64');

        const langParam = q?.toLowerCase().trim() === 'si' ? 'si-LK' :
                          q?.toLowerCase().trim() === 'en' ? 'en-US' : 'en-US';

        let transcript = null;

        // Primary: Assembly AI free tier
        try {
            // Upload audio
            const uploadRes = await axios.post('https://api.assemblyai.com/v2/upload', audioBuffer, {
                headers: {
                    'authorization': 'your_assemblyai_key_here',
                    'content-type': 'application/octet-stream'
                },
                timeout: 30000
            });

            if (uploadRes.data?.upload_url) {
                const transcriptRes = await axios.post('https://api.assemblyai.com/v2/transcript', {
                    audio_url: uploadRes.data.upload_url,
                    language_detection: true
                }, {
                    headers: { 'authorization': 'your_assemblyai_key_here' },
                    timeout: 15000
                });

                if (transcriptRes.data?.id) {
                    // Poll for result (max 30s)
                    const transcriptId = transcriptRes.data.id;
                    for (let i = 0; i < 15; i++) {
                        await new Promise(r => setTimeout(r, 2000));
                        const pollRes = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                            headers: { 'authorization': 'your_assemblyai_key_here' }
                        });
                        if (pollRes.data?.status === 'completed') {
                            transcript = pollRes.data.text;
                            break;
                        }
                        if (pollRes.data?.status === 'error') break;
                    }
                }
            }
        } catch (_) {}

        // Fallback: Whisper API via free endpoint
        if (!transcript) {
            try {
                const FormData = require('form-data');
                const form = new FormData();
                form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
                form.append('model', 'whisper-1');
                form.append('language', langParam.split('-')[0]);

                const res2 = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
                    },
                    timeout: 30000
                });
                if (res2.data?.text) transcript = res2.data.text.trim();
            } catch (_) {}
        }

        // Fallback 2: free whisper API (no key)
        if (!transcript) {
            try {
                const FormData3 = require('form-data');
                const form3 = new FormData3();
                form3.append('audio', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });

                const res3 = await axios.post('https://api.dark-yasiya-api.site/stt', form3, {
                    headers: form3.getHeaders(),
                    timeout: 30000
                });
                if (res3.data?.text || res3.data?.result) {
                    transcript = (res3.data?.text || res3.data?.result).trim();
                }
            } catch (_) {}
        }

        // Cleanup
        try { fs.unlinkSync(tmpOgg); } catch (_) {}
        try { fs.unlinkSync(tmpWav); } catch (_) {}

        if (!transcript) {
            return reply(
                `❌ *Could not transcribe this voice note.*\n\n` +
                `Tips:\n` +
                `• Speak clearly\n` +
                `• Avoid background noise\n` +
                `• Voice note must be in a supported language\n\n` +
                `> 🎙️ *SHAVIYA-XMD V2 · STT*`
            );
        }

        const wordCount = transcript.split(/\s+/).filter(Boolean).length;

        await conn.sendMessage(from, {
            text: `🎙️ *VOICE TRANSCRIPTION*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${transcript}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 Words: ${wordCount}\n\n` +
                `> 🎙️ *SHAVIYA-XMD V2 · STT*`
        }, { quoted: mek });

    } catch (e) {
        console.error('[stt] error:', e.message);
        reply('❌ Transcription failed. Please try again.');
    }
});
