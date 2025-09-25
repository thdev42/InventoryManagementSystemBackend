const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const webToken = (id, username, email, role) => {
  return jwt.sign({ id, username, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

module.exports = webToken;
