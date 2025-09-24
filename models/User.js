const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "user",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    timestamps: true,

    createdAt: true,

    updatedAt: false,
  }
);
// User.associations = (models) => {
//   User.hasMany(models.Blog, {
//     foreignKey: "creatorId",
//   });
// };
module.exports = User;
