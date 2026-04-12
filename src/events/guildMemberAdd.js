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

        // 2. Fetch the config
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        const channel = guild.channels.cache.get(welcomeConfig?.channelId);

        if (channel?.isTextBased()) {
            let customMsg = welcomeConfig.welcomeMessage || "Welcome!";
            
            // Replace variables (but we will use a plain mention for the actual ping)
            customMsg = customMsg
                .replace(/{user}/g, user.toString())
                .replace(/{username}/g, user.username)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);

            const embed = new EmbedBuilder()
                .setColor('#2b2d31') 
                .setDescription(customMsg)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Welcome to ✨BLOCK HEAVEN✨ • Member #${guild.memberCount}` 
                });

            // THIS IS THE TRICK: 
            // 'content' is the ping OUTSIDE the box (this makes the notification work)
            // 'embeds' is the Carl-style box
            await channel.send({ 
                content: `Welcome ${user}!`, 
                embeds: [embed] 
            });
        }
    } catch (error) {
        logger.error('Error in guildMemberAdd:', error);
    }
  }
};
