const asyncHandler = require("express-async-handler");
const {
  Invoice,
  sequelize,
  QuotationItem,
  Inventory,
  Quotation,
  InvoiceItem,
  Rental,
} = require("../models");

const getAllInvoices = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.$or = [
        { invoiceNumber: { $iLike: `%${search}%` } },
        { customerName: { $iLike: `%${search}%` } },
        { customerEmail: { $iLike: `%${search}%` } },
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Quotation }, { model: InvoiceItem }],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      invoices: rows,
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

const togglePaidStatus = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { isPaid } = req.body;

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Quotation,
          include: [
            {
              model: QuotationItem,
              include: [{ model: Inventory }],
            },
          ],
        },
      ],
      transaction,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Update invoice paid status
    await invoice.update(
      {
        isPaid,
        status: isPaid ? "paid" : "pending",
        paidDate: isPaid ? new Date() : null,
        paidAmount: isPaid ? invoice.total : 0,
      },
      { transaction }
    );

    // If marking as paid, create rental records and update inventory
    if (isPaid && invoice.Quotation) {
      for (const item of invoice.Quotation.QuotationItems) {
        // Check if rental record already exists
        const existingRental = await Rental.findOne({
          where: {
            invoiceId: invoice.id,
            inventoryId: item.inventoryId,
          },
          transaction,
        });

        if (!existingRental) {
          await Rental.create(
            {
              invoiceId: invoice.id,
              inventoryId: item.inventoryId,
              customerName: invoice.customerName,
              quantity: item.quantity,
              startDate: invoice.Quotation.startDate,
              endDate: invoice.Quotation.endDate,
              dailyRate: item.dailyRate,
              totalAmount: item.lineTotal,
            },
            { transaction }
          );

          // Move stock from reserved to rented
          await item.Inventory.update(
            {
              reservedStock: Math.max(
                0,
                item.Inventory.reservedStock - item.quantity
              ),
              rentedStock: item.Inventory.rentedStock + item.quantity,
            },
            { transaction }
          );
        }
      }
    } else if (!isPaid && invoice.Quotation) {
      // If marking as unpaid, remove rental records and revert inventory
      for (const item of invoice.Quotation.QuotationItems) {
        await Rental.destroy({
          where: {
            invoiceId: invoice.id,
            inventoryId: item.inventoryId,
          },
          transaction,
        });

        // Move stock from rented back to reserved
        await item.Inventory.update(
          {
            reservedStock: item.Inventory.reservedStock + item.quantity,
            rentedStock: Math.max(
              0,
              item.Inventory.rentedStock - item.quantity
            ),
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const updatedInvoice = await Invoice.findByPk(invoice.id, {
      include: [{ model: Quotation }],
    });

    res.json(updatedInvoice);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  getAllInvoices,
  togglePaidStatus,
};
