import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(oldMember, newMember) {
    try {
      if (!newMember.guild) return;

      const ROLE_NEWBIE = '1492379204510158908';
      const ROLE_MEMBER = '1490204502618411048';

      // --- ROLE SWAP LOGIC ---
      // Check if they JUST gained the Member role (from Arcane or Admin)
      const gainedMember = !oldMember.roles.cache.has(ROLE_MEMBER) && newMember.roles.cache.has(ROLE_MEMBER);

      if (gainedMember) {
        if (newMember.roles.cache.has(ROLE_NEWBIE)) {
          await newMember.roles.remove(ROLE_NEWBIE);
          logger.info(`♻️ Swapped Newbie for Member for ${newMember.user.username}`);
        }
      }

      // --- NICKNAME LOGGING ---
      if (oldMember.nickname !== newMember.nickname) {
        await logEvent({
          client: newMember.client,
          guildId: newMember.guild.id,
          eventType: EVENT_TYPES.MEMBER_NAME_CHANGE,
          data: {
            description: `Nickname changed: ${newMember.user.tag}`,
            userId: newMember.user.id,
            fields: [
                { name: 'Old', value: oldMember.nickname || 'None', inline: true },
                { name: 'New', value: newMember.nickname || 'None', inline: true }
            ]
          }
        });
      }

    } catch (error) {
      logger.error('Error in guildMemberUpdate event:', error);
    }
  }
};
