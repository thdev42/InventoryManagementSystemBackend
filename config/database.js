const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

console.log("Database URL:", process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER_NAME,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST_NAME,
      port: process.env.DB_PORT || 5432,
      dialect: "postgres",
    }
  );
}

try {
  sequelize.authenticate();
  console.log("✅ Connection has been established successfully.");
} catch (error) {
  console.error("❌ Unable to connect to the database:", error);
}

module.exports = sequelize;
