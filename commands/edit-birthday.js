const { SlashCommandBuilder } = require("@discordjs/builders");
const pool = require("../config/db");
const verifyDate = require("../utils/verify-date");

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(0)
    .setName("edit-birthday")
    .setDescription("Modifie ta date d'anniversaire enregistrée")
    .addStringOption((option) =>
      option.setName("new-date").setDescription("Entre ta nouvelle date d'anniversaire au format YYYY-MM-DD").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("show")
        .setDescription("Souhaites-tu que le bot affiche ton âge lors de ton anniversaire ?")
        .setRequired(true)
        .addChoices({ name: "Oui, afficher mon âge", value: "yes" }, { name: "Non, ne pas afficher mon âge", value: "no" })
    ),

  async execute(interaction) {
    const newBirthday = interaction.options.getString("new-date");
    const show = interaction.options.getString("show") === "yes";

    const { valid, message } = verifyDate(newBirthday);
    if (!valid) {
      return interaction.reply({
        content: message,
        ephemeral: true,
      });
    }

    const birthdayDate = new Date(newBirthday);
    const formattedBirthday = birthdayDate.toLocaleDateString("fr-FR", {
      month: "long",
      day: "numeric",
    });

    const birthYear = birthdayDate.getFullYear();
    const currentYear = new Date().getFullYear();

    try {
      const result = await pool.query("SELECT birthday FROM users WHERE user_id = $1", [interaction.user.id]);

      if (result.rows.length === 0) {
        return interaction.reply({
          content: "Tu n'as pas de date d'anniversaire enregistrée. Utilise la commande `/remember-birthday` pour en ajouter une.",
          ephemeral: true,
        });
      }

      await pool.query("UPDATE users SET birthday = $1, display_year = $2 WHERE user_id = $3", [newBirthday, show, interaction.user.id]);

      const isBirthdayDate = (date1, date2) => {
        return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth();
      };

      if (isBirthdayDate(birthdayDate, new Date())) {
        const birthdayChannel = interaction.guild.channels.cache.get(process.env.BIRTHDAY_CHANNEL_ID);
        if (birthdayChannel) {
          let message;
          if (show) {
            const age = currentYear - birthYear;
            message = `<@${interaction.user.id}> fête ses \`${age}\` ans. Joyeux anniversaire ! 🎉`;
          } else {
            message = `Joyeux anniversaire, <@${interaction.user.id}> ! 🎉`;
          }
          await birthdayChannel.send(message);
        }
      }

      return interaction.reply({
        content: `Ta date d'anniversaire a été mise à jour pour le \`${formattedBirthday}\`. ${
          show ? "Ton âge sera affiché." : "Ton âge ne sera pas affiché."
        }`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("[Erreur] => lors de la mise à jour de ta date d'anniversaire : ", error);
      return interaction.reply({
        content: "Une erreur est survenue lors de la mise à jour de ta date d'anniversaire.",
        ephemeral: true,
      });
    }
  },
};
