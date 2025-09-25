const express = require("express");
const protect = require("../middleware/protect");
const {
  getAllInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} = require("../controllers/Inventory");
const admin = require("../middleware/admin");
const router = express.Router();

router.route("/").get(protect, admin("admin"), getAllInventory);
router.route("/").post(protect, admin("admin"), createInventory);
router.route("/:id").put(protect, admin("admin"), updateInventory);
router.route("/:id").delete(protect, admin("admin"), deleteInventory);

module.exports = router;
