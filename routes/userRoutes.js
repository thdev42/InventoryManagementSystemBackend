const express = require("express");
const {
  loginUser,
  registerUser,
  getUserProfile,
} = require("../controllers/User");
const protect = require("../middleware/protect");
const admin = require("../middleware/admin");
const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/me").get(protect, getUserProfile);

module.exports = router;
