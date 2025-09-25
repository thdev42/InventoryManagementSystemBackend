const express = require("express");
const asyncHandler = require("express-async-handler");
const { Inventory } = require("../models");

const getAllInventory = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, location, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where.$or = [
        { equipmentName: { $iLike: `%${search}%` } },
        { equipmentType: { $iLike: `%${search}%` } },
        { description: { $iLike: `%${search}%` } },
      ];
    }

    if (type) where.equipmentType = type;
    if (location) where.location = location;

    if (status) {
      switch (status) {
        case "available":
          where.availableStock = { $gt: 0 };
          break;
        case "low-stock":
          where.availableStock = { $lte: 5, $gt: 0 };
          break;
        case "out-of-stock":
          where.availableStock = 0;
          break;
      }
    }

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["equipmentName", "ASC"]],
    });

    res.json({
      inventory: rows,
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

const createInventory = asyncHandler(async (req, res) => {
  try {
    const inventory = await Inventory.create(req.body);
    res.status(201).json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateInventory = asyncHandler(async (req, res) => {
  try {
    console.log(req.params.id);
    const [updated] = await Inventory.update(req.body, {
      where: { id: req.params.id },
      individualHooks: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const inventory = await Inventory.findByPk(req.params.id);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const deleteInventory = asyncHandler(async (req, res) => {
  try {
    const deleted = await Inventory.destroy({
      where: { id: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = {
  getAllInventory,
  createInventory,
  updateInventory,
  deleteInventory,
};
