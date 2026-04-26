import { createEmbed } from '../utils/embeds.js';
import { createSelectMenu } from '../utils/components.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";

const CATEGORY_ICONS = {
    Core: "ℹ️", Moderation: "🛡️", Economy: "💰", Fun: "🎮", Leveling: "📊",
    Utility: "🔧", Ticket: "🎫", Welcome: "👋", Giveaway: "🎉", Counter: "🔢",
    Tools: "🛠️", Search: "🔍", Reaction_Roles: "🎭", Community: "👥",
    Birthday: "🎂", Config: "⚙️",
};

// Internal function to rebuild the BH Helper home menu
async function rebuildHomeMenu() {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        { label: "📋 All Commands", description: "View all commands with pagination", value: ALL_COMMANDS_ID },
        ...categoryDirs.map((category) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            return {
                label: `${CATEGORY_ICONS[categoryName] || "🔍"} ${categoryName}`,
                description: `View commands in the ${categoryName} category`,
                value: category,
            };
        }),
    ];

    const embed = createEmbed({
        title: "🤖 BH Helper Help Center",
        color: 'primary'
    });

    embed.addFields(
        { name: "🛡️ **Moderation**", value: "Server moderation and user management", inline: true },
        { name: "💰 **Economy**", value: "Currency and virtual shop system", inline: true },
        { name: "🎮 **Fun**", value: "Games and interactive commands", inline: true },
        { name: "📊 **Leveling**", value: "XP and progression tracking", inline: true },
        { name: "🎫 **Tickets**", value: "Support ticket management", inline: true },
        { name: "⚙️ **Config**", value: "Server configuration tools", inline: true }
    );

    embed.setFooter({ text: "BH Helper help center" });

    const selectRow = createSelectMenu(CATEGORY_SELECT_ID, "Select to view the commands", options);

    return { embeds: [embed], components: [selectRow] };
}

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            // This stops the "Interaction Failed" spinner immediately
            await interaction.deferUpdate().catch(() => {});

            const { embeds, components } = await rebuildHomeMenu();
            
            await interaction.editReply({
                embeds: embeds,
                components: components
            });
        } catch (error) {
            logger.error('Back Button Error:', error);
        }
    },
};

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`, // Handles next/prev/first/last
    async execute(interaction, client) {
        try {
            await interaction.deferUpdate().catch(() => {});

            // Helper to get current page from embed footer or components
            const label = interaction.message.components[0].components.find(c => c.customId?.includes('page'))?.label || "1";
            const match = label.match(/Page\s+(\d+)/i);
            const currentPage = match ? parseInt(match[1]) : 1;

            let nextPage = currentPage;
            if (interaction.customId.endsWith('next')) nextPage++;
            if (interaction.customId.endsWith('prev')) nextPage--;
            if (interaction.customId.endsWith('first')) nextPage = 1;

            const { embeds, components } = await createAllCommandsMenu(nextPage, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            logger.error('Pagination Error:', error);
        }
    },
};
