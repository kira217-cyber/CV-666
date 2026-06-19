import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";

import GameProvider from "../models/GameProvider.js";
import Category from "../models/Category.js";
import Game from "../models/Game.js";
import upload from "../config/multer.js";

const router = express.Router();

const ORACLE_PROVIDER_LIST_API =
  process.env.ORACLE_PROVIDER_LIST_API ||
  "https://oraclegames.net/api/providerlist";

const ORACLE_PROVIDER_LIST_KEY =
  process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const cleanProviderId = (value = "") => cleanText(value).toUpperCase();

const filePath = (file) => {
  if (!file) return "";
  return `/${file.path.replace(/\\/g, "/")}`;
};

const deleteFile = (filePath = "") => {
  try {
    if (!filePath) return;
    if (String(filePath).startsWith("http")) return;

    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

    const fullPath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("Provider icon delete error:", error.message);
  }
};

const buildFileUrl = (req, filePath = "") => {
  if (!filePath) return "";
  if (String(filePath).startsWith("http")) return filePath;

  return `${req.protocol}://${req.get("host")}${
    filePath.startsWith("/") ? filePath : `/${filePath}`
  }`;
};

const formatProvider = (req, provider) => {
  const obj = provider.toObject ? provider.toObject() : provider;

  return {
    ...obj,
    providerIconUrl: obj.providerIcon
      ? buildFileUrl(req, obj.providerIcon)
      : "",
  };
};

/* ======================================================
   FETCH ORACLE PROVIDER LIST
   GET /api/game-providers/oracle/list
====================================================== */

router.get("/oracle/list", async (req, res) => {
  try {
    const response = await axios.get(ORACLE_PROVIDER_LIST_API, {
      headers: {
        "x-oraclegamedata-key": ORACLE_PROVIDER_LIST_KEY,
        "x-api-key": ORACLE_PROVIDER_LIST_KEY,
      },
      timeout: 30000,
    });

    const list = Array.isArray(response.data)
      ? response.data
      : response.data?.data || response.data?.providers || [];

    const providers = list
      .filter((item) => item?.code || item?.providerCode)
      .map((item) => ({
        providerId: cleanProviderId(item.code || item.providerCode),
        providerCode: cleanProviderId(item.code || item.providerCode),
        providerName: cleanText(item.name || item.providerName || ""),
        image: item.image || item.providerIcon || "",
        raw: item,
      }));

    return res.json({
      success: true,
      message: "Oracle provider list fetched successfully",
      data: providers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Failed to fetch Oracle provider list",
    });
  }
});

/* ======================================================
   SYNC ORACLE PROVIDERS
   POST /api/game-providers/oracle/sync
====================================================== */

router.post("/oracle/sync", async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!Array.isArray(providers) || providers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Providers array is required",
      });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const savedProviders = [];

    for (const item of providers) {
      const providerId = cleanProviderId(
        item.providerId || item.providerCode || item.code,
      );

      if (!providerId) {
        skipped += 1;
        continue;
      }

      const existing = await GameProvider.findOne({
        categoryId,
        providerId,
      });

      if (existing) {
        if (item.image && !existing.providerIcon) {
          existing.providerIcon = item.image;
        }

        existing.status = "active";

        await existing.save();

        updated += 1;
        savedProviders.push(formatProvider(req, existing));
      } else {
        const provider = await GameProvider.create({
          categoryId,
          providerId,
          providerIcon: item.image || "",
          status: "active",
        });

        created += 1;
        savedProviders.push(formatProvider(req, provider));
      }
    }

    return res.json({
      success: true,
      message: "Oracle providers synced successfully",
      data: {
        created,
        updated,
        skipped,
        providers: savedProviders,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   CREATE PROVIDER
   POST /api/game-providers
====================================================== */

router.post("/", upload.single("providerIcon"), async (req, res) => {
  try {
    const { categoryId, providerId, status } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required",
      });
    }

    if (!providerId) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const finalProviderId = cleanProviderId(providerId);

    const exists = await GameProvider.findOne({
      categoryId,
      providerId: finalProviderId,
    });

    if (exists) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    const provider = await GameProvider.create({
      categoryId,
      providerId: finalProviderId,
      providerIcon: req.file ? filePath(req.file) : "",
      status: status === "inactive" ? "inactive" : "active",
    });

    const populatedProvider = await GameProvider.findById(
      provider._id,
    ).populate("categoryId");

    return res.status(201).json({
      success: true,
      message: "Provider created successfully",
      data: formatProvider(req, populatedProvider),
    });
  } catch (error) {
    if (req.file) deleteFile(filePath(req.file));

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET ALL PROVIDERS
   GET /api/game-providers
====================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      categoryId = "",
      status = "",
      search = "",
      page = 1,
      limit = 100,
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      query.categoryId = categoryId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.providerId = {
        $regex: search,
        $options: "i",
      };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 100, 1);
    const skip = (pageNum - 1) * limitNum;

    const [providers, total] = await Promise.all([
      GameProvider.find(query)
        .populate("categoryId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      GameProvider.countDocuments(query),
    ]);

    return res.json({
      success: true,
      message: "Providers fetched successfully",
      data: {
        providers: providers.map((item) => formatProvider(req, item)),
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET ACTIVE PROVIDERS
   GET /api/game-providers/active/list
====================================================== */

router.get("/active/list", async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};

    const query = {
      status: "active",
    };

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      query.categoryId = categoryId;
    }

    const providers = await GameProvider.find(query)
      .populate("categoryId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Active providers fetched successfully",
      data: providers.map((item) => formatProvider(req, item)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   OLD ACTIVE API SUPPORT
   GET /api/game-providers/active
====================================================== */

router.get("/active", async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};

    const query = {
      status: "active",
    };

    if (categoryId) query.categoryId = categoryId;

    const providers = await GameProvider.find(query)
      .populate("categoryId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: providers.map((item) => formatProvider(req, item)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET SINGLE PROVIDER
   GET /api/game-providers/:id
====================================================== */

router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider id",
      });
    }

    const provider = await GameProvider.findById(req.params.id).populate(
      "categoryId",
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.json({
      success: true,
      message: "Provider fetched successfully",
      data: formatProvider(req, provider),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   UPDATE PROVIDER
   PUT /api/game-providers/:id
====================================================== */

router.put("/:id", upload.single("providerIcon"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Invalid provider id",
      });
    }

    const { categoryId, providerId, status, removeOldIcon } = req.body || {};

    const provider = await GameProvider.findById(req.params.id);

    if (!provider) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const oldIcon = provider.providerIcon;

    if (categoryId !== undefined) {
      if (!isValidObjectId(categoryId)) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      const category = await Category.findById(categoryId);

      if (!category) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      provider.categoryId = categoryId;
    }

    if (providerId !== undefined) {
      const finalProviderId = cleanProviderId(providerId);

      if (!finalProviderId) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(400).json({
          success: false,
          message: "Provider ID is required",
        });
      }

      const exists = await GameProvider.findOne({
        _id: { $ne: provider._id },
        categoryId: provider.categoryId,
        providerId: finalProviderId,
      });

      if (exists) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(409).json({
          success: false,
          message: "This provider already exists in this category",
        });
      }

      provider.providerId = finalProviderId;
    }

    if (status !== undefined) {
      provider.status = status === "inactive" ? "inactive" : "active";
    }

    if (req.file) {
      provider.providerIcon = filePath(req.file);
    } else if (removeOldIcon === "true") {
      provider.providerIcon = "";
    }

    await provider.save();

    if (req.file && oldIcon && !String(oldIcon).startsWith("http")) {
      deleteFile(oldIcon);
    }

    if (
      removeOldIcon === "true" &&
      !req.file &&
      oldIcon &&
      !String(oldIcon).startsWith("http")
    ) {
      deleteFile(oldIcon);
    }

    const updatedProvider = await GameProvider.findById(provider._id).populate(
      "categoryId",
    );

    return res.json({
      success: true,
      message: "Provider updated successfully",
      data: formatProvider(req, updatedProvider),
    });
  } catch (error) {
    if (req.file) deleteFile(filePath(req.file));

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This provider already exists in this category",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   DELETE PROVIDER
   DELETE /api/game-providers/:id
====================================================== */

router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider id",
      });
    }

    const provider = await GameProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const oldIcon = provider.providerIcon;

    let deletedGames = { deletedCount: 0 };

    try {
      deletedGames = await Game.deleteMany({
        providerDbId: provider._id,
      });
    } catch (error) {
      console.log("Related games delete skipped:", error.message);
    }

    await GameProvider.findByIdAndDelete(provider._id);

    if (oldIcon && !String(oldIcon).startsWith("http")) {
      deleteFile(oldIcon);
    }

    return res.json({
      success: true,
      message: "Provider and related games deleted successfully",
      data: {
        providerId: provider._id,
        deletedGames: deletedGames?.deletedCount || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;
