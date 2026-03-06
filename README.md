# Local Vendor Digitalization Platform

A full-stack web application built to connect local customers with their favorite vendors, featuring automated WhatsApp and SMS order notifications via Twilio. 

## Features
- **Customer Ordering Interface:** Beautiful, responsive UI for placing orders.
- **Vendor Dashboard:** Secure login for vendors to track and manage their orders.
- **Automated Notifications:** Customers checkout and vendors instantly receive order details on WhatsApp (with SMS fallback).
- **Secure Authentication:** JWT & bcrypt for vendor accounts.

## Technology Stack
- **Frontend:** HTML5, CSS3 (Rich Aesthetics, Glassmorphism, Modern Dark Mode), Vanilla JavaScript.
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose ORM)
- **Messaging:** Twilio API (WhatsApp + SMS)

---

## 🚀 Setup & Installation Guide

### 1. MongoDB Atlas Setup
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Build a Cluster (the free tier works well) and wait for it to provision.
3. Under **Database Access**, add a new database user and securely save the username & password.
4. Under **Network Access**, add `0.0.0.0/0` to allow connections from anywhere (or whitelist your specific IP and hosting provider IP).
5. Click **Connect**, choose "Connect your application", and copy the connection string.
6. Replace `<username>`, `<password>`, `<cluster>`, etc. in the `.env` file with your details.

### 2. Twilio Setup Overview
1. Create a free account at [Twilio](https://www.twilio.com/).
2. From the Twilio Console Dashboard, retrieve your **Account SID** and **Auth Token**.
3. **For SMS:** 
   - Get a free Trial Twilio Phone Number.
   - You must verify your *personal phone number* under 'Verified Caller IDs' to test SMS on trial accounts.
4. **For WhatsApp:** 
   - Navigate to **Messaging > Try it out > Send a WhatsApp message**.
   - Activate the "Twilio Sandbox for WhatsApp".
   - It will give you a Twilio WhatsApp Number (usually `whatsapp:+14155238886`).
   - To receive messages in the trial/sandbox, your personal number needs to "join" the sandbox by sending a specific code (e.g., `join something-word`) to that Twilio WhatsApp number.
5. Setup your `.env` variables with these credentials:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number_or_whatsapp_sender
   ```

### 3. Local Development
1. Clone or download this project.
2. Open terminal in the project root folder.
3. Run `npm install` to install dependencies.
4. Fill in all details in your `.env` file. (Rename `env.example` -> `.env` if needed).
5. Run `npm run dev` (if nodemon is installed) or `node server.js`.
6. Go to `http://localhost:5000` in your browser.

---

## 🌐 Deployment Guide (Render)

We recommend [Render](https://render.com) for deploying Full-Stack Node.js apps for free.

1. **Push to GitHub**: Initialize a Git repository in this folder, commit all your files (except `node_modules` and `.env`), and push to a new GitHub repository. Create a `.gitignore` and add `node_modules` and `.env` before committing.
2. **Log into Render**: Create a free Render account and link your GitHub.
3. **Create Web Service**: Click **New > Web Service** and select your GitHub repository.
4. **Configure Deployment**:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. **Environment Variables**: VERY IMPORTANT! Scroll down to the Advanced section and manually add all your variables from your `.env` file:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
6. Click **Create Web Service**. Render will build and launch your application.

## 🤝 Need Help?
Check out the Twilio Logs in your Twilio Dashboard to debug any message failures. Ensure your database network access allows Render IPs (`0.0.0.0/0`).
