// server/services/emailService.js

const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

// Force IPv4
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  console.log("DNS setting not available");
}

class EmailService {
  constructor() {
    this.validateConfig();
    this.createTransporter();
  }

  validateConfig() {
    const required = ["EMAIL_USER", "EMAIL_PASS"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.error("❌ Missing required email config:", missing);
      return false;
    }

    console.log("✅ Email config validated");
    console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
    console.log("📧 EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
    return true;
  }

  createTransporter() {
    // Try multiple configurations
    this.transporters = [
      // Config 1: Gmail SMTP with 587 (TLS)
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: "SSLv3",
        },
      }),

      // Config 2: Gmail SMTP with 465 (SSL)
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      }),

      // Config 3: Direct connection
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }),
    ];

    this.currentTransporter = 0;
  }

  async testConnection() {
    for (let i = 0; i < this.transporters.length; i++) {
      try {
        console.log(`🔌 Testing transporter ${i + 1}...`);
        await this.transporters[i].verify();
        console.log(`✅ Transporter ${i + 1} works!`);
        this.currentTransporter = i;
        return true;
      } catch (error) {
        console.log(`❌ Transporter ${i + 1} failed:`, error.message);
      }
    }
    return false;
  }

  async sendEmail(to, subject, htmlContent, textContent) {
    // Test connection if first attempt
    if (this.currentTransporter === 0) {
      await this.testConnection();
    }

    const mailOptions = {
      from: `"Used Tech Market" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    // Try all transporters until one works
    for (let i = this.currentTransporter; i < this.transporters.length; i++) {
      try {
        console.log(`📧 Attempting to send via transporter ${i + 1}...`);
        const info = await this.transporters[i].sendMail(mailOptions);
        console.log(`✅ Email sent via transporter ${i + 1}!`);
        console.log("📧 Message ID:", info.messageId);
        this.currentTransporter = i;
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.log(`❌ Transporter ${i + 1} send failed:`, error.message);

        // If this is the last transporter, throw error
        if (i === this.transporters.length - 1) {
          throw new Error(
            `All email transporters failed. Last error: ${error.message}`,
          );
        }
      }
    }
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTPEmail(email, otp, userName = "User") {
    const subject = "🔐 Verify Your Email - Used Tech Market";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00838F; }
          .otp-code { background: #e8f5e9; border: 2px solid #00838F; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code h1 { font-size: 48px; letter-spacing: 5px; color: #00838F; margin: 0; }
          .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛡️ Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>Your verification code is:</p>
          <div class="otp-code">
            <h1>${otp}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>⚠️ Never share this code with anyone.</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Your verification code is: ${otp}. It expires in 10 minutes.`;

    return this.sendEmail(email, subject, htmlContent, textContent);
  }

  async sendPasswordResetEmail(email, otp, userName = "User") {
    const subject = "🔑 Reset Your Password - Used Tech Market";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #d9534f; }
          .otp-code { background: #fee; border: 2px solid #d9534f; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .otp-code h1 { font-size: 48px; letter-spacing: 5px; color: #d9534f; margin: 0; }
          .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔑 Used Tech Market</div>
          </div>
          <p>Hello ${userName},</p>
          <p>Use the code below to reset your password:</p>
          <div class="otp-code">
            <h1>${otp}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>⚠️ If you didn't request this, ignore this email.</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Your password reset code is: ${otp}. It expires in 10 minutes.`;

    return this.sendEmail(email, subject, htmlContent, textContent);
  }

  verifyOTP(storedOTP, storedExpiry, userOTP) {
    if (!storedOTP || !storedExpiry) {
      return { valid: false, message: "No OTP found" };
    }
    if (new Date() > new Date(storedExpiry)) {
      return { valid: false, message: "OTP expired" };
    }
    if (storedOTP !== userOTP) {
      return { valid: false, message: "Invalid OTP" };
    }
    return { valid: true, message: "Verified" };
  }
}

module.exports = new EmailService();
