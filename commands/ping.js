const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Tester la connexion au bot").setDefaultMemberPermissions(null),

  async execute(interaction) {
    interaction.reply({ content: `\`${interaction.client.ws.ping} ms\``, ephemeral: true });
  },
};
