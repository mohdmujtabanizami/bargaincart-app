const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');


const app = express();


app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/products-api', productRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch((err) => console.log("Database connection error:", err));

// 1. For see all products API
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. BARGAINING API (For Buy items)
app.post('/api/bargain', async (req, res) => {
    try {
        const { productId, userOffer } = req.body;
        const product = await Product.findById(productId);

        if (!product || product.productType !== 'buy') {
            return res.status(404).json({ message: "Buy product not found" });
        }

        if (userOffer >= product.minPrice && userOffer <= product.originalPrice) {
            return res.json({
                success: true,
                dealAccepted: true,
                finalPrice: userOffer,
                message: `Congratulations! The deal is finalized at ₹${userOffer}.` 
            });
        } 
        else if (userOffer < product.minPrice) {
            const counterOffer = Math.floor((product.minPrice + product.originalPrice) / 2);
            return res.json({
                success: true,
                dealAccepted: false,
                counterOffer: counterOffer,
                message: `This price is too low! We cannot go below this. Our best price is ₹${counterOffer}.` 
            });
        } 
        else {
            return res.json({
                success: true,
                dealAccepted: true,
                finalPrice: product.originalPrice,
                message: "Deal accepted at original price!"
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. RENTAL PRICE CALCULATOR API (For Rent items)
app.post('/api/calculate-rent', async (req, res) => {
    try {
        const { productId, startDate, endDate } = req.body;
        const product = await Product.findById(productId);

        if (!product || product.productType !== 'rent') {
            return res.status(404).json({ message: "Rental product not found" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end - start;
        const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (days <= 0) {
            return res.status(400).json({ message: "End date must be after start date!" });
        }

        const totalRent = days * product.pricePerDay;

        res.json({
            success: true,
            days: days,
            pricePerDay: product.pricePerDay,
            totalRent: totalRent,
            message: `Total rent for ${days} days is ₹${totalRent}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});