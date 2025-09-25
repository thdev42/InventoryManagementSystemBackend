const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const QuotationItem = sequelize.define(
  "QuotationItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quotationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Quotations",
        key: "id",
      },
    },
    inventoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Inventories",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    dailyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    rentalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lineTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    hooks: {
      beforeSave: (item) => {
        item.lineTotal = item.quantity * item.dailyRate * item.rentalDays;
      },
    },
  }
);

module.exports = QuotationItem;
