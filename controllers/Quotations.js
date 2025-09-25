const express = require("express");
const asyncHandler = require("express-async-handler");
const Quotation = require("../models/Quotations");
const QuotationItem = require("../models/QuotationItems");
const Inventory = require("../models/Inventory");

const { sequelize, Invoice, InvoiceItem } = require("../models");

const getAllQuotations = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.$or = [
        { quotationNumber: { $iLike: `%${search}%` } },
        { customerName: { $iLike: `%${search}%` } },
        { customerEmail: { $iLike: `%${search}%` } },
      ];
    }

    const { count, rows } = await Quotation.findAndCountAll({
      where,
      include: [
        {
          model: QuotationItem,
          include: [{ model: Inventory }],
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      quotations: rows,
      pagination: {
        total: count,
        page: Number.parseInt(page),
        pages: Math.ceil(count / limit),
        limit: Number.parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const createQuotation = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items, ...quotationData } = req.body;
    quotationData.createdBy = req.user.id;

    // Create quotation
    const quotation = await Quotation.create(quotationData, { transaction });

    let subtotal = 0;

    // Create quotation items and reserve stock
    for (const item of items) {
      const inventory = await Inventory.findByPk(item.inventoryId, {
        transaction,
      });

      if (!inventory) {
        throw new Error(`Inventory item ${item.inventoryId} not found`);
      }

      if (inventory.availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${inventory.equipmentName}`);
      }

      // Reserve stock
      await inventory.update(
        {
          availableStock: inventory.availableStock - item.quantity,
          reservedStock: inventory.reservedStock + item.quantity,
        },
        { transaction }
      );

      // Create quotation item
      const quotationItem = await QuotationItem.create(
        {
          quotationId: quotation.id,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          dailyRate: item.dailyRate || inventory.dailyRate,
          rentalDays: item.rentalDays,
          lineTotal:
            (item.dailyRate || inventory.dailyRate) *
            item.quantity *
            item.rentalDays,
        },
        { transaction }
      );

      subtotal += quotationItem.lineTotal;
    }

    // Update quotation totals
    await quotation.update({ subtotal }, { transaction });

    await transaction.commit();

    const fullQuotation = await Quotation.findByPk(quotation.id, {
      include: [
        {
          model: QuotationItem,
          include: [{ model: Inventory }],
        },
      ],
    });

    res.status(201).json(fullQuotation);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

const updateQuotation = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { status, ...updateData } = req.body;
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        {
          model: QuotationItem,
          include: [{ model: Inventory }],
        },
      ],
      transaction,
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // If updating status and rejecting or expiring, release reserved stock
    if (
      status &&
      (status === "rejected" || status === "expired") &&
      quotation.status !== status
    ) {
      for (const item of quotation.QuotationItems) {
        await item.Inventory.update(
          {
            availableStock: item.Inventory.availableStock + item.quantity,
            reservedStock: item.Inventory.reservedStock - item.quantity,
          },
          { transaction }
        );
      }
    }

    // Update quotation with all provided data
    const updateFields = { ...updateData };
    if (status) updateFields.status = status;

    await quotation.update(updateFields, { transaction });
    await transaction.commit();

    res.json(quotation);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

const deleteQuotation = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        {
          model: QuotationItem,
          include: [{ model: Inventory }],
        },
      ],
      transaction,
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // Release reserved stock
    for (const item of quotation.QuotationItems) {
      await item.Inventory.update(
        {
          availableStock: item.Inventory.availableStock + item.quantity,
          reservedStock: item.Inventory.reservedStock - item.quantity,
        },
        { transaction }
      );
    }

    // Delete quotation items first (due to foreign key constraints)
    await QuotationItem.destroy({
      where: { quotationId: quotation.id },
      transaction,
    });

    // Delete quotation
    await quotation.destroy({ transaction });

    await transaction.commit();
    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

const createInvoiceFromQuotation = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        {
          model: QuotationItem,
          include: [{ model: Inventory }],
        },
      ],
      transaction,
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    if (quotation.status !== "accepted") {
      return res.status(400).json({
        error: "Only approved quotations can be converted to invoices",
      });
    }

    // Check if invoice already exists for this quotation
    const existingInvoice = await Invoice.findOne({
      where: { quotationId: quotation.id },
      transaction,
    });

    if (existingInvoice) {
      return res
        .status(400)
        .json({ error: "Invoice already exists for this quotation" });
    }

    const invoiceCount = await Invoice.count({ transaction });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, "0")}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice from quotation
    const invoice = await Invoice?.create(
      {
        invoiceNumber, // Explicitly set the generated invoice number
        quotationId: quotation.id,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        customerPhone: quotation.customerPhone || "",
        customerAddress: quotation.customerAddress || "",
        subtotal: quotation.subtotal || 0,
        taxAmount: quotation.taxAmount || 0,
        total: quotation.total || quotation.subtotal || 0,
        dueDate: dueDate,
        status: "pending",
        createdBy: req.user.id,
      },
      { transaction }
    );

    // Create invoice items from quotation items
    for (const quotationItem of quotation.QuotationItems) {
      await InvoiceItem.create(
        {
          invoiceId: invoice.id,
          inventoryId: quotationItem.inventoryId,
          quantity: quotationItem.quantity,
          dailyRate: quotationItem.dailyRate,
          rentalDays: quotationItem.rentalDays,
          lineTotal: quotationItem.lineTotal,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: InvoiceItem,
          include: [{ model: Inventory }],
        },
      ],
    });

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: fullInvoice,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});
module.exports = {
  getAllQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  createInvoiceFromQuotation,
};
