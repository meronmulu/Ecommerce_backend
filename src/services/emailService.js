// server/services/emailService.js

const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

// Force IPv4 to avoid connection issues
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  console.log("DNS setting not available, using default");
}

class EmailService {
  constructor() {
    console.log("📧 Initializing Email Service...");
    console.log(`📧 Using email: ${process.env.EMAIL_USER}`);

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587, // Using 587 instead of 465 for better compatibility
      secure: false, // false for 587, true for 465
      requireTLS: true,
      family: 4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
        ciphers: "SSLv3",
      },
      debug: true, // Enable debug logs
      logger: true, // Log to console
    });
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send Registration OTP
  async sendOTPEmail(email, otp, userName = "User") {
    console.log(`📧 Attempting to send registration OTP to: ${email}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00838F; }
          .otp-code { background: #e8f5e9; border: 2px solid #00838F; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code h1 { font-size: 48px; letter-spacing: 5px; color: #00838F; margin: 0; }
          .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛡️ Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>Thank you for registering! Please verify your email address using the code below:</p>
          <div class="otp-code">
            <h1>${otp}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>⚠️ Never share this code with anyone.</strong>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Used Tech Market. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this._sendEmail(
      email,
      "🔐 Verify Your Email - Used Tech Market",
      htmlContent,
    );
  }

  // Send Password Reset OTP
  async sendPasswordResetEmail(email, otp, userName = "User") {
    console.log(`📧 Attempting to send password reset OTP to: ${email}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #d9534f; }
          .otp-code { background: #fee; border: 2px solid #d9534f; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code h1 { font-size: 48px; letter-spacing: 5px; color: #d9534f; margin: 0; }
          .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔑 Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Use the code below to proceed:</p>
          <div class="otp-code">
            <h1>${otp}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>⚠️ If you didn't request this, please ignore this email and ensure your account is secure.</strong>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Used Tech Market. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this._sendEmail(
      email,
      "🔑 Reset Your Password - Used Tech Market",
      htmlContent,
    );
  }

  // Core email sending function
  async _sendEmail(to, subject, htmlContent) {
    try {
      // Verify connection configuration
      console.log("📧 Verifying SMTP connection...");
      await this.transporter.verify();
      console.log("✅ SMTP connection verified successfully");

      const mailOptions = {
        from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: `Your verification code is: ${this.extractOTP(htmlContent)}`, // Plain text fallback
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully!");
      console.log("📧 Message ID:", info.messageId);
      console.log("📧 Response:", info.response);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Command:", error.command);
      console.error("Response:", error.response);

      // Provide user-friendly error messages
      if (error.code === "EAUTH") {
        throw new Error(
          "Email authentication failed. Check your Gmail app password.",
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Could not connect to email server. Check your internet connection.",
        );
      } else if (error.code === "ETIMEDOUT") {
        throw new Error("Email server timeout. Please try again.");
      } else {
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
  }

  // Helper to extract OTP from HTML for plain text fallback
  extractOTP(htmlContent) {
    const match = htmlContent.match(/<h1[^>]*>([0-9]+)<\/h1>/);
    return match ? match[1] : "N/A";
  }

  // Verify OTP
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
}

module.exports = new EmailService();
