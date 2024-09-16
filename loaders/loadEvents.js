const { readdirSync } = require("fs");

module.exports = (client) => {
  let count = 0;
  const dirs = readdirSync(`./events`);
  for (const dir of dirs) {
    const files = readdirSync(`./events/${dir}`).filter((file) => file.endsWith(".js"));
    for (const file of files) {
      const event = require(`../events/${dir}/${file}`);
      client.on(event.name, (...args) => event.execute(client, ...args));
      count++;
    }
  }

  console.log(`[Events] => ${count} events loaded`);
};
