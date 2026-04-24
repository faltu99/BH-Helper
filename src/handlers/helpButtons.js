import { createEmbed } from '../utils/embeds.js';
import { createSelectMenu } from '../utils/components.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, logger } from 'discord.js';

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

/**
 * Clean Home Menu Creator
 * Rebranded for BH Helper and removed all TitanBot references.
 */
async function getHomeMenu() {
    const commandsPath = path.join(__dirname, "../commands");
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

    // Re-adding the fields you had in your clean help.js
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
            // Ensure we use deferUpdate to stop the "Interaction failed" spinner
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await getHomeMenu();
            
            await interaction.editReply({
                embeds: embeds,
                components: components
            });
        } catch (error) {
            console.error('Back Button Error:', error);
        }
    },
};

// ... keep your helpPaginationButton code here ...
