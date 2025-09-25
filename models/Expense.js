const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Expense = sequelize.define("Expense", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      "Equipment Purchase",
      "Maintenance",
      "Transportation",
      "Insurance",
      "Office Supplies",
      "Marketing",
      "Utilities",
      "Other"
    ),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  inventoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Inventories",
      key: "id",
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
});

module.exports = Expense;
