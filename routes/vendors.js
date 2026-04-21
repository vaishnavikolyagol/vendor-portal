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

// Endpoint: POST /api/vendors/:id/reviews
// Description: Add a review for a specific vendor
router.post('/:id/reviews', async (req, res) => {
    try {
        const { customerName, rating, comment } = req.body;
        if (!customerName || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Name and a valid rating (1-5) are required.' });
        }

        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { $push: { reviews: { customerName, rating, comment } } },
            { new: true }
        );

        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.status(200).json({ message: 'Review added successfully!', reviews: vendor.reviews });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Server error while adding review.' });
    }
});

// Endpoint: GET /api/vendors
// Description: Get all vendors (public route for customers to discover)
router.get('/', async (req, res) => {
    try {
        // Only return non-sensitive fields, including the menu and reviews
        const vendors = await Vendor.find({}, 'name storeName _id menu reviews');
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

// Endpoint: PUT /api/vendors/profile
// Description: Update vendor profile details
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, storeName, phoneNumber, email } = req.body;
        
        // Find by ID and update
        const updatedVendor = await Vendor.findByIdAndUpdate(
            req.user.id,
            { name, storeName, phoneNumber, email },
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password from the returned document

        if (!updatedVendor) {
            return res.status(404).json({ error: 'Vendor not found.' });
        }

        res.status(200).json({ message: 'Profile updated successfully', vendor: updatedVendor });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error while updating profile.' });
    }
});

// Endpoint: GET /api/vendors/profile
// Description: Get vendor profile details
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.user.id).select('-password');
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.status(200).json(vendor);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Server error while fetching profile' });
    }
});

module.exports = router;
