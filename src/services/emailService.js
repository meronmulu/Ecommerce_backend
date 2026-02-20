// server/services/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    // PRODUCTION CONFIG: SSL (Port 465)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 465, // Force Secure SSL
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your 16-char App Password
      },
      // Fix for some cloud environments blocking self-signed certs
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Generate a secure 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP email to user with beautiful HTML template
   */
  async sendOTPEmail(email, otp, userName = "User") {
    const mailOptions = {
      from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your Verification Code - Used Tech Market",
      html: this.getEmailTemplate(otp, userName),
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
    };

    try {
      // 1. Verify connection first (Good for debugging)
      await this.transporter.verify();
      console.log("✅ SMTP Connection Established");

      // 2. Send Email
      const info = await this.transporter.sendMail(mailOptions);
      console.log("📧 Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email Sending Error:", error);
      // Throw error so the Controller knows to delete the user
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  /**
   * Verify if OTP matches and is not expired
   */
  verifyOTP(storedOTP, storedExpiry, userOTP) {
    if (!storedOTP || !storedExpiry) {
      return {
        valid: false,
        message: "No OTP found. Please request a new one.",
      };
    }

    if (new Date() > new Date(storedExpiry)) {
      return {
        valid: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    if (storedOTP !== userOTP) {
      return { valid: false, message: "Invalid OTP. Please try again." };
    }

    return { valid: true, message: "OTP verified successfully" };
  }

  /**
   * HTML Template
   */
  getEmailTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .header { background: #00838F; padding: 20px; text-align: center; color: white; }
          .content { padding: 30px; text-align: center; }
          .otp-box { background: #f0f8ff; border: 2px dashed #00838F; padding: 20px; font-size: 32px; font-weight: bold; color: #00838F; letter-spacing: 5px; margin: 20px 0; border-radius: 8px; }
          .footer { background: #333; color: #ccc; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Used Tech Market</h1>
          </div>
          <div class="content">
            <h2>Hello, ${userName}!</h2>
            <p>Thank you for registering. To verify your email address, please use the following code:</p>
            
            <div class="otp-box">${otp}</div>
            
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Used Tech Market. Secure Trading.
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
