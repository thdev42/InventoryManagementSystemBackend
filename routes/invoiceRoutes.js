const express = require("express");
const protect = require("../middleware/protect");
const { getAllInvoices, togglePaidStatus } = require("../controllers/Invoice");

const router = express.Router();

router.route("/").get(protect, getAllInvoices);
router.route("/:id/toggle-paid").patch(protect, togglePaidStatus);

module.exports = router;
