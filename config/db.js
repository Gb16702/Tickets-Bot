require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error("Erreur de connexion à la base de données :", err.stack);
  } else {
    console.log("Connecté à la base de données PostgreSQL.");
  }
});

module.exports = pool;
