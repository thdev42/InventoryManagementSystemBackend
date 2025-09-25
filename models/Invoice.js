const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Invoice = sequelize.define(
  "Invoice",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    quotationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Quotations",
        key: "id",
      },
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "overdue", "cancelled"),
      defaultValue: "pending",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    netProfit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    isPaid: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status === "paid";
      },
    },
  },
  {
    hooks: {
      beforeCreate: async (invoice) => {
        const count = await Invoice.count();
        invoice.invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`;

        if (!invoice.dueDate) {
          invoice.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      },
      afterUpdate: async (invoice, options) => {
        // Check if status changed to 'paid'
        if (invoice.changed("status") && invoice.status === "paid") {
          const { Expense, InvoiceItem, Inventory } = require("./index");

          // Calculate total cost of goods sold for this invoice
          const invoiceItems = await InvoiceItem.findAll({
            where: { invoiceId: invoice.id },
            include: [
              {
                model: Inventory,
                attributes: ["buyPrice"],
              },
            ],
            transaction: options.transaction,
          });

          let totalCost = 0;
          for (const item of invoiceItems) {
            const buyPrice = item.Inventory?.buyPrice || 0;
            totalCost += buyPrice * item.quantity;
          }

          // Calculate net profit (revenue - cost of goods sold)
          const netProfit = invoice.total - totalCost;

          // Update the invoice with calculated net profit
          await invoice.update(
            {
              netProfit: netProfit,
              paidDate: new Date(),
            },
            {
              transaction: options.transaction,
              hooks: false, // Prevent infinite loop
            }
          );
        }
      },
    },
  }
);

module.exports = Invoice;
