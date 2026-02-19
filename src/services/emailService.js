// server/services/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Beautiful HTML Email Template with Ethiopian theme
   */
  getEmailTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Email Verification - Used Tech Market</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Poppins', sans-serif;
            background-color: #f4f7fa;
            line-height: 1.6;
          }
          
          .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            animation: fadeIn 0.5s ease-in-out;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .header {
            background: linear-gradient(135deg, #00838F 0%, #006064 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
          }
          
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .logo {
            font-size: 48px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          
          .logo span {
            color: #FFD700;
          }
          
          .tagline {
            color: rgba(255,255,255,0.9);
            font-size: 16px;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a2639;
            margin-bottom: 10px;
          }
          
          .greeting span {
            color: #00838F;
            border-bottom: 3px solid #FFD700;
            padding-bottom: 5px;
          }
          
          .message {
            color: #5a6a7a;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          
          .otp-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 2px dashed #00838F;
            position: relative;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 131, 143, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 131, 143, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 131, 143, 0); }
          }
          
          .otp-label {
            color: #5a6a7a;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
          }
          
          .otp-code {
            font-size: 52px;
            font-weight: 700;
            color: #00838F;
            letter-spacing: 10px;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            background: white;
            padding: 20px;
            border-radius: 10px;
            display: inline-block;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          
          .expiry-info {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            border-radius: 10px;
            margin: 25px 0;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .expiry-icon {
            font-size: 24px;
          }
          
          .expiry-text {
            color: #856404;
            font-size: 14px;
            font-weight: 500;
          }
          
          .expiry-text strong {
            color: #00838F;
          }
          
          .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
            padding: 20px 0;
            border-top: 1px solid #e9ecef;
            border-bottom: 1px solid #e9ecef;
          }
          
          .feature {
            text-align: center;
          }
          
          .feature-icon {
            font-size: 28px;
            margin-bottom: 10px;
          }
          
          .feature-text {
            font-size: 12px;
            color: #5a6a7a;
            font-weight: 500;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #00838F 0%, #006064 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 5px 15px rgba(0, 131, 143, 0.3);
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 131, 143, 0.4);
          }
          
          .warning-box {
            background-color: #fee;
            border-left: 4px solid #dc3545;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
            display: flex;
            align-items: flex-start;
            gap: 15px;
          }
          
          .warning-icon {
            font-size: 24px;
            color: #dc3545;
          }
          
          .warning-title {
            color: #dc3545;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .warning-message {
            color: #5a6a7a;
            font-size: 14px;
          }
          
          .footer {
            background-color: #1a2639;
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          
          .social-links {
            margin-bottom: 20px;
          }
          
          .social-link {
            display: inline-block;
            width: 40px;
            height: 40px;
            background-color: rgba(255,255,255,0.1);
            border-radius: 50%;
            margin: 0 5px;
            line-height: 40px;
            text-decoration: none;
            color: #ffffff;
            transition: all 0.3s ease;
          }
          
          .social-link:hover {
            background-color: #00838F;
            transform: translateY(-3px);
          }
          
          .footer-text {
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer-text a {
            color: #FFD700;
            text-decoration: none;
          }
          
          .footer-text a:hover {
            text-decoration: underline;
          }
          
          .copyright {
            color: rgba(255,255,255,0.5);
            font-size: 12px;
            margin-top: 20px;
          }
          
          @media (max-width: 600px) {
            .container { margin: 15px; }
            .otp-code { font-size: 36px; letter-spacing: 5px; }
            .features { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛡️ Used<span>Tech</span>Market</div>
            <div class="tagline">Ethiopia's Safest Electronics Marketplace</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              ሰላም! <span>${userName}</span> 👋
            </div>
            
            <div class="message">
              Thank you for joining Used Tech Market! We're excited to help you buy and sell electronics safely with our escrow protection system.
            </div>
            
            <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div style="color: #5a6a7a; font-size: 14px; margin-top: 10px;">
                Enter this code in the app to verify your email
              </div>
            </div>
            
            <div class="expiry-info">
              <div class="expiry-icon">⏰</div>
              <div class="expiry-text">
                This code will expire in <strong>10 minutes</strong>. Please verify your email before then.
              </div>
            </div>
            
            <div class="features">
              <div class="feature">
                <div class="feature-icon">🛡️</div>
                <div class="feature-text">Escrow Protection</div>
              </div>
              <div class="feature">
                <div class="feature-icon">✅</div>
                <div class="feature-text">Verified Sellers</div>
              </div>
              <div class="feature">
                <div class="feature-icon">💬</div>
                <div class="feature-text">Secure Chat</div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="#" class="button">Verify Now</a>
            </div>
            
            <div class="warning-box">
              <div class="warning-icon">⚠️</div>
              <div>
                <div class="warning-title">Security Notice</div>
                <div class="warning-message">
                  Never share this code with anyone. Our team will never ask for your verification code.
                  If you didn't request this verification, please ignore this email.
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="social-links">
              <a href="#" class="social-link">📱</a>
              <a href="#" class="social-link">📘</a>
              <a href="#" class="social-link">📸</a>
              <a href="#" class="social-link">🐦</a>
            </div>
            
            <div class="footer-text">
              <a href="#">Help Center</a> • 
              <a href="#">Terms of Service</a> • 
              <a href="#">Privacy Policy</a>
            </div>
            
            <div class="footer-text">
              📍 Bole, Addis Ababa, Ethiopia
            </div>
            
            <div class="copyright">
              © ${new Date().getFullYear()} Used Tech Market. All rights reserved.
              <br>
              Made with ❤️ for Ethiopian buyers and sellers
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
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
}

module.exports = new EmailService();
