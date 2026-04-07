import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { WarningService } from '../../services/warningService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a user")
        .addUserOption((o) =>
            o
                .setName("target")
                .setRequired(true)
                .setDescription("User to warn"),
        )
        .addStringOption((o) =>
            o
                .setName("reason")
                .setRequired(true)
                .setDescription("Reason for the warning"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Warn interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'warn'
            });
            return;
        }

        try {
            const target = interaction.options.getUser("target");
            const member = interaction.options.getMember("target");
            const reason = interaction.options.getString("reason");
            const moderator = interaction.user;
            const guildId = interaction.guildId;

            if (!member) {
                throw new Error("The target user is not currently in this server.");
            }

            // 1. Save warning to your database
            const result = await WarningService.addWarning({
                guildId,
                userId: target.id,
                moderatorId: moderator.id,
                reason,
                timestamp: Date.now()
            });

            if (!result.success) {
                throw new Error("Failed to store warning in database");
            }

            const totalWarns = result.totalCount;

            // 2. Try to DM the user (will skip if their DMs are closed)
            let dmSent = true;
            try {
                await target.send({
                    embeds: [
                        warningEmbed(
                            `You received a warning in ${interaction.guild.name}`,
                            `**Reason:** ${reason}\n**Total Warnings:** ${totalWarns}`
                        )
                    ]
                });
            } catch (err) {
                dmSent = false;
            }

            // 3. Log it to your mod logs channel
            await logModerationAction({
                client,
                guild: interaction.guild,
                event: {
                    action: "User Warned",
                    target: `${target.tag} (${target.id})`,
                    executor: `${moderator.tag} (${moderator.id})`,
                    reason,
                    metadata: {
                        userId: target.id,
                        moderatorId: moderator.id,
                        totalWarns,
                        warningNumber: totalWarns,
                        warningId: result.id
                    }
                }
            });

            // 4. Send the public reply + Mention the user
            await InteractionHelper.safeEditReply(interaction, {
                content: `⚠️ Warning issued to ${target}`, // This mentions/pings them
                embeds: [
                    successEmbed(
                        `Warned ${target.tag}`,
                        `**Reason:** ${reason}\n**Total Warns:** ${totalWarns}${!dmSent ? '\n\n*Note: User could not be DM\'d (Privacy settings).* ' : ''}`,
                    ),
                ],
            });

        } catch (error) {
            logger.error('Warn command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'warn_failed' });
        }
    }
};
