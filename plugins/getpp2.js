const { MessageType } = require('@adiwajshing/baileys');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GetProfilePicture {
    constructor(client) {
        this.client = client;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    async getProfilePicture(targetNumber, message) {
        try {
            // Clean and format the number
            const cleanNumber = targetNumber.replace(/[^\d]/g, '');
            const jid = `${cleanNumber}@s.whatsapp.net`;
            
            // Check cache first
            const cacheKey = `pp_${cleanNumber}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.buffer;
                }
            }

            // Method 1: Try standard API
            let ppUrl = await this.client.getProfilePicture(jid).catch(() => null);
            
            if (!ppUrl) {
                // Method 2: Try alternative API endpoint
                ppUrl = await this.tryAlternativeMethod(cleanNumber);
            }
            
            if (!ppUrl) {
                // Method 3: Try web scraping method
                ppUrl = await this.tryWebScraping(cleanNumber);
            }
            
            if (ppUrl) {
                // Download the image
                const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                
                // Cache the result
                this.cache.set(cacheKey, {
                    buffer,
                    timestamp: Date.now()
                });
                
                return buffer;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting profile picture:', error);
            return null;
        }
    }

    async tryAlternativeMethod(number) {
        try {
            // Try to access the profile picture through WhatsApp Web's direct API
            const url = `https://web.whatsapp.com/pp?t=l&u=${number}&i=1564244400&n=${number}&e=`;
            const response = await axios.head(url, { 
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                }
            });
            
            if (response.status === 200 && response.headers['content-type'].includes('image')) {
                return url;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async tryWebScraping(number) {
        try {
            // This method simulates accessing WhatsApp Web to get the profile picture
            // It's a more advanced technique that may work when standard methods fail
            const jid = `${number}@s.whatsapp.net`;
            
            // Create a temporary chat with the contact to trigger profile picture loading
            const chat = await this.client.createChat(jid);
            
            // Wait a moment for the profile picture to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to get the profile picture again
            const ppUrl = await this.client.getProfilePicture(jid).catch(() => null);
            
            if (ppUrl) {
                return ppUrl;
            }
            
            // If still not found, try to extract from the chat's metadata
            const chatData = await this.client.getChatById(jid);
            if (chatData && chatData.picUrl) {
                return chatData.picUrl;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
}

// Command handler
const handler = async (message, client) => {
    const getPP = new GetProfilePicture(client);
    
    try {
        // Extract the target number from the command
        const commandParts = message.body.split(' ');
        if (commandParts.length < 2) {
            return await message.reply('⚠️ Please provide a phone number. Usage: .getpp2 <number>');
        }

        const targetNumber = commandParts[1].replace(/[^\d]/g, '');
        if (!targetNumber || targetNumber.length < 10) {
            return await message.reply('⚠️ Invalid phone number provided');
        }

        // Send processing message
        const processingMsg = await message.reply('🔄 Retrieving profile picture...');

        // Get the profile picture
        const profilePicture = await getPP.getProfilePicture(targetNumber, message);
        
        // Delete the processing message
        await client.deleteMessage(processingMsg.key);

        if (profilePicture) {
            // Send the profile picture
            await client.sendMessage(
                message.from, 
                profilePicture, 
                MessageType.image, 
                {
                    caption: `📸 Profile picture of +${targetNumber}`,
                    thumbnail: profilePicture
                }
            );
        } else {
            await message.reply('❌ Profile picture not found or the user has restricted access');
        }
    } catch (error) {
        console.error('Error in getpp2 command:', error);
        await message.reply('❌ An error occurred while fetching the profile picture');
    }
};

// Plugin information
module.exports = {
    name: 'getpp2',
    description: 'Get the profile picture of a WhatsApp user (advanced method)',
    command: '.getpp2',
    handler: handler,
    category: 'utility'
};
