import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message as the bot')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Message to send')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select channel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const text = interaction.options.getString('text');
        const channel = interaction.options.getChannel('channel');

        try {
            await channel.send({
                content: text,
                allowedMentions: {
                    parse: ['roles', 'users', 'everyone']
                }
            });

            await interaction.reply({
                content: 'Sent',
                ephemeral: true
            });

        } catch {
            await interaction.reply({
                content: 'Failed',
                ephemeral: true
            });
        }
    },
};
