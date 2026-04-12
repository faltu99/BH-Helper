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
        
        // 1. Silent Role Assignment
        await member.roles.add(ROLE_NEWBIE).catch(e => logger.error("Role Error:", e));

        // 2. Fetch the custom message you set in Discord
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        const channel = guild.channels.cache.get(welcomeConfig?.channelId);

        if (channel?.isTextBased()) {
            let customMsg = welcomeConfig.welcomeMessage || "Welcome!";
            
            // Replace the variables (like Carl-bot does)
            customMsg = customMsg
                .replace(/{user}/g, user.toString())
                .replace(/{username}/g, user.username)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);

            // Create the Carl-bot style "Clean" Embed
            const embed = new EmbedBuilder()
                .setColor('#2b2d31') // The specific "Discord Dark" color Carl uses
                .setDescription(customMsg)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Welcome to ✨BLOCK HEAVEN✨ • Member #${guild.memberCount}` 
                });

            // We send ONLY the embed. No "content" ping at the top.
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error in guildMemberAdd:', error);
    }
  }
};
