const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const { sendOrderNotification, sendCustomerNotification } = require('../services/notificationService');

// Middleware to protect routes (a simple version placed here or in a separate file)
const jwt = require('jsonwebtoken');
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded; // add user payload to req
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Endpoint: POST /api/orders
// Description: Place a new order (Public route for customers)
router.post('/', async (req, res) => {
    try {
        const { vendorId, customerName, customerPhone, productName, quantity, totalAmount } = req.body;

        // Validate inputs
        if (!vendorId || !customerName || !customerPhone || !productName || !quantity || !totalAmount) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Find the vendor
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found.' });
        }

        // Create the order
        const order = new Order({
            vendorId,
            customerName,
            customerPhone,
            productName,
            quantity,
            totalAmount
        });

        await order.save();

        // Send WhatsApp/SMS Notification
        try {
            await sendOrderNotification(vendor, order);
            await sendCustomerNotification(order, 'Placed');
        } catch (notifError) {
            console.error('Notification failed but order was saved.', notifError);
            // We still return 201 as the order was successful
        }

        res.status(201).json({ message: 'Order placed successfully!', orderId: order._id });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Server error during order placement.' });
    }
});

// Endpoint: GET /api/orders/vendor
// Description: Get all orders for the logged-in vendor
router.get('/vendor', authMiddleware, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const orders = await Order.find({ vendorId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Server error while fetching orders.' });
    }
});

// Endpoint: PUT /api/orders/:id/status
// Description: Update the status of an order
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Ensure the order belongs to the logged-in vendor
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, vendorId: req.user.id },
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found or unauthorized' });
        }

        // Notify customer of status change
        try {
            await sendCustomerNotification(order, status);
        } catch (notifErr) {
            console.error('Customer notification failed, but order was updated', notifErr);
        }

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Server error while updating order status.' });
    }
});

// Endpoint: GET /api/orders/track/:phone
// Description: Track orders for a customer using their phone number (Public route)
router.get('/track/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        // Find recent orders for this phone number, populate vendor name so customer knows where it is from
        const orders = await Order.find({ customerPhone: phone })
            .populate('vendorId', 'storeName name phoneNumber')
            .sort({ createdAt: -1 })
            .limit(10); // limited to 10 most recent for safety
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error tracking orders:', error);
        res.status(500).json({ error: 'Server error while tracking orders.' });
    }
});

module.exports = router;
