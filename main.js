const loadCommands = require("./loaders/loadCommands");
const loadEvents = require("./loaders/loadEvents");
const {
  Client,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  IntentsBitField,
  Collection,
} = require("discord.js");
const cron = require("node-cron");
const loadModals = require("./loaders/loadModals");

require("dotenv").config();

const client = new Client({
  intents: new IntentsBitField(53608447),
});

client.commands = new Collection();

(async () => {
  await loadCommands(client);
  loadEvents(client);
  loadModals(client);
  await client.login(process.env.TOKEN);
})();

const { VIP_ROLE_ID, MOD_ROLE_ID, GUILD_ID, BYPASS_ROLE_ID, TICKET_CHANNEL_ID, MODERATION_CATEGORY_ID } = process.env;

const activeTickets = new Map();

let statusMessageId = null;
let statusChannel = null;
const environment = process.env.ENV ?? "dev";
const isRemote = environment === "prod";

client.once("ready", async () => {
  const guild = client.guilds.cache.first();
  const ticketChannel = guild.channels.cache.get(TICKET_CHANNEL_ID);

  if (!ticketChannel) return console.error("Le salon permettant de créer des tickets est introuvable");

  statusChannel = guild.channels.cache.get(process.env.SERVER_STATUS_ID);
  if (!statusChannel) return console.error("Le salon permettant de vérifier le statut du bot est introuvable");

  const fetchedMessages = await statusChannel.messages.fetch({ limit: 1 });
  const existingStatusMessage = fetchedMessages.first();
  const initialStatus = client.ws.status === 0 ? "en ligne" : "hors ligne";
  const initialEmbed = createStatusEmbed(initialStatus, isRemote);

  if (existingStatusMessage) {
    statusMessageId = existingStatusMessage.id;
    await existingStatusMessage.edit({ embeds: [initialEmbed] });
    console.log("Le statut du bot a été mis à jour.");

  } else {
    const message = await statusChannel.send({ embeds: [initialEmbed] });
    statusMessageId = message.id;
    console.log("Le statut du bot a été créé.");
  }

  cron.schedule("*/1 * * * *", async () => {
    console.log("[Tâche cron] => vérification du statut du bot");
    const status = client.ws.status === 0 ? "en ligne" : "hors ligne";
    const updatedEmbed = createStatusEmbed(status, isRemote);

    try {
      const fetchedMessage = await statusChannel.messages.fetch(statusMessageId);
      if (fetchedMessage) {
        await fetchedMessage.edit({ embeds: [updatedEmbed] });
      }
    } catch (error) {
      console.error("[Erreur] => lors de la mise à jour de l'état du bot :", error);
    }
  });

  function createStatusEmbed(status, isRemote) {
    return new EmbedBuilder()
      .setTitle("Statut du Bot")
      .setColor(status === "en ligne" ? "#51FC17" : "Red")
      .setDescription(statusText(status, isRemote))
      .setFooter({
        text: `Dernière vérification : ${getFormattedDate()}`,
      });
  }

  function getFormattedDate() {
    const now = new Date();
    const today = new Date();

    if (now.getDate() === today.getDate() && now.getMonth() === today.getMonth() && now.getFullYear() === today.getFullYear()) {
      return `Aujourd'hui à ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    } else {
      return `Le ${now.toLocaleString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })} à ${now
        .toLocaleString("fr-FR", {
          hour: "numeric",
          minute: "numeric",
        })
        .replace(":", "H")}`;
    }
  }

  function statusText(status, isRemote) {
    if (status === "en ligne") {
      return isRemote
        ? "<a:online:1291046453124399186> Le bot est en **ligne**. Tous les services sont **opérationnels**"
        : "<a:maintenance:1291046424317923368> Le bot est en **maintenance**. Certains services **pourraient** ne pas fonctionner";
    } else {
      return "<a:offline:1291046453124399186> Le bot est **hors** ligne. Les services ne sont **pas** opérationnels";
    }
  }

  const ticketButton = new ButtonBuilder().setCustomId("create_ticket").setLabel("Créer un ticket").setStyle(ButtonStyle.Primary);
  const embed = new EmbedBuilder()
    .setColor("#5764F2")
    .setTitle("Ouvrir un ticket avec le staff")
    .setDescription(
      "Tu as besoin d'aide ?\n" +
        "Section réservée aux demandes nécessitant un **modérateur**. Tout ticket inutile sera **sanctionné !**\n\n" +
        `-# Vérifie le **statut** du bot dans le salon <#${process.env.SERVER_STATUS_ID}> avant d'en ouvrir un.`
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
});

client.on("disconnect", async () => {
  console.log("Le bot a été déconnecté.");
  const updatedEmbed = createStatusEmbed("hors ligne", isRemote);

  try {
    const fetchedMessage = await statusChannel.messages.fetch(statusMessageId);
    if (fetchedMessage) {
      await fetchedMessage.edit({ embeds: [updatedEmbed] });
    }
  } catch (error) {
    console.error("[Erreur] => lors de la mise à jour de l'état 'hors ligne' du bot :", error);
  }
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (!oldMember.roles.cache.has(VIP_ROLE_ID) && newMember.roles.cache.has(VIP_ROLE_ID)) {
    newMember.roles.add(BYPASS_ROLE_ID).catch(console.error);

    const channel = client.channels.cache.get(GUILD_ID);
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

cron.schedule("0 * * * *", async () => {
  console.log("[Tâche cron] => Vérification des tickets inactifs");

  for (const [channelId, lastMessageTime] of activeTickets.entries()) {
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;

    console.log(`Ticket ${channelId} - Temps depuis le dernier message : ${timeSinceLastMessage / 1000 / 60 / 60} heures`);

    const channel = client.channels.cache.get(channelId);

    if (channel && channel.parentId === MODERATION_CATEGORY_ID) {
      if (timeSinceLastMessage > 1000 * 60 * 60 * 48) {
        console.log(`Suppression du salon ${channelId} pour inactivité.`);
        await channel.delete().catch(console.error);
        activeTickets.delete(channelId);
      }
    } else {
      console.log(`Le salon ${channelId} n'est pas un ticket support, il ne sera pas supprimé.`);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { guild, user } = interaction;

  if (interaction.customId === "create_ticket") {
    const sanitizedUsername = user.username.replace(/[^a-zA-Z0-9]/g, "");
    const existingChannel = guild.channels.cache
      .filter((channel) => channel.name.includes(sanitizedUsername) && channel.parentId === MODERATION_CATEGORY_ID)
      .first();

    if (existingChannel) {
      return interaction.reply({
        content: "Tu as déjà un ticket ouvert. Ferme-le avant d'en créer un nouveau.",
        ephemeral: true,
      });
    }

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1).toString().padStart(2, "0")}${now
      .getFullYear()
      .toString()
      .slice(2)}${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;

    const channelName = `${formattedDate}-${user.username}`;
    const channel = await guild.channels.create({
      name: `${channelName}`,
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
      .setDescription(`Bonjour <@${user.id}>, parle-nous de ton problème et un admin te répondra`)
      .setFooter({
        text: `Créé le ${new Date().toLocaleString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} à ${new Date()
          .toLocaleString("fr-FR", {
            hour: "numeric",
            minute: "numeric",
          })
          .replace(":", "H")}`,
      });

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    interaction.reply({
      content: "Le ticket a été créé avec succès.",
      ephemeral: true,
    });
  }

  if (interaction.customId === "close_ticket") {
    const { channel, member, user } = interaction;

    const modRole = interaction.guild.roles.cache.get(MOD_ROLE_ID);

    if (
      (channel.name.endsWith(user.username) || member.roles.highest.comparePositionTo(modRole) >= 0) &&
      channel.parentId === MODERATION_CATEGORY_ID
    ) {
      await interaction.reply({ content: "Le ticket va être fermé dans 5 secondes.", ephemeral: true });
      activeTickets.delete(channel.id);
      setTimeout(() => channel.delete(), 5000);
    } else {
      interaction.reply({ content: "Tu n'as pas la permission de fermer ce salon.", ephemeral: true });
    }
  }
});
