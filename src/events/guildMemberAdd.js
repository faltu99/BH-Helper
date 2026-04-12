import { Events, EmbedBuilder } from 'discord.js';
import { getWelcomeConfig } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        const ROLE_NEWBIE = '1492379204510158908';
        
        // 1. Auto-assign role
        await member.roles.add(ROLE_NEWBIE).catch(e => logger.error("Role Error:", e));

        // 2. Get the config you set via Discord
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        const channel = guild.channels.cache.get(welcomeConfig?.channelId);

        if (channel?.isTextBased()) {
            // This pulls the "message" you set in Discord
            let customMsg = welcomeConfig.welcomeMessage || "Welcome to the server!";
            
            // Replace variables like Carl-bot does
            customMsg = customMsg
                .replace(/{user}/g, user.toString())
                .replace(/{username}/g, user.username)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);

            // Create a clean Carl-bot style embed
            const embed = new EmbedBuilder()
                .setColor('#2b2d31') // Dark "Discord" color like Carl-bot
                .setDescription(customMsg)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: `Welcome to ${guild.name} • Member #${guild.memberCount}` });

            await channel.send({ content: `${user}`, embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error in guildMemberAdd:', error);
    }
  }
};
