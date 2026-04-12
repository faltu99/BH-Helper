import { Events } from 'discord.js';
import { getWelcomeConfig } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        const ROLE_NEWBIE = '1492379204510158908';
        
        // 1. Give the role
        await member.roles.add(ROLE_NEWBIE).catch(e => logger.error("Role Error:", e));

        // 2. Get the text you set in Discord
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        const channel = guild.channels.cache.get(welcomeConfig?.channelId);

        if (channel?.isTextBased()) {
            let customMsg = welcomeConfig.welcomeMessage || "Welcome!";
            
            // Replace variables with actual data
            customMsg = customMsg
                .replace(/{user}/g, user.toString())
                .replace(/{username}/g, user.username)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);

            // 3. Send as a PLAIN message (no embed/box)
            await channel.send({ content: customMsg });
        }
    } catch (error) {
        logger.error('Error in guildMemberAdd:', error);
    }
  }
};
