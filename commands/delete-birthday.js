const { SlashCommandBuilder } = require("discord.js");
const pool = require("../config/db");

module.exports = {
  data: new SlashCommandBuilder().setName("delete-birthday").setDescription("Supprime ta date d'anniversaire"),

  async execute(interaction) {
    try {
      const result = await pool.query("SELECT birthday FROM users WHERE user_id = $1", [interaction.user.id]);
      if (result.rows.length === 0) {
        return interaction.reply({
          content: `Tu n'as **pas** enregistré ta date d'anniversaire.`,
          ephemeral: true,
        });
      }

      await pool.query("DELETE FROM users WHERE user_id = $1", [interaction.user.id]);

      return interaction.reply({
        content: `Ta date d'anniversaire a été **supprimée**.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("[Erreur] => lors de la suppression de ta date d'anniversaire : ", error);
      return interaction.reply({
        content: "Une erreur est survenue lors de la suppression de ta date d'anniversaire.",
        ephemeral: true,
      });
    }
  },
};
