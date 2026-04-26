const config = require('../config')
const fg = require('api-dylux')
const { cmd } = require('../command')
const { l, reply: _reply } = require('../lib/functions2')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const os = require('os')
const AdmZip = require('adm-zip')

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Google Drive folder/file ID eka url ekin ganna
 */
function extractGDriveId(url) {
    // folder
    let m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    if (m) return { id: m[1], type: 'folder' }
    // file
    m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
        url.match(/id=([a-zA-Z0-9_-]+)/)
    if (m) return { id: m[1], type: 'file' }
    return null
}

/**
 * Normalize any gdrive url to standard /file/d/<id>/view format
 */
function normalizeFileUrl(url) {
    return url
        .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
        .replace('&export=download', '/view')
}

/**
 * Google Drive folder eke files list ganna (public folders only)
 * Uses the public export API
 */
async function getFolderFiles(folderId) {
    // Public folder file listing via drive export
    const listUrl = `https://drive.google.com/drive/folders/${folderId}`
    // We use a known public API endpoint pattern
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,size)&key=AIzaSyC5vMvSBqHQGpFTEIWpGVNkWMk5j8y2Wmo`
    
    try {
        const res = await axios.get(apiUrl, { timeout: 15000 })
        return res.data.files || []
    } catch {
        // Fallback: try scraping the folder page for file IDs
        throw new Error('Folder list fetch failed. Folder may be private or API key invalid.')
    }
}

/**
 * File ekak buffer widihata download karanawa
 */
async function downloadToBuffer(downloadUrl) {
    const res = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: 500 * 1024 * 1024, // 500MB max
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })
    return Buffer.from(res.data)
}

// ─── Command ───────────────────────────────────────────────────────────────

cmd({
    pattern: "gdrive",
    alias: ["gd"],
    react: '📑',
    desc: "Download Google Drive files or folders (folder → ZIP).",
    category: "download",
    use: '.gdrive <google drive link>',
    filename: __filename
},
async (conn, mek, m, {
    from, l: log, quoted, body, isCmd, command,
    args, q, isGroup, sender, senderNumber, botNumber2,
    botNumber, pushname, isMe, isOwner, groupMetadata,
    groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!q) return reply('*📎 Google Drive link ekak danna!*\nExample: `.gdrive https://drive.google.com/...`')

        const parsed = extractGDriveId(q.trim())
        if (!parsed) return reply('*❌ Valid Google Drive link ekak neda!*')

        // ── FOLDER ──────────────────────────────────────────────────────
        if (parsed.type === 'folder') {
            await reply(`*📂 Folder detect una!*\n_Files list karanawa..._`)

            let files
            try {
                files = await getFolderFiles(parsed.id)
            } catch (err) {
                return reply(`*❌ Folder files ganna bari una!*\n_Folder public da? Check karanna._\n\`${err.message}\``)
            }

            if (!files || files.length === 0) {
                return reply('*❌ Folder eke files nadda / private folder!*')
            }

            await reply(`*📦 Files ${files.length}k thiyanawa. ZIP hadanawa...*`)

            const zip = new AdmZip()
            const failed = []

            for (const file of files) {
                // Skip sub-folders (recursive not supported here)
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    failed.push(`📁 ${file.name} (sub-folder, skipped)`)
                    continue
                }

                try {
                    // Google Workspace files (Docs/Sheets) → export as PDF
                    let dlUrl
                    const gWorkspace = {
                        'application/vnd.google-apps.document': 'application/pdf',
                        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.google-apps.presentation': 'application/pdf',
                    }
                    if (gWorkspace[file.mimeType]) {
                        dlUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(gWorkspace[file.mimeType])}&key=AIzaSyC5vMvSBqHQGpFTEIWpGVNkWMk5j8y2Wmo`
                    } else {
                        dlUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=AIzaSyC5vMvSBqHQGpFTEIWpGVNkWMk5j8y2Wmo`
                    }

                    const buf = await downloadToBuffer(dlUrl)
                    zip.addFile(file.name, buf)
                } catch {
                    failed.push(`❌ ${file.name}`)
                }
            }

            // ZIP buffer
            const zipBuffer = zip.toBuffer()
            const zipName = `gdrive_folder_${parsed.id.slice(0, 8)}.zip`

            await conn.sendMessage(from, {
                document: zipBuffer,
                fileName: zipName,
                mimetype: 'application/zip',
                caption: `*📦 GDrive Folder ZIP*\n\n` +
                    `*Files:* ${files.length}\n` +
                    `*ZIP Size:* ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB` +
                    (failed.length ? `\n\n*Skipped/Failed:*\n${failed.join('\n')}` : '') +
                    `\n\n> *•SHAVIYA-XMD V2•*`
            }, { quoted: mek })

        // ── SINGLE FILE ─────────────────────────────────────────────────
        } else {
            const normalUrl = normalizeFileUrl(q.trim())
            let res
            try {
                res = await fg.GDriveDl(normalUrl)
            } catch (err) {
                return reply(`*❌ File info ganna bari una!*\n_File public da? Check karanna._`)
            }

            if (!res || !res.downloadUrl) {
                return reply('*❌ Download URL ganna bari una. File private wenna puluwan.*')
            }

            await reply(
                `*⬇ SHAVIYA-XMD V2 GDRIVE DOWNLOADER ⬇*\n\n` +
                `*📃 File name:* ${res.fileName}\n` +
                `*💈 File Size:* ${res.fileSize}\n` +
                `*🕹️ File type:* ${res.mimetype}\n\n` +
                `*•SHAVIYA-XMD V2•*`
            )

            await conn.sendMessage(from, {
                document: { url: res.downloadUrl },
                fileName: res.fileName,
                mimetype: res.mimetype,
                caption: res.fileName.replace('[Cinesubz.co]', '') + '\n\n> *•SHAVIYA-XMD V2•*'
            }, { quoted: mek })
        }

    } catch (e) {
        reply(`*❌ Error una!*\n\`${e.message}\``)
        log(e)
    }
})
