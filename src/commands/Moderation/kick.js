import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a user from the server")
        .addUserOption((option) =>
            option.setName("target").setDescription("The user to kick").setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the kick")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    category: "moderation",

    async execute(context, args, client) {
        try {
            const isMessage = !!context.content;
            const guild = context.guild;
            const author = context.member;
            
            let targetUser, member, reason;

            if (isMessage) {
                // Find first mention that IS NOT the bot itself
                targetUser = context.mentions.users.find(u => u.id !== client.user.id) || 
                             await client.users.fetch(args[0]).catch(() => null);
                             
                member = context.mentions.members.find(m => m.id !== client.user.id) || 
                         await guild.members.fetch(args[0]).catch(() => null);

                // Calculate reason based on where the user mention/ID is in the args
                const targetId = targetUser?.id;
                const targetIndex = args.findIndex(arg => arg.includes(targetId));
                reason = args.slice(targetIndex + 1).join(" ") || "No reason provided";
            } else {
                targetUser = context.options.getUser("target");
                member = context.options.getMember("target");
                reason = context.options.getString("reason") || "No reason provided";
            }

            // --- VALIDATIONS ---
            if (!targetUser) {
                throw new TitanBotError("No user", ErrorTypes.USER_INPUT, "Please mention a valid user or provide a valid ID.");
            }

            if (targetUser.id === author.id) {
                throw new TitanBotError("Validation", ErrorTypes.VALIDATION, "You cannot kick yourself.");
            }

            if (targetUser.id === client.user.id) {
                throw new TitanBotError("Validation", ErrorTypes.VALIDATION, "You cannot kick the bot.");
            }

            if (!member) {
                throw new TitanBotError("Not Found", ErrorTypes.USER_INPUT, "The target user is not in this server.");
            }

            if (author.roles.highest.position <= member.roles.highest.position && author.id !== guild.ownerId) {
                throw new TitanBotError("Permission", ErrorTypes.PERMISSION, "You cannot kick someone with an equal or higher role.");
            }

            if (!member.kickable) {
                throw new TitanBotError("Permission", ErrorTypes.PERMISSION, "I cannot kick this user. Check my role hierarchy.");
            }

            // --- ACTION ---
            await member.kick(reason);

            // --- LOGGING ---
            const caseId = await logModerationAction({
                client,
                guild: guild,
                event: {
                    action: "Member Kicked",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${author.user.tag} (${author.user.id})`,
                    reason,
                    metadata: { userId: targetUser.id, moderatorId: author.user.id }
                }
            });

            // --- RESPONSE ---
            const success = {
                embeds: [
                    successEmbed(
                        `👢 **Kicked** ${targetUser.tag}`,
                        `**Reason:** ${reason}\n**Case ID:** #${caseId}`,
                    ),
                ],
            };

            return isMessage ? context.reply(success) : InteractionHelper.universalReply(context, success);

        } catch (error) {
            logger.error('Kick command error:', error);
            const errorMsg = error instanceof TitanBotError ? error.message : "An unexpected error occurred.";
            const errEmbed = errorEmbed("Kick Failed", errorMsg);
            
            if (!!context.content) {
                return context.reply({ embeds: [errEmbed] });
            } else {
                return InteractionHelper.universalReply(context, { embeds: [errEmbed] });
            }
        }
    }
};
