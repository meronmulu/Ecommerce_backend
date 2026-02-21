// server/services/emailService.js

const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {}

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. REGISTRATION OTP
  async sendOTPEmail(email, otp, userName = "User") {
    return this._sendEmail(
      email,
      "🔐 Your Verification Code",
      `<h1>${otp}</h1><p>Use this code to verify your account.</p>`,
    );
  }

  // 2. PASSWORD RESET OTP
  async sendPasswordResetEmail(email, otp) {
    return this._sendEmail(
      email,
      "🔑 Reset Your Password",
      `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Use the code below to reset your password:</p>
        <h1 style="color: #d9534f; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
      `,
    );
  }

  // Helper function to avoid code duplication
  async _sendEmail(to, subject, htmlContent) {
    try {
      await this.transporter.verify();
      const info = await this.transporter.sendMail({
        from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
      });
      console.log("📧 Email Sent:", info.messageId);
      return { success: true };
    } catch (error) {
      console.error("❌ Email Error:", error.message);
      throw error;
    }
  }

  verifyOTP(storedOTP, storedExpiry, userOTP) {
    if (!storedOTP || !storedExpiry)
      return { valid: false, message: "No OTP found." };
    if (new Date() > new Date(storedExpiry))
      return { valid: false, message: "OTP expired." };
    if (storedOTP !== userOTP) return { valid: false, message: "Invalid OTP." };
    return { valid: true, message: "Verified" };
  }
}

module.exports = new EmailService();
