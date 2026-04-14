import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot speak')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The message content')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('box-mode')
                .setDescription('Send as an embed box? (Default: false)'))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to send to')
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option => 
            option.setName('reply')
                .setDescription('ID of a message to reply to'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const text = interaction.options.getString('text').replace(/\\n/g, '\n');
        const boxMode = interaction.options.getBoolean('box-mode') || false;
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const replyId = interaction.options.getString('reply');

        try {
            let messagePayload = {};

            // 1. Handle "Box Mode" (Embed) vs Normal Text
            if (boxMode) {
                const embed = new EmbedBuilder()
                    .setColor('#2b2d31') // Carl-bot style dark color
                    .setDescription(text);
                messagePayload.embeds = [embed];
            } else {
                messagePayload.content = text;
            }

            // 2. Handle Reply Logic
            if (replyId) {
                messagePayload.reply = { messageReference: replyId, failIfNotExists: false };
            }

            // 3. Send the message
            await targetChannel.send(messagePayload);

            // 4. Confirm to the user (Ephemerally so it doesn't clutter)
            return interaction.reply({ content: `✅ Message sent to ${targetChannel}!`, ephemeral: true });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "❌ Error: Make sure the message ID is correct and I have permission for that channel.", ephemeral: true });
        }
    },
};
