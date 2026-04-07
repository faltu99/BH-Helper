import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage user roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        // Subcommand: ADD
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a role to a member")
                .addUserOption(o => o.setName("target").setDescription("The member").setRequired(true))
                .addRoleOption(o => o.setName("role").setDescription("The role to add").setRequired(true))
        )
        // Subcommand: REMOVE
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a role from a member")
                .addUserOption(o => o.setName("target").setDescription("The member").setRequired(true))
                .addRoleOption(o => o.setName("role").setDescription("The role to remove").setRequired(true))
        ),
    category: "moderation",

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) return;

        try {
            const target = interaction.options.getMember("target");
            const role = interaction.options.getRole("role");
            const sub = interaction.options.getSubcommand();

            if (!target) {
                throw new Error("That user is not in this server.");
            }

            // Check if the bot can actually manage this role
            if (role.managed) {
                throw new Error("I cannot manage this role because it is controlled by an integration (like another bot).");
            }

            if (interaction.guild.members.me.roles.highest.position <= role.position) {
                throw new Error("I cannot manage this role because it is higher than or equal to my own role in the hierarchy.");
            }

            if (sub === "add") {
                if (target.roles.cache.has(role.id)) {
                    throw new Error(`${target.user.tag} already has that role.`);
                }
                await target.roles.add(role);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed("Role Added", `Successfully added ${role} to ${target}`)]
                });
            } 
            
            else if (sub === "remove") {
                if (!target.roles.cache.has(role.id)) {
                    throw new Error(`${target.user.tag} does not have that role.`);
                }
                await target.roles.remove(role);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed("Role Removed", `Successfully removed ${role} from ${target}`)]
                });
            }

        } catch (error) {
            logger.error('Role command error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Command Failed", error.message)]
            });
        }
    }
};
                  
