const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

// Admin Auth Middleware
const authAdminMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized as admin' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Endpoint: POST /api/admin/login
// Description: Authenticate admin
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Default admin credentials (can be overridden by .env)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === adminEmail && password === adminPassword) {
        const token = jwt.sign(
            { role: 'admin', email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Admin login successful',
            token,
            admin: { email }
        });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials.' });
    }
});

// Endpoint: GET /api/admin/orders
// Description: Get all orders across the entire platform
router.get('/orders', authAdminMiddleware, async (req, res) => {
    try {
        const orders = await Order.find().populate('vendorId', 'name storeName email phoneNumber').sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ error: 'Server error while fetching orders.' });
    }
});

// Endpoint: GET /api/admin/vendors
// Description: Get all vendors
router.get('/vendors', authAdminMiddleware, async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 }).select('-password');
        res.status(200).json(vendors);
    } catch (error) {
        console.error('Error fetching all vendors:', error);
        res.status(500).json({ error: 'Server error while fetching vendors.' });
    }
});

// Endpoint: POST /api/admin/vendors
// Description: Admin create a new vendor
router.post('/vendors', authAdminMiddleware, async (req, res) => {
    try {
        const { name, email, password, phoneNumber, storeName } = req.body;

        if (!name || !email || !password || !phoneNumber || !storeName) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ error: 'Vendor already exists with this email.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const vendor = new Vendor({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            storeName
        });

        await vendor.save();
        res.status(201).json({ message: 'Vendor added successfully!' });
    } catch (error) {
        console.error('Add vendor error:', error);
        res.status(500).json({ error: 'Server error while adding vendor.' });
    }
});

// Endpoint: DELETE /api/admin/vendors/:id
// Description: Delete a vendor and their associated orders
router.delete('/vendors/:id', authAdminMiddleware, async (req, res) => {
    try {
        await Vendor.findByIdAndDelete(req.params.id);
        await Order.deleteMany({ vendorId: req.params.id });
        res.status(200).json({ message: 'Vendor and associated orders deleted.' });
    } catch (error) {
        console.error('Delete vendor error:', error);
        res.status(500).json({ error: 'Server error while deleting vendor.' });
    }
});

module.exports = router;
