// server/services/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    console.log("📧 Email Service Initialized");
    console.log(`📧 Using email: ${process.env.EMAIL_USER || "Not set"}`);

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
      debug: true, // Enable debug logs
    });
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send registration OTP email
   */
  async sendOTPEmail(email, otp, userName = "User") {
    const mailOptions = {
      from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Verify Your Email - Used Tech Market",
      html: this.getRegistrationTemplate(otp, userName),
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
    };

    return this._sendMail(mailOptions);
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetEmail(email, otp, userName = "User") {
    const mailOptions = {
      from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your Password - Used Tech Market",
      html: this.getResetTemplate(otp, userName),
      text: `Your password reset code is: ${otp}. This code will expire in 10 minutes.`,
    };

    return this._sendMail(mailOptions);
  }

  /**
   * Core email sending function
   */
  async _sendMail(mailOptions) {
    try {
      console.log(`📧 Attempting to send email to: ${mailOptions.to}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email sent successfully to: ${mailOptions.to}`);
      console.log(`📧 Message ID: ${info.messageId}`);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:");
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Command: ${error.command}`);

      // Don't throw - just log the error
      // This allows the app to continue even if email fails
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Verify OTP
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
   * Registration email template
   */
  getRegistrationTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00838F; }
          .otp-box { background: #e8f5e9; border: 2px solid #00838F; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 48px; letter-spacing: 5px; color: #00838F; margin: 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛡️ Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>Thank you for registering! Your verification code is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Used Tech Market</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  getResetTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #d9534f; }
          .otp-box { background: #fee; border: 2px solid #d9534f; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 48px; letter-spacing: 5px; color: #d9534f; margin: 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔑 Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Your code is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Used Tech Market</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
