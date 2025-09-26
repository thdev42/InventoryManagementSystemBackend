const { Sequelize } = require("sequelize");

const User = require("./User");
const sequelize = require("../config/database");
const Quotation = require("./Quotations");
const QuotationItem = require("./QuotationItems");
const Expense = require("./Expense");
const Inventory = require("./Inventory");
const Invoice = require("./Invoice");
const InvoiceItem = require("./InvoiceItem");
const Rental = require("./Rental");

User.hasMany(Quotation, { foreignKey: "createdBy" });
Quotation.belongsTo(User, { foreignKey: "createdBy" });

Quotation.hasMany(QuotationItem, { foreignKey: "quotationId" });
QuotationItem.belongsTo(Quotation, { foreignKey: "quotationId" });

Inventory.hasMany(QuotationItem, { foreignKey: "inventoryId" });
QuotationItem.belongsTo(Inventory, { foreignKey: "inventoryId" });

Quotation.hasOne(Invoice, { foreignKey: "quotationId" });
Invoice.belongsTo(Quotation, { foreignKey: "quotationId" });

User.hasMany(Invoice, { foreignKey: "createdBy" });
Invoice.belongsTo(User, { foreignKey: "createdBy" });

Invoice.hasMany(InvoiceItem, { foreignKey: "invoiceId" });
InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId" });

Inventory.hasMany(InvoiceItem, { foreignKey: "inventoryId" });
InvoiceItem.belongsTo(Inventory, { foreignKey: "inventoryId" });

Invoice.hasMany(Rental, { foreignKey: "invoiceId" });
Rental.belongsTo(Invoice, { foreignKey: "invoiceId" });

Inventory.hasMany(Rental, { foreignKey: "inventoryId" });
Rental.belongsTo(Inventory, { foreignKey: "inventoryId" });

Inventory.hasMany(Expense, {
  foreignKey: "inventoryId",
  onDelete: "CASCADE",
  hooks: true,
});
Expense.belongsTo(Inventory, {
  foreignKey: "inventoryId",
  onDelete: "CASCADE",
});

User.hasMany(Expense, { foreignKey: "createdBy" });
Expense.belongsTo(User, { foreignKey: "createdBy" });

const db = {
  sequelize,
  User,
  Quotation,
  QuotationItem,
  Expense,
  Inventory,
  Invoice,
  InvoiceItem,
  Rental,
};
module.exports = db;
