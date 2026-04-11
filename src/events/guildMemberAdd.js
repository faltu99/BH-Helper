import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor } from '../config/bot.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { getWelcomeConfig, setBirthday as dbSetBirthday } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/counterService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        const ROLE_NEWBIE = '1492379204510158908';
        
        // --- NEWBIE ROLE ASSIGNMENT ---
        try {
            await member.roles.add(ROLE_NEWBIE);
            logger.info(`✅ Assigned Newbie role to ${user.username}`);
        } catch (roleError) {
            logger.error(`❌ Failed to assign Newbie role: ${roleError.message}`);
        }

        // --- WELCOME SYSTEM ---
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        if (welcomeConfig?.enabled && welcomeConfig.channelId) {
            const channel = guild.channels.cache.get(welcomeConfig.channelId);
            if (channel?.isTextBased()) {
                const formatData = { user, guild, member };
                const welcomeMessage = formatWelcomeMessage(
                    welcomeConfig.welcomeMessage || 'Welcome {user} to {server}!',
                    formatData
                );

                const embed = new EmbedBuilder()
                    .setColor(welcomeConfig.welcomeEmbed?.color || getColor('success'))
                    .setTitle('🎉 Welcome!')
                    .setDescription(welcomeMessage)
                    .setThumbnail(user.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: `Welcome to ${guild.name}!` });
                
                await channel.send({ content: welcomeConfig.welcomePing ? user.toString() : null, embeds: [embed] });
            }
        }
        
        // --- COUNTERS & LOGGING ---
        try {
            const counters = await getServerCounters(member.client, guild.id);
            for (const counter of counters) {
                await updateCounter(member.client, guild, counter);
            }
            await logEvent({
                client: member.client,
                guildId: guild.id,
                eventType: EVENT_TYPES.MEMBER_JOIN,
                data: { description: `${user.tag} joined the server`, userId: user.id }
            });
        } catch (err) {
            logger.debug('Non-critical join error:', err);
        }
        
    } catch (error) {
        logger.error('Error in guildMemberAdd event:', error);
    }
  }
};
