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
                .setDescription('Select channel (optional)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const text = interaction.options.getString('text');
        // If no channel is selected, it defaults to the current interaction channel
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.send({
                content: text,
                allowedMentions: {
                    parse: ['roles', 'users', 'everyone']
                }
            });

            await interaction.reply({
                content: `Message sent to ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Failed to send message. Make sure I have permission to speak in that channel!',
                ephemeral: true
            });
        }
    },
};
