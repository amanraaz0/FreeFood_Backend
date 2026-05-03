const Food = require("../models/Food");
const Claim = require("../models/Claim");

/**
 * ADD FOOD
 */
exports.addFood = async (req, res) => {
  try {
    // authMiddleware check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      title,
      quantity,
      location,
      reason,
      isAnonymous,
      pickupFrom,
      pickupTo,
    } = req.body;

    // validation
    if (!title || !quantity || !location) {
      return res.status(400).json({
        message: "Title, quantity and location are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const food = await Food.create({
      title,
      quantity,
      location,
      reason: reason || "",
      isAnonymous: isAnonymous === "true" || isAnonymous === true,
      pickupFrom: pickupFrom || "",
      pickupTo: pickupTo || "",
      image: req.file.filename,
      createdBy: req.user.id,
      isClaimed: false,
    });

    return res.status(201).json({
      message: "Food added successfully",
      food,
    });
  } catch (error) {
    console.error("ADD FOOD ERROR:", error);
    return res.status(500).json({
      message: "Server error while adding food",
    });
  }
};

/**
 * GET ALL FOODS
 */
exports.getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find().populate("createdBy", "name").lean();

    const claims = await Claim.find({
      status: { $in: ["active", "picked"] },
    })
      .populate("claimedBy", "name")
      .lean();

    const foodsWithClaims = foods.map((food) => {
      const relatedClaim = claims.find(
        (claim) => claim.food.toString() === food._id.toString(),
      );

      return {
        ...food,

        // ✅ Claim exists → use it
        claimId: relatedClaim ? relatedClaim._id : null,
        claimStatus: relatedClaim ? relatedClaim.status : null,
        claimedBy: relatedClaim
          ? relatedClaim.claimedBy
          : food.claimedBy || null,
      };
    });

    res.json(foodsWithClaims);
  } catch (error) {
    console.error("GET FOODS ERROR:", error);
    res.status(500).json({ message: "Error fetching foods" });
  }
};

/**
 * CLAIM FOOD
 */

exports.claimFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    if (food.isClaimed) {
      return res.status(400).json({ message: "Food already claimed" });
    }

    // ✅ Create new claim
    await Claim.create({
      food: food._id,
      claimedBy: req.user.id,
    });

    // Update food status only
    food.isClaimed = true;
    await food.save();

    res.json({ message: "Food claimed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Claim failed" });
  }
};

/**
 * MY CLAIM HISTORY
 */
exports.getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({
      claimedBy: req.user.id,
      status: { $in: ["active", "picked"] },
    })
      .populate("food")
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: "Failed to load claims" });
  }
};
exports.cancelClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    // ❌ Pickup ke baad cancel impossible
    if (claim.status === "picked") {
      return res.status(400).json({
        message: "Pickup already confirmed. Cannot cancel claim.",
      });
    }

    // sirf receiver hi cancel kare
    if (claim.claimedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    claim.status = "cancelled";
    await claim.save();

    // food wapas available
    await Food.findByIdAndUpdate(claim.food, { isClaimed: false });

    res.json({ message: "Claim cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cancel failed" });
  }
};
/**
 * DONOR → MY PRODUCTS
 */
exports.getMyProducts = async (req, res) => {
  try {

    const foods = await Food.find({
      createdBy: req.user.id  
    })
      .populate("claimedBy", "name")
      .sort({ createdAt: -1 });

    res.json(foods);

  } catch (error) {
    console.error("MY PRODUCTS ERROR:", error);
    res.status(500).json({
      message: "Failed to load your products"
    });
  }
};


exports.getMyProducts = async (req, res) => {
  try {
    const foods = await Food.find({
      createdBy: req.user.id,
    }).lean();

    const claims = await Claim.find({
      status: { $in: ["active", "picked"] },
    })
      .populate("claimedBy", "name")
      .lean();

    const foodsWithClaims = foods.map((food) => {
      const relatedClaim = claims.find(
        (c) => c.food.toString() === food._id.toString()
      );

      return {
        ...food,
        claimId: relatedClaim ? relatedClaim._id : null,
        claimStatus: relatedClaim ? relatedClaim.status : null,
        claimedBy: relatedClaim ? relatedClaim.claimedBy : null,
      };
    });

    res.json(foodsWithClaims);
  } catch {
    res.status(500).json({ message: "Failed to load donor foods" });
  }
};

exports.confirmPickup = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate("food");

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    // ONLY DONOR
    if (claim.food.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    claim.status = "picked";
    claim.pickupConfirmedAt = new Date();
    await claim.save();

    res.json({ message: "Pickup confirmed" });
  } catch (error) {
    res.status(500).json({ message: "Confirmation failed" });
  }
};
