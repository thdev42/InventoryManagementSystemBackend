const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Inventory = sequelize.define(
  "Inventory",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    equipmentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    equipmentType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    availableStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reservedStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rentedStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    maintenanceStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    dailyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    weeklyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    monthlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    buyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    condition: {
      type: DataTypes.ENUM("excellent", "good", "fair", "poor"),
      defaultValue: "good",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    hooks: {
      beforeSave: (inventory) => {
        const total =
          inventory.availableStock +
          inventory.reservedStock +
          inventory.rentedStock +
          inventory.maintenanceStock;
        if (total !== inventory.totalStock) {
          inventory.totalStock = total;
        }
      },

      // Create Expense on Inventory CREATE
      afterCreate: async (inventory, options) => {
        const { Expense } = require("./index");

        if (inventory.buyPrice > 0) {
          console.log("TRIGGERED CREATE");

          const totalCost = inventory.buyPrice * inventory.totalStock;

          await Expense.create(
            {
              description: `Equipment Purchase - ${inventory.equipmentName}`,
              amount: totalCost,
              category: "Equipment Purchase",
              date: new Date(),
              inventoryId: inventory.id,
              notes: `Buy price: $${inventory.buyPrice} x ${inventory.totalStock} units`,
              createdBy: options.userId || 1,
            },
            { transaction: options.transaction }
          );
        }
      },

      // Update Expense on Inventory UPDATE
      afterUpdate: async (inventory, options) => {
        const { Expense } = require("./index");
        console.log("TRIGGERED UPDATE");
        if (
          (inventory.changed("buyPrice") || inventory.changed("totalStock")) &&
          inventory.buyPrice > 0
        ) {
          const totalCost = inventory.buyPrice * inventory.totalStock;

          // Try to find existing expense
          const existingExpense = await Expense.findOne({
            where: { inventoryId: inventory.id },
            transaction: options.transaction,
          });

          if (existingExpense) {
            // Update expense if already exists
            await existingExpense.update(
              {
                amount: totalCost,
                notes: `Buy price: $${inventory.buyPrice} x ${inventory.totalStock} units`,
                date: new Date(),
              },
              { transaction: options.transaction }
            );
          } else {
            // Otherwise create a new one
            await Expense.create(
              {
                description: `Equipment Purchase - ${inventory.equipmentName}`,
                amount: totalCost,
                category: "Equipment Purchase",
                date: new Date(),
                inventoryId: inventory.id,
                notes: `Buy price: $${inventory.buyPrice} x ${inventory.totalStock} units`,
                createdBy: options.userId || 1,
              },
              { transaction: options.transaction }
            );
          }
        }
      },
    },
  }
);

module.exports = Inventory;
