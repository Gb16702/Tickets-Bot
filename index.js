const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const { VIP_ROLE_ID, MOD_ROLE_ID, BYPASS_ROLE_ID, CHANNEL_ID, MEMBER_COUNT_CHANNEL_ID, TICKET_CHANNEL_ID, MODERATION_CATEGORY_ID } = process.env;

const activeTickets = new Map();

client.once("ready", async () => {
  console.log("Ready");

  const guild = client.guilds.cache.first();
  const memberCountChannel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
  const ticketChannel = guild.channels.cache.get(TICKET_CHANNEL_ID);

  if (!ticketChannel) return console.error("Le salon permettant de créer des tickets est introuvable");
  if (!memberCountChannel) return console.error("Le salon vocal permettant de connaitre le nombre de membres est introuvable");

  const ticketButton = new ButtonBuilder().setCustomId("create_ticket").setLabel("Créer un ticket").setStyle(ButtonStyle.Primary);
  const embed = new EmbedBuilder()
    .setColor("#5764F2")
    .setTitle("Contacter un Modérateur")
    .setDescription(
      "Tu as besoin d'aide ?\n" + "Section réservée aux demandes **nécéssitant un modérateur**.\n\n" + "⚠️  Tout ticket inutile sera **sanctionné !**"
    );

  const row = new ActionRowBuilder().addComponents(ticketButton);

  const fetchedMessage = await ticketChannel.messages.fetch({ limit: 1 });
  const existingMessage = fetchedMessage.first();

  if (!existingMessage) {
    await ticketChannel.send({
      embeds: [embed],
      components: [row],
    });
  }

  const updateMemberCount = async () => {
    try {
      await guild.members.fetch();
      const memberCount = guild.memberCount;
      await memberCountChannel.setName(`Membres : ${memberCount}`);
      console.log(`Le salon a été mis à jour avec ${memberCount} membres`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nombre de membres : ", error);
    }
  };

  await updateMemberCount();

  setInterval(updateMemberCount, 1000 * 60 * 60 * 6);

  if (guild) {
    console.log("Les membres sont maintenant en cache.");
  } else {
    console.error("Serveur non trouvé.");
  }
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (!oldMember.roles.cache.has(VIP_ROLE_ID) && newMember.roles.cache.has(VIP_ROLE_ID)) {
    newMember.roles.add(BYPASS_ROLE_ID).catch(console.error);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
      channel
        .send(`Tu as reçu le rôle Bypass suite à l'obtention du rôle VIP <@${newMember.user.id}>.`)
        .then(() => {
          console.log(`Le rôle Bypass a été attribué à ${newMember.user.tag} et un message a été envoyé.`);
        })
        .catch(console.error);
    } else {
      console.error("Le canal spécifié est introuvable.");
    }
  }
});

const closeAfterTimeout = (channel) => {
  const timeout = setTimeout(async () => {
    if (channel) {
      await channel.send("Le ticket va être fermé car aucune interaction n'a eu lieu dans les 48 heures.");
      channel.delete().catch(console.error);
      activeTickets.delete(channel.id);
    }
  }, 1000 * 60 * 60 * 48);

  activeTickets.set(channel.id, timeout);
};

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {
    const { guild, user } = interaction;

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: MODERATION_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: MOD_ROLE_ID,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const closeButton = new ButtonBuilder().setCustomId("close_ticket").setLabel("Fermer le ticket").setStyle(ButtonStyle.Danger);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("Ticket d'assistance")
      .setDescription(`Bonjour <@${user.id}>, un modérateur te répondra bientôt.`);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    interaction.reply({
      content: "Le ticket a été créé avec succès.",
      ephemeral: true,
    });

    closeAfterTimeout(channel);
  }

  if (interaction.customId === "close_ticket") {
    const { channel } = interaction;

    if (channel.name.startsWith("ticket-")) {
      await interaction.reply({ content: "Le ticket va être fermé dans 5 secondes.", ephemeral: true });
      clearTimeout(activeTickets.get(channel.id));
      setTimeout(() => channel.delete(), 5000);
      activeTickets.delete(channel.id);
    } else {
      interaction.reply({ content: "Tu ne peux pas fermer ce salon.", ephemeral: true });
    }
  }
});

client.on("messageCreate", (message) => {
  const channel = message.channel;

  if (channel.name.startsWith("ticket-")) {
    const userId = channel.name.split("-")[1];
    const modRole = message.guild.roles.cache.get(MOD_ROLE_ID);

    if (message.member.roles.highest.comparePositionTo(modRole) >= 0 && message.author.id !== userId) {
      if (activeTickets.has(channel.id)) {
        clearTimeout(activeTickets.get(channel.id));
        closeAfterTimeout(channel);
      }
    }
  }
});

client.login(process.env.CLIENT_SERCRET);
