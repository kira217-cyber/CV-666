import express from "express";
import fs from "fs";
import path from "path";
import Category from "../models/Category.js";
import upload from "../config/multer.js";

const router = express.Router();

const deleteFile = (filePath = "") => {
  try {
    if (!filePath) return;

    const cleanPath = filePath.startsWith("/")
      ? filePath.slice(1)
      : filePath;

    const fullPath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("File delete error:", error.message);
  }
};

// CREATE CATEGORY
router.post("/", upload.single("icon"), async (req, res) => {
  try {
    const { categoryNameBn, categoryNameEn, isActive } = req.body;

    if (!categoryNameBn || !categoryNameEn) {
      return res.status(400).json({
        success: false,
        message: "Bangla and English category name are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category icon is required",
      });
    }

    const category = await Category.create({
      categoryName: {
        bn: categoryNameBn,
        en: categoryNameEn,
      },
      iconUrl: `/${req.file.path.replace(/\\/g, "/")}`,
      isActive: isActive === "true" || isActive === true,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ALL CATEGORIES
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ACTIVE CATEGORIES
router.get("/active", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// UPDATE CATEGORY
router.put("/:id", upload.single("icon"), async (req, res) => {
  try {
    const { categoryNameBn, categoryNameEn, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (categoryNameBn) category.categoryName.bn = categoryNameBn;
    if (categoryNameEn) category.categoryName.en = categoryNameEn;

    if (isActive !== undefined) {
      category.isActive = isActive === "true" || isActive === true;
    }

    if (req.file) {
      deleteFile(category.iconUrl);
      category.iconUrl = `/${req.file.path.replace(/\\/g, "/")}`;
    }

    await category.save();

    res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// DELETE CATEGORY
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    deleteFile(category.iconUrl);

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;