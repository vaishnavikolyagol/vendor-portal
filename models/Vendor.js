const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  storeName: {
    type: String,
    required: true
  },
  menu: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
