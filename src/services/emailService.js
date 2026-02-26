// server/services/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    console.log("📧 Email Service Initialized");
    console.log(`📧 Using email: ${process.env.EMAIL_USER}`);
    
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
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

  // ✅ ADD THIS METHOD - For registration OTP
  async sendOTPEmail(email, otp, userName = "User") {
    console.log(`📧 Sending registration OTP to: ${email}`);
    
    const html = `
      <div style="font-family: Arial; padding: 20px; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #00838F; text-align: center;">Verify Your Email</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for registering! Use the 6-digit code below to verify your email:</p>
          <div style="background: #e8f5e9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="font-size: 48px; letter-spacing: 5px; color: #00838F; margin: 0;">${otp}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "🔐 Verify Your Email",
        html,
      });
      console.log(`✅ Registration email sent! ID: ${info.messageId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Email failed: ${error.message}`);
      throw error; // Re-throw so controller knows it failed
    }
  }

  // For password reset
  async sendPasswordResetEmail(email, otp, userName = "User") {
    console.log(`📧 Sending password reset email to: ${email}`);
    
    const html = `
      <div style="font-family: Arial; padding: 20px; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #d9534f; text-align: center;">Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Use the 6-digit code below:</p>
          <div style="background: #fee; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="font-size: 48px; letter-spacing: 5px; color: #d9534f; margin: 0;">${otp}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "🔑 Password Reset Request",
        html,
      });
      console.log(`✅ Password reset email sent! ID: ${info.messageId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Email failed: ${error.message}`);
      throw error;
    }
  }

  verifyOTP(storedOTP, storedExpiry, userOTP) {
    if (!storedOTP || !storedExpiry) 
      return { valid: false, message: "No OTP found. Request new one." };
    if (new Date() > new Date(storedExpiry)) 
      return { valid: false, message: "OTP expired. Request new one." };
    if (storedOTP !== userOTP) 
      return { valid: false, message: "Invalid OTP." };
    return { valid: true, message: "Verified" };
  }
}

module.exports = new EmailService();