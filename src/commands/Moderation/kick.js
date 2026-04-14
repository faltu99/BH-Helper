import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
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

    // Added 'args' to the parameters to support prefix commands
    async execute(context, args, client) {
        try {
            const isMessage = !!context.content; // True if 'X kick' was used
            const guild = context.guild;
            const author = isMessage ? context.member : context.member;
            
            // 1. Get Target User and Member
            let targetUser, member, reason;

            if (isMessage) {
                // Prefix logic: X kick @user reason
                targetUser = context.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
                member = context.mentions.members.first() || await guild.members.fetch(args[0]).catch(() => null);
                reason = args.slice(1).join(" ") || "No reason provided";
            } else {
                // Slash logic
                targetUser = context.options.getUser("target");
                member = context.options.getMember("target");
                reason = context.options.getString("reason") || "No reason provided";
            }

            // 2. Validations
            if (!author.permissions.has(PermissionFlagsBits.KickMembers)) {
                throw new TitanBotError("User lacks permission", ErrorTypes.PERMISSION, "You do not have permission to kick members.");
            }

            if (!targetUser) {
                throw new TitanBotError("No user", ErrorTypes.USER_INPUT, "Please mention a valid user or provide a valid ID.");
            }

            if (targetUser.id === author.id) {
                throw new TitanBotError("Cannot kick self", ErrorTypes.VALIDATION, "You cannot kick yourself.");
            }

            if (targetUser.id === client.user.id) {
                throw new TitanBotError("Cannot kick bot", ErrorTypes.VALIDATION, "You cannot kick the bot.");
            }

            if (!member) {
                throw new TitanBotError("Target not found", ErrorTypes.USER_INPUT, "The target user is not currently in this server.");
            }

            if (author.roles.highest.position <= member.roles.highest.position && author.id !== guild.ownerId) {
                throw new TitanBotError("Cannot kick user", ErrorTypes.PERMISSION, "You cannot kick a user with an equal or higher role than you.");
            }

            if (!member.kickable) {
                throw new TitanBotError("Bot cannot kick", ErrorTypes.PERMISSION, "I cannot kick this user. Check my role position.");
            }

            // 3. Action
            await member.kick(reason);

            // 4. Logging
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

            // 5. Success Reply
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
            
            return !!context.content 
                ? context.reply({ embeds: [errEmbed] }) 
                : InteractionHelper.universalReply(context, { embeds: [errEmbed] });
        }
    }
};
