// src/services/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 465, // SSL
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Keep family: 4 just to be safe, though Railway usually supports IPv6
      family: 4,
    });
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTPEmail(email, otp, userName = "User") {
    const mailOptions = {
      from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden;">
            <div style="background: #00838F; padding: 20px; text-align: center; color: white;">
              <h1>Used Tech Market</h1>
            </div>
            <div style="padding: 30px; text-align: center;">
              <h2>Verification Code</h2>
              <p>Hello ${userName}, use this code to complete your registration:</p>
              <h1 style="background: #e0f7fa; color: #00838F; display: inline-block; padding: 10px 20px; letter-spacing: 5px; border-radius: 5px;">${otp}</h1>
              <p>This code expires in 10 minutes.</p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.verify();
      console.log("✅ SMTP Connected");
      const info = await this.transporter.sendMail(mailOptions);
      console.log("📧 Email Sent:", info.messageId);
      return { success: true };
    } catch (error) {
      console.error("❌ Email Error:", error);
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
