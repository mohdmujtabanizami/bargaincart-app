const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected for seeding...");

        
        await Product.deleteMany();

        
        const sampleProducts = [
            {
                name: "Wireless Gaming Headset",
                description: "High quality surround sound with mic for gaming.",
                category: "Electronics",
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
                productType: "buy",
                originalPrice: 2500,
                minPrice: 1800
            },
            {
                name: "DSLR Camera (For Rent)",
                description: "Professional camera with 18-55mm lens for photography.",
                category: "Cameras",
                image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500",
                productType: "rent",
                pricePerDay: 500
            }
        ];

        await Product.insertMany(sampleProducts);
        console.log("Sample Products Added Successfully!");
        process.exit();
    })
    .catch(err => console.log(err));