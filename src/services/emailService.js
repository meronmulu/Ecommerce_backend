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
      tls: {
        rejectUnauthorized: false,
      },
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
      html: this.getEmailTemplate(otp, userName),
    };

    try {
      // Verify connection
      await this.transporter.verify();
      console.log("✅ SMTP Connection Established");

      const info = await this.transporter.sendMail(mailOptions);
      console.log("📧 Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email Fatal Error:", error.message);
      // RE-THROW the error so the controller handles it
      throw error;
    }
  }

  verifyOTP(storedOTP, storedExpiry, userOTP) {
    if (!storedOTP || !storedExpiry)
      return { valid: false, message: "No OTP found." };
    if (new Date() > new Date(storedExpiry))
      return { valid: false, message: "OTP has expired." };
    if (storedOTP !== userOTP) return { valid: false, message: "Invalid OTP." };
    return { valid: true, message: "OTP verified successfully" };
  }

  getEmailTemplate(otp, userName) {
    return `
      <div style="font-family: Arial; padding: 20px; background: #f4f4f4;">
        <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #00838F;">Used Tech Market</h2>
          <p>Hello ${userName}, your verification code is:</p>
          <h1 style="color: #00838F; letter-spacing: 5px; font-size: 40px;">${otp}</h1>
          <p>Valid for 10 minutes.</p>
        </div>
      </div>
    `;
  }
}

module.exports = new EmailService();
