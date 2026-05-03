import express from "express";
import fs from "fs";
import path from "path";
import GameProvider from "../models/GameProvider.js";
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
    console.log("Provider icon delete error:", error.message);
  }
};

// CREATE PROVIDER
router.post("/", upload.single("providerIcon"), async (req, res) => {
  try {
    const { categoryId, providerId, status } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const exists = await GameProvider.findOne({
      categoryId,
      providerId: String(providerId).toUpperCase(),
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    const provider = await GameProvider.create({
      categoryId,
      providerId: String(providerId).toUpperCase(),
      providerIcon: req.file ? `/${req.file.path.replace(/\\/g, "/")}` : "",
      status: status === "inactive" ? "inactive" : "active",
    });

    const populatedProvider = await GameProvider.findById(provider._id).populate(
      "categoryId"
    );

    res.status(201).json({
      success: true,
      message: "Provider created successfully",
      data: populatedProvider,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ALL PROVIDERS
router.get("/", async (req, res) => {
  try {
    const { categoryId, status } = req.query;

    const query = {};

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (status) {
      query.status = status;
    }

    const providers = await GameProvider.find(query)
      .populate("categoryId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ACTIVE PROVIDERS
router.get("/active", async (req, res) => {
  try {
    const { categoryId } = req.query;

    const query = {
      status: "active",
    };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    const providers = await GameProvider.find(query)
      .populate("categoryId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET SINGLE PROVIDER
router.get("/:id", async (req, res) => {
  try {
    const provider = await GameProvider.findById(req.params.id).populate(
      "categoryId"
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// UPDATE PROVIDER
router.put("/:id", upload.single("providerIcon"), async (req, res) => {
  try {
    const { categoryId, providerId, status, removeOldIcon } = req.body;

    const provider = await GameProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    if (categoryId) {
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      provider.categoryId = categoryId;
    }

    if (providerId) {
      provider.providerId = String(providerId).toUpperCase();
    }

    if (status) {
      provider.status = status === "inactive" ? "inactive" : "active";
    }

    if (removeOldIcon === "true" && provider.providerIcon) {
      deleteFile(provider.providerIcon);
      provider.providerIcon = "";
    }

    if (req.file) {
      if (provider.providerIcon) {
        deleteFile(provider.providerIcon);
      }

      provider.providerIcon = `/${req.file.path.replace(/\\/g, "/")}`;
    }

    await provider.save();

    const updatedProvider = await GameProvider.findById(provider._id).populate(
      "categoryId"
    );

    res.json({
      success: true,
      message: "Provider updated successfully",
      data: updatedProvider,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// DELETE PROVIDER
router.delete("/:id", async (req, res) => {
  try {
    const provider = await GameProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    deleteFile(provider.providerIcon);

    await GameProvider.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Provider deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;