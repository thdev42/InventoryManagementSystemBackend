const asyncHandler = require("express-async-handler");
const { Expense, Inventory, sequelize } = require("../models");
const { Op, fn, col, cast } = require("sequelize");

const getAllExpenses = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, category, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (category && category !== "all") where.category = category;

    if (startDate && endDate) {
      where.date = {
        $between: [new Date(startDate), new Date(endDate)],
      };
    }

    const expenses = await Expense.findAll({
      where,
      include: [{ model: Inventory, required: false }],
      order: [["date", "DESC"]],
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getExpensesStats = asyncHandler(async (req, res) => {
  try {
    const { period = "month" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "today":
        dateFilter = {
          date: {
            [Op.gte]: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            ),
          },
        };
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = { date: { [Op.gte]: weekStart } };
        break;
      case "month":
        dateFilter = {
          date: {
            [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        };
        break;
      case "year":
        dateFilter = {
          date: {
            [Op.gte]: new Date(now.getFullYear(), 0, 1),
          },
        };
        break;
    }

    // Grouped category stats
    const stats = await Expense.findAll({
      where: dateFilter,
      attributes: [
        "category",
        [fn("SUM", cast(col("amount"), "FLOAT")), "total"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: ["category"],
      raw: true,
    });

    // Total expenses
    const totalExpenses = await Expense.sum("amount", {
      where: dateFilter,
      cast: true,
    });

    res.json({
      categoryBreakdown: stats,
      totalExpenses: totalExpenses ? parseFloat(totalExpenses) : 0,
      period,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const createExpense = asyncHandler(async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const expense = await Expense.create(expenseData);

    const fullExpense = await Expense.findByPk(expense.id, {
      include: [{ model: Inventory, required: false }],
    });

    res.status(201).json(fullExpense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateExpense = asyncHandler(async (req, res) => {
  try {
    const [updated] = await Expense.update(req.body, {
      where: { id: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const expense = await Expense.findByPk(req.params.id, {
      include: [{ model: Inventory, required: false }],
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const deleteExpense = asyncHandler(async (req, res) => {
  try {
    const deleted = await Expense.destroy({
      where: { id: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  getAllExpenses,
  getExpensesStats,
  createExpense,
  updateExpense,
  deleteExpense,
};
