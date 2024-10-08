const pool = require("../config/db");
const { SlashCommandBuilder } = require("discord.js");
const verifyDate = require("../utils/verifyDate");

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(0)
    .setName("remember-birthday")
    .setDescription("Mémorise ta date d'anniversaire")
    .addStringOption((option) => option.setName("date").setDescription("Entre ta date d'anniversaire au format YYYY-MM-DD").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("show")
        .setDescription("Souhaites-tu que le bot écrive ton âge lorsque ce sera ton anniversaire ?")
        .setRequired(true)
        .addChoices({ name: "Oui, afficher mon âge", value: "yes" }, { name: "Non, ne pas afficher mon âge", value: "no" })
    ),

  async execute(interaction) {
    const birthday = interaction.options.getString("date");
    const show = interaction.options.getString("show") === "yes" ? true : false;

    const { valid, message } = verifyDate(birthday);
    if (!valid) {
      return interaction.reply({
        content: message,
        ephemeral: true,
      });
    }

    const formattedBirthday = new Date(birthday).toLocaleDateString("fr-FR", {
      month: "long",
      day: "numeric",
    });

    const birthYear = new Date(birthday).getFullYear();
    const currentYear = new Date().getFullYear();

    try {
      const result = await pool.query("SELECT birthday FROM users WHERE user_id = $1", [interaction.user.id]);

      if (result.rows.length > 0) {
        return interaction.reply({
          content: "Tu as **déjà** une date d'anniversaire enregistrée.",
          ephemeral: true,
        });
      }

      await pool.query(
        "INSERT INTO users (user_id, username, birthday, display_year) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET username = $2, birthday = $3, display_year = $4",
        [interaction.user.id, interaction.user.tag, birthday, show]
      );

      const isBirthdayDate = (date1, date2) => {
        return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth();
      };

      if (isBirthdayDate(new Date(birthday), new Date())) {
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
        content: `Ta date d'anniversaire a été mémorisée pour le \`${formattedBirthday}\`. ${
          show ? "Ton âge sera affiché." : "Ton âge ne sera pas affiché."
        }`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("[Erreur] lors de la mise à jour de ta date d'anniversaire : ", error);
      return interaction.reply({
        content: "Une erreur est survenue lors de la mise à jour de ta date d'anniversaire.",
        ephemeral: true,
      });
    }
  },
};
