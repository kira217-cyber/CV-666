import express from "express";
import DailyBonusSetting from "../models/DailyBonusSetting.js";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const { title, periodDays, amount, isActive, order } = req.body;

    const dailyBonus = await DailyBonusSetting.create({
      title: {
        bn: title?.bn || "",
        en: title?.en || "",
      },
      periodDays,
      amount,
      isActive,
      order,
    });

    res.status(201).json({
      success: true,
      message: "Daily bonus setting created successfully",
      data: dailyBonus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Daily bonus setting create failed",
    });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const dailyBonuses = await DailyBonusSetting.find().sort({
      order: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      data: dailyBonuses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Daily bonus settings load failed",
    });
  }
});

// READ SINGLE
router.get("/:id", async (req, res) => {
  try {
    const dailyBonus = await DailyBonusSetting.findById(req.params.id);

    if (!dailyBonus) {
      return res.status(404).json({
        success: false,
        message: "Daily bonus setting not found",
      });
    }

    res.json({
      success: true,
      data: dailyBonus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Daily bonus setting load failed",
    });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { title, periodDays, amount, isActive, order } = req.body;

    const dailyBonus = await DailyBonusSetting.findByIdAndUpdate(
      req.params.id,
      {
        title: {
          bn: title?.bn || "",
          en: title?.en || "",
        },
        periodDays,
        amount,
        isActive,
        order,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!dailyBonus) {
      return res.status(404).json({
        success: false,
        message: "Daily bonus setting not found",
      });
    }

    res.json({
      success: true,
      message: "Daily bonus setting updated successfully",
      data: dailyBonus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Daily bonus setting update failed",
    });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const dailyBonus = await DailyBonusSetting.findByIdAndDelete(req.params.id);

    if (!dailyBonus) {
      return res.status(404).json({
        success: false,
        message: "Daily bonus setting not found",
      });
    }

    res.json({
      success: true,
      message: "Daily bonus setting deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Daily bonus setting delete failed",
    });
  }
});

export default router;
