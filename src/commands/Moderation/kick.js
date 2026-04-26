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
                // Improved Prefix Logic: 
                // args[0] is usually the mention or ID. 
                // We remove it from the array to leave only the reason.
                targetUser = context.mentions.users.find(u => u.id !== client.user.id) || 
                             await client.users.fetch(args[0]).catch(() => null);
                             
                member = context.mentions.members.find(m => m.id !== client.user.id) || 
                         await guild.members.fetch(args[0]).catch(() => null);

                // Slice the first argument out; everything else is the reason
                reason = args.slice(1).join(" ") || "No reason provided";
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

            // check hierarchy 
            if (author.id !== guild.ownerId && author.roles.highest.position <= member.roles.highest.position) {
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
            // Log the actual error to your terminal so you can see why it failed (Hierarchy vs Permissions)
            logger.error('Kick command error:', error);
            
            const errorTitle = error instanceof TitanBotError ? error.name : "Kick Failed";
            const errorMsg = error instanceof TitanBotError ? error.message : "An unexpected error occurred. Check role hierarchy.";
            
            const errEmbed = errorEmbed(errorTitle, errorMsg);
            
            if (isMessage) {
                return context.reply({ embeds: [errEmbed] });
            } else {
                return InteractionHelper.universalReply(context, { embeds: [errEmbed] });
            }
        }
    }
};
