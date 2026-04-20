const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public')); // Serve static frontend files

// Database Connection
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB Atlas connected successfully.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Public Config Route
app.get('/api/config', (req, res) => {
    res.json({
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+14155238886' // Fallback to default Twilio sandbox number
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/vendors', require('./routes/vendors'));

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
