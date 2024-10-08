const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const pool = require("../config/db");
const { fr } = require("date-fns/locale");
const { formatDistanceStrict, addMonths, setYear, isBefore, differenceInDays } = require("date-fns");

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(0)
    .setName("show-birthday")
    .setDescription("Affiche ta date d'anniversaire si tu l'as enregistrée et celles des membres à venir."),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const today = new Date();
      const threeMonthsLater = addMonths(today, 3);

      let userBirthdayMessage = "Tu n'as pas encore enregistré ta date d'anniversaire. Utilise la commande `/remember-birthday` pour l'ajouter.";
      let userBirthdayField = null;

      try {
        const userResult = await pool.query("SELECT birthday FROM users WHERE user_id = $1", [interaction.user.id]);
        if (userResult.rows.length > 0) {
          const userBirthday = new Date(userResult.rows[0].birthday);
          let nextBirthday = setYear(userBirthday, today.getFullYear());

          if (isBefore(nextBirthday, today)) {
            nextBirthday = setYear(userBirthday, today.getFullYear() + 1);
          }

          const formattedUserBirthday = nextBirthday.toLocaleDateString("fr-FR", {
            month: "long",
            day: "numeric",
          });

          const daysUntilUserBirthday = differenceInDays(nextBirthday, today);

          userBirthdayMessage = `Ton anniversaire est le **${formattedUserBirthday}** dans **${formatDistanceStrict(today, nextBirthday, {
            addSuffix: false,
            locale: fr,
          })}**. 🎉\n`;

          userBirthdayField = {
            name: interaction.user.username,
            value: `Le **${formattedUserBirthday}** (${formatDistanceStrict(today, nextBirthday, { addSuffix: false, locale: fr })})`,
          };
        }
      } catch (error) {
        console.error("[Erreur] lors de la récupération de la date d'anniversaire de l'utilisateur : ", error);
        return interaction.editReply({
          content: "Une erreur est survenue lors de la récupération de ta date d'anniversaire.",
          ephemeral: true,
        });
      }

      let memberBirthdayList = [];

      try {
        const membersResult = await pool.query("SELECT username, birthday FROM users ORDER BY birthday ASC");
        if (membersResult.rows.length > 0) {
          membersResult.rows.forEach((row) => {
            const memberBirthday = new Date(row.birthday);
            let nextMemberBirthday = setYear(memberBirthday, today.getFullYear());

            if (isBefore(nextMemberBirthday, today)) {
              nextMemberBirthday = setYear(memberBirthday, today.getFullYear() + 1);
            }

            if (nextMemberBirthday <= threeMonthsLater) {
              const formattedMemberBirthday = nextMemberBirthday.toLocaleDateString("fr-FR", {
                month: "long",
                day: "numeric",
              });

              const daysUntilMemberBirthday = differenceInDays(nextMemberBirthday, today);

              memberBirthdayList.push({
                username: row.username,
                daysUntil: daysUntilMemberBirthday,
                formattedBirthday: `Le **${formattedMemberBirthday}** (${formatDistanceStrict(today, nextMemberBirthday, {
                  addSuffix: false,
                  locale: fr,
                })})`,
              });
            }
          });

          memberBirthdayList.sort((a, b) => a.daysUntil - b.daysUntil);
        }
      } catch (error) {
        console.error("[Erreur] lors de la récupération des anniversaires des membres : ", error);
        return interaction.editReply({
          content: "Une erreur est survenue lors de la récupération des anniversaires des membres.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder().setColor("#51FC17").setTitle("Anniversaires à venir").setDescription(userBirthdayMessage);

      if (memberBirthdayList.length > 0) {
        memberBirthdayList.forEach((member) => {
          embed.addFields({ name: member.username, value: member.formattedBirthday });
        });
      } else {
        embed.addFields({ name: "Aucun anniversaire à venir", value: "Aucun membre n'a son anniversaire dans les 3 mois à venir.", inline: false });
      }

      return interaction.editReply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error("[Erreur] générale dans la commande : ", error);

      try {
        await interaction.editReply({
          content: "Une erreur est survenue lors du traitement de cette commande.",
          ephemeral: true,
        });
      } catch (interactionError) {
        console.error("Erreur lors de la tentative de réponse à l'interaction : ", interactionError);
      }
    }
  },
};
