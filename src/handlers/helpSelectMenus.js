import { createEmbed } from '../utils/embeds.js';
import { createButton, getPaginationRow } from '../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";
const CATEGORY_SELECT_ID = "help-category-select";
const FOOTER_TEXT = "BH Helper help center"; // Rebranded footer
const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

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

// ... (buildHelpEntries and normalizeCommandData functions remain the same) ...

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);
    if (!commandData?.name) return [];
    const baseName = commandData.name;
    const baseDescription = commandData.description || "No description";
    const options = commandData.options || [];
    const entries = [];

    for (const option of options) {
        if (!option) continue;
        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({ baseName, displayName: `${baseName} ${option.name}`, description: option.description || baseDescription, category });
            continue;
        }
        if (option.type === SUBCOMMAND_GROUP_TYPE) {
            const nestedOptions = option.options || [];
            for (const nested of nestedOptions) {
                if (nested?.type !== SUBCOMMAND_TYPE) continue;
                entries.push({ baseName, displayName: `${baseName} ${option.name} ${nested.name}`, description: nested.description || option.description || baseDescription, category });
            }
        }
    }
    if (entries.length === 0) {
        entries.push({ baseName, displayName: baseName, description: baseDescription, category });
    }
    return entries;
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) return null;
    const jsonData = typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
    if (!jsonData?.name) return null;
    return {
        ...jsonData,
        options: Array.isArray(jsonData.options) ? jsonData.options.map((option) => typeof option?.toJSON === 'function' ? option.toJSON() : option) : [],
    };
}

async function createCategoryCommandsMenu(category, client) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];

    try {
        const categoryPath = path.join(__dirname, "../commands", category);
        const commandFiles = (await fs.readdir(categoryPath)).filter((file) => file.endsWith(".js")).sort();

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default;
            const commandData = normalizeCommandData(command);

            if (commandData && commandData.name !== "help" && commandData.name !== "commandlist") {
                categoryCommands.push(...buildHelpEntries(command, categoryName));
            }
        }
    } catch (error) {
        logger.error(`Error reading commands from category ${category}:`, error);
    }

    categoryCommands.sort((a, b) => a.displayName.localeCompare(b.displayName));
    let registeredCommands = new Collection();
    try {
        if (client?.application?.commands?.fetch) {
            const commands = await client.application.commands.fetch();
            for (const cmd of commands.values()) registeredCommands.set(cmd.name, cmd);
        }
    } catch (error) { logger.error('Error fetching registered commands:', error); }

    const embed = createEmbed({
        title: `${icon} ${categoryName} Commands`,
        description: categoryCommands.length > 0 ? `Click any command mention below to use it:` : `No commands found in the **${categoryName}** category.`,
        color: 'primary' // Consistent color
    });

    if (categoryCommands.length > 0) {
        const commandMentions = categoryCommands.map((cmd) => {
            const registeredCmd = registeredCommands.get(cmd.baseName);
            return (registeredCmd && registeredCmd.id) ? `</${cmd.displayName}:${registeredCmd.id}> · ${cmd.description}` : `\`/${cmd.displayName}\` · ${cmd.description}`;
        }).join("\n");

        if (commandMentions.length <= 1000) {
            embed.addFields({ name: "Commands", value: commandMentions, inline: false });
        } else {
            const chunks = commandMentions.match(/[\s\S]{1,1000}(\n|$)/g) || [];
            chunks.forEach((chunk, index) => embed.addFields({ name: `Commands (Part ${index + 1})`, value: chunk, inline: false }));
        }
    }

    embed.setFooter({ text: FOOTER_TEXT });
    embed.setTimestamp();

    const backButton = createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false);
    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    return { embeds: [embed], components: [buttonRow] };
}

export async function createAllCommandsMenu(page = 1, client) {
    const commandsPerPage = 45;
    const allCommands = [];
    const commandsPath = path.join(__dirname, "../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true })).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name).sort();

    for (const category of categoryDirs) {
        try {
            const categoryPath = path.join(__dirname, "../commands", category);
            const commandFiles = (await fs.readdir(categoryPath)).filter((file) => file.endsWith(".js")).sort();
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                const commandModule = await import(`file://${filePath}`);
                const command = commandModule.default;
                const commandData = normalizeCommandData(command);
                if (commandData && commandData.name !== "help" && commandData.name !== "commandlist") {
                    allCommands.push(...buildHelpEntries(command, category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()));
                }
            }
        } catch (error) { logger.error(`Error reading category ${category}:`, error); }
    }

    allCommands.sort((a, b) => a.displayName.localeCompare(b.displayName));
    let registeredCommands = new Collection();
    try {
        if (client?.application?.commands?.fetch) {
            const commands = await client.application.commands.fetch();
            for (const cmd of commands.values()) registeredCommands.set(cmd.name, cmd);
        }
    } catch (error) { logger.error('Error fetching commands:', error); }

    const totalPages = Math.ceil(allCommands.length / commandsPerPage);
    const pageCommands = allCommands.slice((page - 1) * commandsPerPage, page * commandsPerPage);

    const embed = createEmbed({
        title: "📋 All Commands",
        description: `(${allCommands.length} total commands, including subcommands)`,
        color: 'primary'
    });

    embed.setFooter({ text: FOOTER_TEXT });
    embed.setTimestamp();

    if (pageCommands.length > 0) {
        const commandMentions = pageCommands.map((cmd) => {
            const registeredCmd = registeredCommands.get(cmd.baseName);
            return (registeredCmd && registeredCmd.id) ? `</${cmd.displayName}:${registeredCmd.id}> · ${cmd.category}` : `\`/${cmd.displayName}\` · ${cmd.category}`;
        });

        const columnCount = pageCommands.length > 20 ? 3 : (pageCommands.length > 10 ? 2 : 1);
        const chunkSize = Math.ceil(commandMentions.length / columnCount);

        for (let i = 0; i < columnCount; i++) {
            const chunk = commandMentions.slice(i * chunkSize, (i + 1) * chunkSize).join("\n");
            if (chunk) embed.addFields({ name: i === 0 ? `Commands (Page ${page})` : "Commands (cont.)", value: chunk, inline: columnCount > 1 });
        }
    }

    const components = [];
    if (totalPages > 1) components.push(getPaginationRow(PAGINATION_PREFIX, page, totalPages));
    components.push(new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false)));

    return { embeds: [embed], components, currentPage: page, totalPages };
}

export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
            const selectedCategory = interaction.values[0];
            const { embeds, components } = (selectedCategory === ALL_COMMANDS_ID) 
                ? await createAllCommandsMenu(1, client) 
                : await createCategoryCommandsMenu(selectedCategory, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) return;
            logger.error('Error in select menu:', error);
        }
    },
};
                    
