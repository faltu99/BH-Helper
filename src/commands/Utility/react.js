import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('Make the bot react to a specific message')
        .addStringOption(option => 
            option.setName('message_id').setDescription('The ID of the message to react to').setRequired(true))
        .addStringOption(option => 
            option.setName('reaction').setDescription('The emoji to react with').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(context, args, client) {
        const isMessage = !!context.content;
        
        // 1. Get the inputs
        const messageId = isMessage ? args[0] : context.options.getString('message_id');
        const emoji = isMessage ? args[1] : context.options.getString('reaction');

        if (!messageId || !emoji) {
            const errorMsg = "❌ Usage: `X react <message_id> <emoji>`";
            return isMessage ? context.reply(errorMsg) : context.reply({ content: errorMsg, ephemeral: true });
        }

        try {
            // 2. Find the message in the current channel
            // Note: To react to a message in a DIFFERENT channel, you'd need the channel ID too.
            const targetMessage = await context.channel.messages.fetch(messageId);

            if (!targetMessage) {
                return context.reply("❌ I couldn't find that message in this channel.");
            }

            // 3. React
            await targetMessage.react(emoji);

            const successMsg = `✅ Reacted to message \`${messageId}\` with ${emoji}`;
            return isMessage ? context.reply(successMsg) : context.reply({ content: successMsg, ephemeral: true });

        } catch (error) {
            client.logger.error('React Command Error:', error);
            const failMsg = "❌ Failed to react. Make sure the ID is correct and I have permission to react in this channel.";
            return isMessage ? context.reply(failMsg) : context.reply({ content: failMsg, ephemeral: true });
        }
    },
};

