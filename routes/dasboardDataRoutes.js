const express = require("express");
const protect = require("../middleware/protect");
const { getDashboardData } = require("../controllers/Dashboard");
const router = express.Router();

router.route("/stats").get(protect, getDashboardData);

module.exports = router;
