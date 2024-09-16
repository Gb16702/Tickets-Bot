const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Supprime les messages du salon")
    .addIntegerOption((option) => option.setName("amount").setDescription("Nombre de messages à supprimer (1-100)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: "Le nombre de messages à supprimer doit être compris entre 1 et 100.",
        ephemeral: true,
      });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "Tu n'as pas la permission de supprimer des messages.",
        ephemeral: true,
      });
    }

    try {
      const deletedMessages = await interaction.channel.bulkDelete(amount, true);

      return interaction.reply({
        content: `<@${interaction.user.id}> a supprimé ${deletedMessages.size} message${deletedMessages.size > 1 ? "s" : ""}.`,
        ephemeral: false,
      });
    } catch (error) {
      console.error("Erreur lors de la suppression des messages :", error);
      return interaction.reply({
        content: "Une erreur est survenue lors de la suppression des messages. Assure-toi que les messages ne datent pas de plus de 14 jours.",
        ephemeral: true,
      });
    }
  },
};
