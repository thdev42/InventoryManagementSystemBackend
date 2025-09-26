const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const {
  sequelize,
  Expense,
  Quotation,
  Invoice,
  Rental,
  Inventory,
} = require("../models");

const getDashboardData = asyncHandler(async (req, res) => {
  try {
    const { period = "today" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "today":
        dateFilter = {
          createdAt: {
            [Op.gte]: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            ),
          },
        };
        break;
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { createdAt: { [Op.gte]: weekStart } };
        break;
      case "month":
        dateFilter = {
          createdAt: {
            [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        };
        break;
      case "year":
        dateFilter = {
          createdAt: {
            [Op.gte]: new Date(now.getFullYear(), 0, 1),
          },
        };
        break;
    }

    const monthlyDateFilter = {
      createdAt: {
        [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    };

    // Inventory stats
    const inventoryStats = await Inventory.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalEquipment"],
        [sequelize.fn("SUM", sequelize.col("totalStock")), "totalStock"],
        [sequelize.fn("SUM", sequelize.col("rentedStock")), "equipmentOut"],
      ],
    });

    // Revenue stats
    const revenueStats = await Invoice.findOne({
      where: {
        status: "paid",
        ...dateFilter,
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total")), "totalRevenue"],
        [sequelize.fn("COUNT", sequelize.col("id")), "paidInvoices"],
      ],
    });

    const monthlyRevenueStats = await Invoice.findOne({
      where: {
        status: "paid",
        ...monthlyDateFilter,
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total")), "monthlyIncome"],
        [sequelize.fn("SUM", sequelize.col("netProfit")), "monthlyNetProfit"],
      ],
    });

    console.log("[v0] Checking expenses with dateFilter:", dateFilter);
    console.log(
      "[v0] Checking monthly expenses with monthlyDateFilter:",
      monthlyDateFilter
    );

    // Check if any expenses exist at all
    const allExpenses = await Expense.findAll({
      attributes: ["id", "amount", "description", "createdAt"],
    });
    console.log("[v0] All expenses in database:", allExpenses);

    // Expense stats
    const expenseStats = await Expense.findOne({
      where: dateFilter,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("amount")), "totalExpenses"],
      ],
    });

    const monthlyExpenseStats = await Expense.findOne({
      where: monthlyDateFilter,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("amount")), "monthlyExpenses"],
      ],
    });

    console.log("[v0] Expense stats result:", expenseStats);
    console.log("[v0] Monthly expense stats result:", monthlyExpenseStats);

    // Active rentals
    const activeRentals = await Rental.count({
      where: { status: "active" },
    });

    // Recent activity
    const recentQuotations = await Quotation.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "quotationNumber",
        "customerName",
        "total",
        "status",
        "createdAt",
      ],
    });

    const recentInvoices = await Invoice.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "invoiceNumber",
        "customerName",
        "total",
        "status",
        "createdAt",
        "netProfit",
      ],
    });

    // Top customers (by total invoice amount)
    const topCustomers = await Invoice.findAll({
      where: { status: "paid" },
      attributes: [
        "customerName",
        [sequelize.fn("SUM", sequelize.col("total")), "totalSpent"],
        [sequelize.fn("COUNT", sequelize.col("id")), "invoiceCount"],
      ],
      group: ["customerName"],
      order: [[sequelize.fn("SUM", sequelize.col("total")), "DESC"]],
      limit: 5,
    });

    const revenue = Number.parseFloat(
      revenueStats?.dataValues?.totalRevenue || revenueStats?.totalRevenue || 0
    );
    const expenses = Number.parseFloat(
      expenseStats?.dataValues?.totalExpenses ||
        expenseStats?.totalExpenses ||
        0
    );
    const netProfit = revenue - expenses;

    const monthlyIncome = Number.parseFloat(
      monthlyRevenueStats?.dataValues?.monthlyIncome ||
        monthlyRevenueStats?.monthlyIncome ||
        0
    );
    const monthlyExpenses = Number.parseFloat(
      monthlyExpenseStats?.dataValues?.monthlyExpenses ||
        monthlyExpenseStats?.monthlyExpenses ||
        0
    );
    const monthlyNetProfit = Number.parseFloat(
      monthlyRevenueStats?.dataValues?.monthlyNetProfit ||
        monthlyRevenueStats?.monthlyNetProfit ||
        0
    );

    console.log(
      "[v0] Final calculations - expenses:",
      expenses,
      "monthlyExpenses:",
      monthlyExpenses
    );

    res.json({
      inventory: {
        totalEquipment: Number.parseInt(inventoryStats?.totalEquipment || 0),
        totalStock: Number.parseInt(inventoryStats?.totalStock || 0),
        equipmentOut: Number.parseInt(inventoryStats?.equipmentOut || 0),
        activeRentals,
      },
      financial: {
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit,
        paidInvoices: Number.parseInt(revenueStats?.paidInvoices || 0),
        monthlyIncome,
        monthlyExpenses,
        monthlyNetProfit,
      },
      activity: {
        recentQuotations,
        recentInvoices,
        topCustomers,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { getDashboardData };
