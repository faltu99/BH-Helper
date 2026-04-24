import { createEmbed } from '../utils/embeds.js';
import { createSelectMenu } from '../utils/components.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    Reaction_Roles: "🎭",
    Community: "👥",
    Birthday: "🎂",
    Config: "⚙️",
};

async function createCategorySelectMenu() {
    const commandsPath = path.join(__dirname, "../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        {
            label: "📋 All Commands",
            description: "View all available commands with pagination",
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const categoryName =
                category.charAt(0).toUpperCase() +
                category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: `View commands in the ${categoryName} category`,
                value: category,
            };
        }),
    ];

    // UPDATED: New Bot Name and removed description
    const embed = createEmbed({
        title: "🤖 BH Helper Help Center",
        color: 'primary'
    });

    embed.addFields(
        { name: "🛡️ **Moderation**", value: "Server moderation, user management, and enforcement tools", inline: true },
        { name: "💰 **Economy**", value: "Currency system, shops, and virtual economy", inline: true },
        { name: "🎮 **Fun**", value: "Games, entertainment, and interactive commands", inline: true },
        { name: "📊 **Leveling**", value: "User levels, XP system, and progression tracking", inline: true },
        { name: "🎫 **Tickets**", value: "Support ticket system for server management", inline: true },
        { name: "🎉 **Giveaways**", value: "Automated giveaway management and distribution", inline: true },
        { name: "👋 **Welcome**", value: "Member welcome messages and onboarding", inline: true },
        { name: "🎂 **Birthdays**", value: "Birthday tracking and celebration features", inline: true },
        { name: "🔧 **Utilities**", value: "Useful tools and server utilities", inline: true }
    );

    embed.setFooter({ text: "BH help center" });
    embed.setTimestamp();

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "Select to view the commands",
        options,
    );

    return {
        embeds: [embed],
        components: [selectRow], // buttonRow removed
    };
}

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await createCategorySelectMenu();
            await interaction.editReply({
                embeds,
                components,
            });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help back button interaction already acknowledged or expired.', {
                    event: 'interaction.help.button.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }
            throw error;
        }
    },
};

// Logic for old pagination buttons remains below...
function getPaginationInfo(components) {
    for (const row of components || []) {
        for (const component of row.components || []) {
            if (component.customId === `${PAGINATION_PREFIX}_page`) {
                const label = component.label || '';
                const match = label.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
                if (match) {
                    return { currentPage: Number(match[1]), totalPages: Number(match[2]) };
                }
            }
        }
    }
    return { currentPage: 1, totalPages: 1 };
}

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { currentPage, totalPages } = getPaginationInfo(interaction.message?.components);

            let nextPage = currentPage;
            if (interaction.customId === `${PAGINATION_PREFIX}_first`) nextPage = 1;
            else if (interaction.customId === `${PAGINATION_PREFIX}_prev`) nextPage = Math.max(1, currentPage - 1);
            else if (interaction.customId === `${PAGINATION_PREFIX}_next`) nextPage = Math.min(totalPages, currentPage + 1);
            else if (interaction.customId === `${PAGINATION_PREFIX}_last`) nextPage = totalPages;

            const { embeds, components } = await createAllCommandsMenu(nextPage, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) return;
            throw error;
        }
    },
};
