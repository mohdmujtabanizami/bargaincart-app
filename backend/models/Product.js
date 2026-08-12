const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    
    // Product buy or rent type
    productType: { type: String, enum: ['buy', 'rent'], required: true }, 

    // For Buy
    originalPrice: { type: Number },
    minPrice: { type: Number }, 

    // For Rent
    pricePerDay: { type: Number } 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);