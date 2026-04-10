const { cmd } = require('../command');
const mongoose = require("mongoose");

// ===============================
// 🔐 MONGODB CONNECTION
// ===============================

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://botmini:botmini@minibot.upglk0f.mongodb.net/?retryWrites=true&w=majority&appName=minibot';

async function connectDB() {
    try {

        if (mongoose.connection.readyState === 1) {
            console.log("🔵 MongoDB Already Connected");
            return;
        }

        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 50,
        });

        console.log("✅ MongoDB Connected Successfully");

    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
    }
}

connectDB();

// ===============================
// 📦 SIGNAL MODEL
// ===============================

const Signal =
    mongoose.models.Signal ||
    mongoose.model(
        "Signal",
        new mongoose.Schema({}, { strict: false })
    );

// ===============================
// 🚀 CREACT COMMAND
// ===============================

cmd({
    pattern: "creact",
    alias: ["massreact", "chr"],
    react: "⚡",
    desc: "Multi-Node Mass Reaction",
    category: "main",
    use: ".creact link , qty , emoji",
    filename: __filename,
},
async (conn, mek, m, { q, reply, sender, userSettings }) => {

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📩 Command Triggered: .creact");
    console.log("👤 Sender:", sender);
    console.log("💬 Raw Input:", q);

    try {

        const allowedNumbers = [
            "94777145463",
            "94743826406",
            "94766247995"
        ];

        const senderNumber = sender.split("@")[0];
        const isOwner = allowedNumbers.includes(senderNumber);

        if (!isOwner && userSettings?.paymentStatus !== "paid") {
            console.log("❌ Permission Denied");
            return reply("🚫 Access Denied!");
        }

        if (!q || !q.includes(",")) {
            return reply("💡 Usage: .creact link , qty , emoji");
        }

        let parts = q.split(",");
        let linkPart = parts[0].trim();
        let qtyNum = parseInt(parts[1]?.trim()) || 50;
        let emojis = parts.slice(2).map(e => e.trim()).filter(e => e);

        console.log("🔗 Link:", linkPart);
        console.log("📊 Qty:", qtyNum);
        console.log("😀 Emojis:", emojis);

        if (!linkPart.includes("whatsapp.com/channel/")) {
            return reply("❌ Invalid Channel Link.");
        }

        if (qtyNum < 10 || qtyNum > 500) {
            return reply("⚠️ Quantity must be between 10 and 500.");
        }

        const urlParts = linkPart.split("/");
        const inviteCode = urlParts[4];
        const serverId = urlParts[urlParts.length - 1];

        console.log("🔑 Invite Code:", inviteCode);
        console.log("🆔 Server ID:", serverId);

        // ===============================
        // 🔥 SAFE METADATA FETCH
        // ===============================

        let metadata;

        try {
            metadata = await conn.newsletterMetadata("invite", inviteCode);
            console.log("📡 Metadata Fetched:", metadata);
        } catch (err) {
            console.log("❌ Metadata Fetch Error:", err.message);
        }

        if (!metadata || !metadata.id) {
            return reply("❌ Metadata Failed. Bot not joined?");
        }

        const targetJid = metadata.id;

        console.log("🎯 Target JID:", targetJid);

        // ===============================
        // 📊 PAYLOAD BUILD
        // ===============================

        const signalPayload = {
            type: "react",
            targetJid,
            serverId: String(serverId),
            emojiList: emojis.length > 0 ? emojis : ["❤️"],
            timestamp: Date.now()
        };

        const USERS_PER_APP = 50;
        let remaining = qtyNum + 10;
        let appIdCounter = 1;

        while (remaining > 0) {

            const batchSize = Math.min(remaining, USERS_PER_APP);

            signalPayload[`APP_ID_${appIdCounter}`] = batchSize;

            console.log(`📦 Node ${appIdCounter} -> ${batchSize}`);

            remaining -= batchSize;
            appIdCounter++;
        }

        console.log("📤 Final Payload:", signalPayload);

        // ===============================
        // 🚀 SAVE TO DATABASE
        // ===============================

        const saved = await Signal.create(signalPayload);

        console.log("💾 Saved To Mongo:", saved._id);

        return reply(
            `🚀 *STRIKE INITIATED!* ✅\n\n` +
            `🎯 Target: ${metadata.subject || metadata.name || "Unknown"}\n` +
            `💠 Nodes: ${appIdCounter - 1}\n` +
            `🔢 Qty: ${qtyNum}\n` +
            `🎭 Emojis: ${signalPayload.emojiList.join(" ")}`
        );

    } catch (err) {

        console.error("🔥 Command Fatal Error:", err);

        return reply("❌ Error: " + err.message);
    }

});
