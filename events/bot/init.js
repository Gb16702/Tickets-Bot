const { Events, ActivityType } = require("discord.js");
const cron = require("node-cron");
const pool = require("../../config/db");

const updateMemberCount = async (client) => {
  try {
    await client.guilds.cache.first().members.fetch();
    const memberCount = client.guilds.cache.first().memberCount;
    client.channels.cache.get(process.env.MEMBER_COUNT_CHANNEL_ID).setName(`Membres : ${memberCount}`);
    client.user.setActivity(`${memberCount} membres`, { type: ActivityType.Watching });
  } catch (error) {
    console.error(`[Erreur] lors de la mise à jour du nombre de membres :`, error);
  }
};

const isBirthdayDate = (date1, date2) => {
  return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth();
};

const checkBirthdays = async (client) => {
  try {
    const today = new Date();
    const query = `SELECT user_id, username, birthday, display_year FROM users`;
    const { rows: users } = await pool.query(query);

    const birthdayChannel = client.channels.cache.get(process.env.BIRTHDAY_CHANNEL_ID);

    for (const user of users) {
      const birthday = new Date(user.birthday);
      const currentYear = today.getFullYear();
      const birthYear = birthday.getFullYear();

      if (isBirthdayDate(birthday, today)) {
        let message;

        if (user.display_year) {
          const age = currentYear - birthYear;
          message = `<@${user.user_id}> fête ses \`${age}\` ans aujourd'hui ! Joyeux anniversaire 🎉 !`;
        } else {
          message = `Joyeux anniversaire, <@${user.user_id}> 🎉 !`;
        }

        if (birthdayChannel) {
          await birthdayChannel.send(message);
        }
      }
    }
  } catch (error) {
    console.error(`[Erreur] => lors de la vérification des anniversaires :`, error);
  }
};

module.exports = {
  name: Events.ClientReady,

  async execute(client) {
    console.log(`[${client.user.username}] => online`);

    await updateMemberCount(client);

    cron.schedule("0 */6 * * *", () => {
      console.log("[Tâche cron] => mise à jour du nombre de membres");
      updateMemberCount(client);
    });

    cron.schedule("0 0 * * *", () => {
      console.log("[Tâche cron] => vérification des anniversaires toutes les 15 secondes");
      checkBirthdays(client);
    });
  },
};
