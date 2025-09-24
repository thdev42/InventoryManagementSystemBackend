const { Sequelize } = require("sequelize");

const User = require("./User");
const sequelize = require("../config/database");

const db = { sequelize, User };
module.exports = db;
