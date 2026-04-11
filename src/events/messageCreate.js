import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      // Ignore bots and DM messages
      if (message.author.bot || !message.guild) return;

      // 1. Handle Leveling System (XP)
      await handleLeveling(message, client);

      // 2. Handle Commands (Prefix "X" or @Mention)
      await handleCommands(message, client);

    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handleCommands(message, client) {
    const prefix = 'X'; // Your desired prefix
    const mentionPrefix = `<@${client.user.id}>`;
    const mentionPrefixNick = `<@!${client.user.id}>`;

    let usedPrefix = null;

    // Check if message starts with X or Bot Mention
    if (message.content.startsWith(prefix)) {
        usedPrefix = prefix;
    } else if (message.content.startsWith(mentionPrefix)) {
        usedPrefix = mentionPrefix;
    } else if (message.content.startsWith(mentionPrefixNick)) {
        usedPrefix = mentionPrefixNick;
    }

    if (!usedPrefix) return;

    // Parse the command and arguments
    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Look for the command in the bot's collection
    const command = client.commands.get(commandName);

    if (command) {
        try {
            // Note: This assumes your commands have an 'execute' function 
            // that accepts (message, args, client)
            await command.execute(message, args, client);
        } catch (error) {
            logger.error(`Error executing command ${commandName}:`, error);
            message.reply('There was an error trying to execute that command!');
        }
    }
}

async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) return;

    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    if (!levelingConfig?.enabled) return;

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) return;

    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) return;
    }

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) return;
    if (!message.content || message.content.trim().length === 0) return;

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);
    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    
    if (timeSinceLastMessage < cooldownTime * 1000) return;

    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;
    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);
    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    const result = await addXp(client, message.guild, message.member, finalXP);
    if (result.success && result.leveledUp) {
      logger.info(`${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`);
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
      }
