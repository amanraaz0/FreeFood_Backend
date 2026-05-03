const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const authMiddleware = require("../middleware/authMiddleware");

const {
  addFood,
  getAllFoods,
  claimFood,
  cancelClaim,
  confirmPickup,
  getMyClaims,
  getMyProducts
} = require("../controllers/foodController");


// Food APIs
router.post("/add", authMiddleware, upload.single("image"), addFood);
router.get("/all", getAllFoods);
router.put("/claim/:id", authMiddleware, claimFood);

// Claim APIs
router.get("/my-claims", authMiddleware, getMyClaims);
router.put("/cancel-claim/:id", authMiddleware, cancelClaim);
router.put("/confirm-pickup/:id", authMiddleware, confirmPickup);
router.get("/my-products", authMiddleware, getMyProducts);


module.exports = router;
