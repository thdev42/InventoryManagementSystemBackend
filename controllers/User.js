const express = require("express");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const webToken = require("../webToken");

const registerUser = asyncHandler(async (req, res) => {
  const { email, name, password, role } = req.body;
  const userAlreadyExist = await User.findOne({ where: { email } }).catch(
    (err) => {
      console.log("Error :", err);
    }
  );
  if (userAlreadyExist) {
    res.status(401).json({ message: "User Already Exist" });
  } else {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name,
      email: email,
      password: encryptedPassword,
      role: role || "user",
    });
    // user.save();
    if (user) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: webToken(user.id, user.email),
      });
    } else {
      res.json({ message: "Cannot resgister at the moment" });
    }
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userExist = await User.findOne({ where: { email } });
  if (userExist) {
    const matchPassword = await bcrypt.compare(password, userExist.password);
    if (!matchPassword) {
      res.status(401).json({ message: "Email or Password not correct" });
    } else {
      res.json({
        id: userExist.id,
        name: userExist.name,
        email: userExist.email,
        token: webToken(userExist.id, userExist.email),
        role: userExist.role,
      });
    }
  } else {
    res.status(401).json({ message: "Email or Password not correct" });
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req?.user?.id, {
      attributes: ["id", "name", "email", "role"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { registerUser, loginUser, getUserProfile };
