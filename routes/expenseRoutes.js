const express = require("express");
const protect = require("../middleware/protect");

const router = express.Router();

const {
  getAllExpenses,
  getExpensesStats,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/Expense");

router.route("/").get(protect, getAllExpenses);
router.route("/stats").get(protect, getExpensesStats);
router.route("/").post(protect, createExpense);
router.route("/:id").put(protect, updateExpense);
router.route("/:id").delete(protect, deleteExpense);

module.exports = router;
