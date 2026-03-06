const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

let client;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    try {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (err) {
        console.warn('⚠️ Error initializing Twilio client:', err.message);
    }
} else {
    console.warn('⚠️ Twilio credentials are missing or invalid in .env file. Order notifications will be disabled.');
}

/**
 * Sends a notification to the vendor (WhatsApp first, then SMS as fallback)
 * @param {Object} vendor - The vendor object (must have phoneNumber)
 * @param {Object} order - The order object
 */
async function sendOrderNotification(vendor, order) {
    if (!vendor || !vendor.phoneNumber) {
        console.error('Vendor or Vendor Phone Number is missing.');
        return;
    }

    if (!client) {
        console.warn('⚠️ Twilio client is not configured. Skipping SMS/WhatsApp notification.');
        return;
    }

    // Format the message
    const messageBody = `New Order Received!
Customer: ${order.customerName}
Phone: ${order.customerPhone}
Product: ${order.productName}
Quantity: ${order.quantity}
Total: \u20B9${order.totalAmount}
Please check your dashboard for more details.`;

    // Format valid E.164 phone numbers (assuming starting with '+' or adding it)
    let toPhoneNumber = vendor.phoneNumber;
    if (!toPhoneNumber.startsWith('+')) {
        // Basic assumption for generic fallback, real app should validate properly
        toPhoneNumber = '+' + toPhoneNumber;
    }

    try {
        // 1. Try sending via WhatsApp
        console.log(`Attempting to send WhatsApp message to ${toPhoneNumber}...`);
        const whatsappResponse = await client.messages.create({
            body: messageBody,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${toPhoneNumber}`
        });
        console.log(`WhatsApp message sent! SID: ${whatsappResponse.sid}`);
    } catch (whatsappError) {
        console.error(`Failed to send WhatsApp message: ${whatsappError.message}`);
        console.log('Falling back to SMS...');

        // 2. Fallback to SMS
        try {
            const smsResponse = await client.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: toPhoneNumber
            });
            console.log(`SMS message sent! SID: ${smsResponse.sid}`);
        } catch (smsError) {
            console.error(`Failed to send SMS fallback: ${smsError.message}`);
            // Throw error if both fail, so calling function is aware
            throw new Error('Both WhatsApp and SMS notifications failed.');
        }
    }
}

/**
 * Sends a notification back to the customer when status changes
 */
async function sendCustomerNotification(order, status) {
    if (!order || !order.customerPhone) return;
    if (!client) return;

    let messageBody = '';
    if (status === 'Placed') {
        messageBody = `Hi ${order.customerName},\nThank you for your order! We have received your order for ${order.productName} (Total: ₹${order.totalAmount}). The vendor will process it shortly.`;
    } else if (status === 'Completed') {
        messageBody = `Hi ${order.customerName},\nGreat news! Your order for ${order.productName} is now Completed and ready!`;
    } else if (status === 'Cancelled') {
        messageBody = `Hi ${order.customerName},\nUnfortunately, your order for ${order.productName} has been Cancelled by the vendor.`;
    } else {
        return;
    }

    // Sanitize phone number (remove spaces, dashes)
    let toPhone = order.customerPhone.replace(/[\s-]/g, '');
    if (!toPhone.startsWith('+')) toPhone = '+' + toPhone;

    try {
        // 1. Try sending via WhatsApp first
        console.log(`Attempting to send WhatsApp message to customer ${toPhone}...`);
        await client.messages.create({
            body: messageBody,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${toPhone}`
        });
        console.log(`Customer WhatsApp notification sent. Status: ${status}`);
    } catch (whatsappError) {
        console.warn(`Customer WhatsApp failed: ${whatsappError.message}. Falling back to SMS...`);
        // 2. Fallback to SMS
        try {
            await client.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: toPhone
            });
            console.log(`Customer SMS notification sent. Status: ${status}`);
        } catch (smsError) {
            console.error('Failed to notify customer via both WhatsApp and SMS:', smsError.message);
        }
    }
}

module.exports = {
    sendOrderNotification,
    sendCustomerNotification
};
