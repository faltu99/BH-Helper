import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage user roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Add a role to a member")
                .addUserOption(o => o.setName("user").setDescription("The member").setRequired(true))
                .addRoleOption(o => o.setName("role").setDescription("The role to add").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a role from a member")
                .addUserOption(o => o.setName("user").setDescription("The member").setRequired(true))
                .addRoleOption(o => o.setName("role").setDescription("The role to remove").setRequired(true))
        ),
    category: "moderation",

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) return;

        try {
            const member = interaction.options.getMember("user");
            const role = interaction.options.getRole("role");
            const sub = interaction.options.getSubcommand();

            if (!member) throw new Error("That user is not in this server.");

            if (role.managed) throw new Error("I cannot manage this role.");
            
            if (interaction.guild.members.me.roles.highest.position <= role.position) {
                throw new Error("I cannot manage this role because it is higher than mine.");
            }

            // Clean text formatting: No @ symbols, just bold names
            const roleName = `**${role.name}**`;
            const userName = `**${member.user.username}**`;

            if (sub === "add") {
                if (member.roles.cache.has(role.id)) {
                    throw new Error(`${member.user.tag} already has the ${role.name} role.`);
                }
                
                await member.roles.add(role);
                
                await InteractionHelper.safeEditReply(interaction, {
                    // Removed the mention from content to prevent the ping
                    content: null, 
                    embeds: [
                        successEmbed(
                            "Role Added", 
                            `Added ${roleName} to ${userName}`
                        )
                    ]
                });
            } 
            
            else if (sub === "remove") {
                if (!member.roles.cache.has(role.id)) {
                    throw new Error(`${member.user.tag} does not have the ${role.name} role.`);
                }

                await member.roles.remove(role);

                await InteractionHelper.safeEditReply(interaction, {
                    content: null,
                    embeds: [
                        successEmbed(
                            "Role Removed", 
                            `Removed ${roleName} from ${userName}`
                        )
                    ]
                });
            }

        } catch (error) {
            logger.error('Role command error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                content: null,
                embeds: [errorEmbed("Command Failed", error.message)]
            });
        }
    }
};
