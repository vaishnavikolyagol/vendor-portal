const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

// Endpoint: POST /api/auth/register
// Description: Register a new vendor with phone number
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phoneNumber, storeName } = req.body;

        // Validate inputs
        if (!name || !email || !password || !phoneNumber || !storeName) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ error: 'Vendor already exists with this email.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create vendor
        const vendor = new Vendor({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            storeName
        });

        await vendor.save();

        res.status(201).json({ message: 'Vendor registered successfully!' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Endpoint: POST /api/auth/login
// Description: Authenticate a vendor and get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password.' });
        }

        // Find vendor
        const vendor = await Vendor.findOne({ email });
        if (!vendor) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, vendor.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: vendor._id, email: vendor.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            vendor: {
                id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                storeName: vendor.storeName
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;
