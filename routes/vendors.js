const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Endpoint: GET /api/vendors
// Description: Get all vendors (public route for customers to discover)
router.get('/', async (req, res) => {
    try {
        // Only return non-sensitive fields, including the menu
        const vendors = await Vendor.find({}, 'name storeName _id menu');
        res.status(200).json(vendors);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Server error while fetching vendors.' });
    }
});

// Endpoint: POST /api/vendors/menu
// Description: Add an item to the vendor's menu
router.post('/menu', authMiddleware, async (req, res) => {
    try {
        const { name, price, image } = req.body;
        if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

        const vendor = await Vendor.findByIdAndUpdate(
            req.user.id,
            { $push: { menu: { name, price, image } } },
            { new: true }
        );

        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.status(200).json({ message: 'Item added', menu: vendor.menu });
    } catch (error) {
        res.status(500).json({ error: 'Server error adding menu item' });
    }
});

// Endpoint: DELETE /api/vendors/menu/:itemId
// Description: Remove an item from the menu
router.delete('/menu/:itemId', authMiddleware, async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(
            req.user.id,
            { $pull: { menu: { _id: req.params.itemId } } },
            { new: true }
        );

        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.status(200).json({ message: 'Item removed', menu: vendor.menu });
    } catch (error) {
        res.status(500).json({ error: 'Server error removing menu item' });
    }
});

module.exports = router;
