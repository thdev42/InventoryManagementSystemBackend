const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quotation = sequelize.define(
  "Quotation",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quotationNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("draft", "sent", "accepted", "rejected", "expired"),
      defaultValue: "draft",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATE,
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
  },
  {
    hooks: {
      beforeCreate: async (quotation) => {
        // Generate quotation number
        const count = await Quotation.count();
        quotation.quotationNumber = `QUO-${String(count + 1).padStart(6, "0")}`;

        // Set default valid until date (30 days from now)
        if (!quotation.validUntil) {
          quotation.validUntil = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          );
        }
      },
      beforeSave: (quotation) => {
        // Calculate totals
        quotation.taxAmount = quotation.subtotal * (quotation.taxRate / 100);
        quotation.total = quotation.subtotal + quotation.taxAmount;
      },
    },
  }
);

module.exports = Quotation;
