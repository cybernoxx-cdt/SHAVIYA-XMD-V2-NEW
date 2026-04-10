// Plugin Manager - Handles all plugin loading and management

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class PluginManager {
    constructor(config) {
        this.config = config;
        this.plugins = new Map();
        this.commands = new Map();
        this.events = new Map();
        this.pluginDir = path.join(__dirname, './');
    }

    // Load all plugins from plugins directory
    async loadPlugins() {
        console.log(chalk.cyan('\n📦 Loading Plugins...'));
        
        try {
            const files = fs.readdirSync(this.pluginDir);
            const pluginFiles = files.filter(file => 
                file.endsWith('.js') && 
                file !== 'manager.js' && 
                file !== 'index.js'
            );

            for (const file of pluginFiles) {
                await this.loadPlugin(file);
            }

            console.log(chalk.green(`\n✓ Loaded ${this.plugins.size} plugins`));
            console.log(chalk.green(`✓ Registered ${this.commands.size} commands`));
            
        } catch (error) {
            console.error(chalk.red('Error loading plugins:'), error);
        }
    }

    // Load single plugin
    async loadPlugin(file) {
        try {
            const pluginPath = path.join(this.pluginDir, file);
            delete require.cache[require.resolve(pluginPath)];
            
            const PluginClass = require(pluginPath);
            const plugin = new PluginClass(this.config, this);
            
            this.plugins.set(plugin.name || file, plugin);
            
            // Register commands
            if (plugin.commands && typeof plugin.commands === 'object') {
                for (const [cmd, handler] of Object.entries(plugin.commands)) {
                    this.commands.set(cmd, {
                        handler,
                        plugin: plugin.name,
                        category: plugin.category || 'general',
                        description: plugin.descriptions?.[cmd] || 'No description',
                        cooldown: plugin.cooldowns?.[cmd] || 3000
                    });
                }
            }
            
            console.log(chalk.green(`  ✓ Loaded: ${file}`));
            
        } catch (error) {
            console.error(chalk.red(`  ✗ Failed to load ${file}:`), error.message);
        }
    }

    // Get command handler
    getCommand(command) {
        return this.commands.get(command);
    }

    // Execute command
    async executeCommand(command, sock, msg, args, from, isGroup, sender, pushname, reply) {
        const cmd = this.commands.get(command);
        
        if (!cmd) {
            return null;
        }
        
        try {
            await cmd.handler(sock, msg, args, from, isGroup, sender, pushname, reply);
            return true;
        } catch (error) {
            console.error(chalk.red(`Error executing ${command}:`), error);
            await reply(`❌ Error: ${error.message}`);
            return false;
        }
    }

    // Get all commands by category
    getCommandsByCategory() {
        const categories = new Map();
        
        for (const [cmd, data] of this.commands) {
            if (!categories.has(data.category)) {
                categories.set(data.category, []);
            }
            categories.get(data.category).push({
                cmd,
                description: data.description
            });
        }
        
        return categories;
    }

    // Get plugin info
    getPluginInfo() {
        const info = [];
        for (const [name, plugin] of this.plugins) {
            info.push({
                name: name,
                version: plugin.version || '1.0.0',
                category: plugin.category || 'general',
                commands: Object.keys(plugin.commands || {}).length,
                author: plugin.author || 'Unknown'
            });
        }
        return info;
    }
}

module.exports = PluginManager;
