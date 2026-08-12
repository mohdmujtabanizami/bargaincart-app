const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET ALL PRODUCTS
router.get('/all-products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;