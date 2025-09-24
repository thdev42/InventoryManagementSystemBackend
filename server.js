const express = require("express");
const userRoutes = require("./routes/userRoutes");
const app = express();
const PORT = process.env.PORT || 5000;

const sequelize = require("./config/database");
const db = require("./models");

app.use(express.json());
sequelize.sync();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

db.sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("✅ Models synced");
    app.listen(5000, () => console.log("🚀 Server running on port 5000"));
  })
  .catch((err) => console.error("❌ Sync error:", err));

app.use("/api/auth", userRoutes);
