import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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
        const isMessage = !!context.content;
        const guild = context.guild;
        const author = context.member;

        try {
            let targetUser, member, reason;

            if (isMessage) {
                // Get target from mention or ID
                targetUser = context.mentions.users.find(u => u.id !== client.user.id) || 
                             await client.users.fetch(args[0]).catch(() => null);
                             
                member = context.mentions.members.find(m => m.id !== client.user.id) || 
                         await guild.members.fetch(args[0]).catch(() => null);

                reason = args.slice(1).join(" ") || "No reason provided";
            } else {
                targetUser = context.options.getUser("target");
                member = context.options.getMember("target");
                reason = context.options.getString("reason") || "No reason provided";
            }

            // --- MANUAL VALIDATIONS (No external error classes needed) ---
            if (!targetUser || !member) {
                return context.reply({ embeds: [errorEmbed("Not Found", "I couldn't find that user in this server.")] });
            }

            if (targetUser.id === author.id) {
                return context.reply({ embeds: [errorEmbed("Validation", "You cannot kick yourself.")] });
            }

            if (member.roles.highest.position >= author.roles.highest.position && author.id !== guild.ownerId) {
                return context.reply({ embeds: [errorEmbed("Permission", "You cannot kick someone with an equal or higher role.")] });
            }

            if (!member.kickable) {
                return context.reply({ embeds: [errorEmbed("Permission", "I cannot kick this user. My role must be higher than theirs.")] });
            }

            // --- EXECUTION ---
            await member.kick(reason);

            const caseId = await logModerationAction({
                client,
                guild: guild,
                event: {
                    action: "Member Kicked",
                    target: `${targetUser.tag}`,
                    executor: `${author.user.tag}`,
                    reason
                }
            });

            const success = {
                embeds: [successEmbed(`👢 Kicked ${targetUser.tag}`, `**Reason:** ${reason}\n**Case ID:** #${caseId}`)]
            };

            return isMessage ? context.reply(success) : InteractionHelper.universalReply(context, success);

        } catch (error) {
            logger.error('Kick command error:', error);
            const errEmbed = errorEmbed("Kick Failed", "Check my role hierarchy and permissions.");
            return isMessage ? context.reply({ embeds: [errEmbed] }) : InteractionHelper.universalReply(context, { embeds: [errEmbed] });
        }
    }
};
