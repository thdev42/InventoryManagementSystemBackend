const express = require("express");
const protect = require("../middleware/protect");
const {
  getAllQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  createInvoiceFromQuotation,
} = require("../controllers/Quotations");
const router = express.Router();

router.route("/").get(protect, getAllQuotations);
router.route("/").post(protect, createQuotation);
router.route("/:id").put(protect, updateQuotation);
router.route("/:id").delete(protect, deleteQuotation);
router.route("/:id/create-invoice").post(protect, createInvoiceFromQuotation);

module.exports = router;
