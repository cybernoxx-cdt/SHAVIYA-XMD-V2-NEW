const { cmd } = require("../command");
const FormData = require("form-data");

cmd({
    pattern: "tourl2",
    desc: "Upload media using WhiteShadow API",
    category: "tools",
    react: "📤",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!quoted) {
            return reply("❌ Reply to an image or video!");
        }

        const mime = quoted.mtype || "";
        if (!mime.includes("image") && !mime.includes("video")) {
            return reply("❌ Only image/video supported!");
        }

        reply("⏳ Downloading...");

        // download buffer
        const buffer = await quoted.download();

        reply("📤 Uploading...");

        // create formdata (same as your example)
        const fd = new FormData();
        fd.append("file", buffer, {
            filename: `upload_${Date.now()}.jpg`
        });

        // send request (IMPORTANT: full URL)
        const res = await fetch("https://whiteshadow-uploader.vercel.zone.id/api/upload", {
            method: "POST",
            body: fd,
            headers: fd.getHeaders()
        });

        const data = await res.json();

        if (!data.status) {
            return reply("❌ Upload failed!");
        }

        const url = data.result.url;

        // send result
        return conn.sendMessage(from, {
            text: `✅ Upload Success!\n\n🔗 ${url}`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});
