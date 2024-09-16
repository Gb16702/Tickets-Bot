const { Events, InteractionType } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        if(interaction.type === InteractionType.ApplicationCommand) {
            
            const command = client.commands.get(interaction.commandName);
            command.execute(interaction);
        }
    }
}
