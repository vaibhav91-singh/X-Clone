import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { UAParser } from "ua-parser-js";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Otp from "./models/otp.js";
import Subscription from "./models/subscription.js";
import LoginHistory from "./models/loginHistory.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "110mb" }));
app.use(express.urlencoded({ limit: "110mb", extended: true }));
app.use("/uploads", express.static("uploads"));

// ─── Razorpay Instance ────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Subscription Plans ───────────────────────────────────────────────────────
const PLANS = {
  free: { name: "Free", price: 0, tweetLimit: 1, label: "₹0/month" },
  bronze: { name: "Bronze", price: 10000, tweetLimit: 3, label: "₹100/month" }, // paise
  silver: { name: "Silver", price: 30000, tweetLimit: 5, label: "₹300/month" },
  gold: { name: "Gold", price: 100000, tweetLimit: -1, label: "₹1000/month" }, // -1 = unlimited
};

// ─── IST Time Helpers ─────────────────────────────────────────────────────────
function getISTHour() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.getUTCHours();
}

function isPaymentWindowOpen() {
  const hour = getISTHour();
  return hour >= 10 && hour < 11; // 10:00 AM – 11:00 AM IST
}

// ─── Email Invoice Sender ─────────────────────────────────────────────────────
async function sendInvoiceEmail(email, { invoiceNumber, plan, amount, paymentId, startDate, endDate }) {
  const planInfo = PLANS[plan];
  const formattedAmount = (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><title>Invoice - X Clone</title></head>
  <body style="font-family: Arial, sans-serif; background: #0f0f0f; color: #fff; padding: 30px; max-width: 600px; margin: 0 auto;">
    <div style="background: #1a1a1a; border-radius: 12px; padding: 30px; border: 1px solid #333;">
      
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1d9bf0; font-size: 32px; margin: 0;">𝕏</h1>
        <p style="color: #888; margin-top: 4px; font-size: 14px;">X Clone – Payment Invoice</p>
      </div>

      <hr style="border-color: #333; margin: 20px 0;" />

      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #888; padding: 6px 0;">Invoice Number</td>
          <td style="text-align: right; font-weight: bold;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Plan</td>
          <td style="text-align: right;">
            <span style="background: #1d9bf0; color: #fff; border-radius: 12px; padding: 2px 10px; font-weight: bold;">
              ${planInfo.name}
            </span>
          </td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Tweet Limit</td>
          <td style="text-align: right;">${planInfo.tweetLimit === -1 ? "Unlimited" : planInfo.tweetLimit + " tweets/month"}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Amount Paid</td>
          <td style="text-align: right; color: #4ade80; font-weight: bold; font-size: 16px;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Payment ID</td>
          <td style="text-align: right; font-family: monospace; font-size: 12px; color: #aaa;">${paymentId}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Valid From</td>
          <td style="text-align: right;">${new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 6px 0;">Valid Until</td>
          <td style="text-align: right;">${new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td>
        </tr>
      </table>

      <hr style="border-color: #333; margin: 20px 0;" />

      <p style="color: #4ade80; font-size: 13px; text-align: center;">
        ✅ Your subscription is now active. Enjoy posting on X Clone!
      </p>
      <p style="color: #555; font-size: 11px; text-align: center; margin-top: 10px;">
        This is an automated invoice from X Clone. Please save this email for your records.
      </p>
    </div>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "X Clone <noreply@xclone.com>",
      to: email,
      subject: `✅ Invoice #${invoiceNumber} – ${planInfo.name} Plan Activated`,
      html: htmlContent,
    });
    console.log(`[EMAIL] Invoice sent to ${email}`);
  } catch (err) {
    console.error("[EMAIL] Failed to send invoice:", err.message);
  }
}

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Twitter Clone backend is running ✅");
});

// ─── Database Connection ──────────────────────────────────────────────────────
const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL || "mongodb://localhost:27017/twitter_clone";

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR LOGIN SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

// Extract client IP address from request
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// Parse user agent string to extract device information
function parseUserAgent(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "",
    os: result.os.name || "Unknown",
    osVersion: result.os.version || "",
    device: result.device.type || "desktop",
  };
}

// Categorize device type based on device info and OS
function categorizeDevice(deviceType, os) {
  // Mobile OS detection
  const mobileOS = ["Android", "iOS", "Windows Phone", "BlackBerry"];
  if (mobileOS.includes(os)) {
    return "mobile";
  }

  // Device type from user agent
  if (deviceType === "mobile" || deviceType === "smartphone") {
    return "mobile";
  }

  if (deviceType === "tablet") {
    return "tablet";
  }

  // Default to desktop for Windows, macOS, Linux
  return "desktop";
}

// Check if mobile login is allowed (10 AM - 1 PM IST)
function isMobileLoginAllowed() {
  const hour = getISTHour();
  return hour >= 10 && hour < 13; // 10:00 AM – 1:00 PM IST (13:00 is 1 PM)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED LOGIN SECURITY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// POST /auth/initiate-login — Step 1: Validate credentials and check requirements
app.post("/auth/initiate-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIP(req);

    if (!email || !password) {
      return res.status(400).send({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    // Validate password (in production, use bcrypt)
    if (user.password !== password) {
      // Log failed attempt
      const deviceInfo = parseUserAgent(userAgent);
      const device = categorizeDevice(deviceInfo.device, deviceInfo.os);

      await new LoginHistory({
        userId: user._id,
        email: user.email,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        device,
        ipAddress,
        userAgent,
        loginStatus: "failed",
        failureReason: "Invalid credentials",
      }).save();

      return res.status(401).send({ error: "Invalid credentials" });
    }

    // Parse device information
    const deviceInfo = parseUserAgent(userAgent);
    const device = categorizeDevice(deviceInfo.device, deviceInfo.os);

    // Check mobile time restriction
    if (device === "mobile") {
      if (!isMobileLoginAllowed()) {
        const currentHour = getISTHour();

        // Log blocked attempt
        await new LoginHistory({
          userId: user._id,
          email: user.email,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          os: deviceInfo.os,
          osVersion: deviceInfo.osVersion,
          device,
          ipAddress,
          userAgent,
          loginStatus: "blocked",
          failureReason: `Mobile login outside allowed hours (10 AM - 1 PM IST). Current hour: ${currentHour}`,
        }).save();

        return res.status(403).send({
          error: "Mobile device login is only allowed between 10:00 AM and 1:00 PM IST",
          currentHourIST: currentHour,
          allowedHours: "10:00 AM - 1:00 PM",
        });
      }
    }

    // Check if Chrome browser requires OTP
    const requiresOTP = deviceInfo.browser.toLowerCase().includes("chrome");

    // Check if Microsoft browser (Edge, IE) - no OTP required
    const isMicrosoftBrowser =
      deviceInfo.browser.toLowerCase().includes("edge") ||
      deviceInfo.browser.toLowerCase().includes("ie") ||
      deviceInfo.browser.toLowerCase().includes("internet explorer");

    if (requiresOTP && !isMicrosoftBrowser) {
      // Generate OTP for Chrome
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Delete existing login OTPs
      await Otp.deleteMany({ email, purpose: "login" });

      // Save OTP
      await new Otp({
        email,
        otp: otpCode,
        purpose: "login",
      }).save();

      // Send OTP email
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "X Clone <noreply@xclone.com>",
          to: email,
          subject: "🔐 Login Verification - OTP Required",
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background: #0f0f0f; color: #fff; padding: 30px;">
              <div style="background: #1a1a1a; border-radius: 12px; padding: 30px; border: 1px solid #333; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #1d9bf0; text-align: center;">🔐 Login Verification</h2>
                <p>A login attempt was detected from <strong>Google Chrome</strong>.</p>
                <p><strong>Device:</strong> ${device}<br>
                <strong>OS:</strong> ${deviceInfo.os}<br>
                <strong>IP Address:</strong> ${ipAddress}<br>
                <strong>Time:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                <p>Your OTP code is:</p>
                <div style="background: #333; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1d9bf0;">
                  ${otpCode}
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">This OTP is valid for 5 minutes. If you didn't attempt to log in, please secure your account immediately.</p>
              </div>
            </body>
            </html>
          `,
        });
        console.log(`[LOGIN-OTP] Email OTP sent to ${email}: ${otpCode}`);
      } catch (emailError) {
        console.error("[LOGIN-OTP] Email sending failed:", emailError.message);
        return res.status(500).send({ error: "Failed to send OTP email" });
      }

      // Create pending login history record
      const loginRecord = await new LoginHistory({
        userId: user._id,
        email: user.email,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        device,
        ipAddress,
        userAgent,
        loginStatus: "success",
        requiresOTP: true,
        otpVerified: false,
      }).save();

      return res.status(200).send({
        requiresOTP: true,
        message: "OTP sent to your email",
        loginRecordId: loginRecord._id,
        deviceInfo: {
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device,
        },
      });
    }

    // Microsoft browser or non-Chrome - direct login
    const loginRecord = await new LoginHistory({
      userId: user._id,
      email: user.email,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      device,
      ipAddress,
      userAgent,
      loginStatus: "success",
      requiresOTP: false,
      otpVerified: false,
    }).save();

    console.log(`[LOGIN] User ${email} logged in successfully from ${deviceInfo.browser} (No OTP required)`);

    return res.status(200).send({
      requiresOTP: false,
      message: "Login successful",
      user,
      loginRecordId: loginRecord._id,
      deviceInfo: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device,
      },
    });
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// POST /auth/verify-login-otp — Step 2: Verify OTP and complete login
app.post("/auth/verify-login-otp", async (req, res) => {
  try {
    const { email, otp, loginRecordId } = req.body;

    if (!email || !otp) {
      return res.status(400).send({ error: "Email and OTP are required" });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp, purpose: "login" });
    if (!otpRecord) {
      return res.status(400).send({ error: "Invalid or expired OTP" });
    }

    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Update login history record
    if (loginRecordId) {
      await LoginHistory.findByIdAndUpdate(loginRecordId, {
        otpVerified: true,
      });
    }

    // Delete OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    console.log(`[LOGIN] User ${email} OTP verified successfully`);

    return res.status(200).send({
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.error("[LOGIN-OTP] Verification error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// GET /auth/login-history/:email — Get login history for user
app.get("/auth/login-history/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 20 } = req.query;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const history = await LoginHistory.find({ userId: user._id })
      .sort({ loginTime: -1 })
      .limit(parseInt(limit));

    return res.status(200).send({
      total: history.length,
      history,
    });
  } catch (error) {
    console.error("[LOGIN-HISTORY] Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// DELETE /auth/login-history/:historyId — Delete specific login history record
app.delete("/auth/login-history/:historyId", async (req, res) => {
  try {
    const { historyId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const record = await LoginHistory.findOne({ _id: historyId, userId: user._id });
    if (!record) {
      return res.status(404).send({ error: "Login history record not found" });
    }

    await LoginHistory.findByIdAndDelete(historyId);

    return res.status(200).send({ message: "Login history record deleted" });
  } catch (error) {
    console.error("[LOGIN-HISTORY] Delete error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Register or Login (Unified)
app.post("/register", async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(200).send(user);
    user = new User(req.body);
    await user.save();

    // Auto-create free subscription for new user
    const existing = await Subscription.findOne({ userId: user._id, status: "active" });
    if (!existing) {
      const sub = new Subscription({
        userId: user._id,
        email: user.email,
        plan: "free",
        tweetLimit: 1,
        tweetsPostedThisMonth: 0,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await sub.save();
    }

    return res.status(201).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Get logged-in user
app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).send({ error: "Email required" });
    const user = await User.findOne({ email });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Update Profile
app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OTP ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email required" });
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email });
    const otp = new Otp({ email, otp: otpCode });
    await otp.save();
    console.log(`[OTP] Sent to ${email}: ${otpCode}`);
    return res.status(200).send({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });
    if (!record) return res.status(400).send({ error: "Invalid or expired OTP" });
    await User.findOneAndUpdate({ email }, { audioVerified: true });
    await Otp.deleteOne({ _id: record._id });
    return res.status(200).send({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/upload-audio", async (req, res) => {
  try {
    const { email, audioData, duration, fileName } = req.body;
    if (!email || !audioData) return res.status(400).send({ error: "Missing required fields" });

    const hour = getISTHour();
    if (hour < 14 || hour >= 19) {
      return res.status(403).send({ error: "Audio uploads can only be made between 2:00 PM and 7:00 PM IST." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.audioVerified) return res.status(403).send({ error: "OTP verification required." });

    const base64Content = audioData.includes(";base64,") ? audioData.split(";base64,").pop() : audioData;
    const sizeInBytes = (base64Content.length * 3) / 4;
    if (sizeInBytes > 100 * 1024 * 1024) return res.status(400).send({ error: "Audio size exceeds 100 MB." });
    if (duration && duration > 300) return res.status(400).send({ error: "Audio duration exceeds 5 minutes." });

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = fileName ? path.extname(fileName) : ".mp3";
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(filePath, Buffer.from(base64Content, "base64"));

    user.audioVerified = false;
    await user.save();

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${uniqueFileName}`;
    return res.status(200).send({ message: "Audio uploaded successfully", url: fileUrl });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SWITCHING WITH OTP
// ═══════════════════════════════════════════════════════════════════════════════

// POST /language/request-change — Request language change and send OTP
app.post("/language/request-change", async (req, res) => {
  try {
    const { email, targetLanguage } = req.body;
    if (!email || !targetLanguage) {
      return res.status(400).send({ error: "Email and target language are required" });
    }

    const validLanguages = ["en", "es", "hi", "pt", "zh", "fr"];
    if (!validLanguages.includes(targetLanguage)) {
      return res.status(400).send({ error: "Invalid language code" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing language change OTPs for this user
    await Otp.deleteMany({ email, purpose: "languageChange" });

    // Determine OTP delivery method based on target language
    if (targetLanguage === "fr") {
      // French: Send OTP via email
      const otp = new Otp({
        email,
        otp: otpCode,
        purpose: "languageChange",
        targetLanguage,
      });
      await otp.save();

      // Send email with OTP
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "X Clone <noreply@xclone.com>",
          to: email,
          subject: "🔐 Language Change Verification - OTP",
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background: #0f0f0f; color: #fff; padding: 30px;">
              <div style="background: #1a1a1a; border-radius: 12px; padding: 30px; border: 1px solid #333; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #1d9bf0; text-align: center;">🌐 Language Change Request</h2>
                <p>You have requested to change your language to <strong>French</strong>.</p>
                <p>Your OTP code is:</p>
                <div style="background: #333; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1d9bf0;">
                  ${otpCode}
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">This OTP is valid for 5 minutes.</p>
              </div>
            </body>
            </html>
          `,
        });
        console.log(`[LANGUAGE-OTP] Email OTP sent to ${email} for French`);
      } catch (emailError) {
        console.error("[LANGUAGE-OTP] Email sending failed:", emailError.message);
        return res.status(500).send({ error: "Failed to send OTP email" });
      }

      return res.status(200).send({
        message: "OTP sent to your email",
        deliveryMethod: "email",
      });
    } else {
      // Other languages: Send OTP via SMS (phone number)
      if (!user.phoneNumber) {
        return res.status(400).send({
          error: "Phone number not registered. Please update your profile.",
        });
      }

      const otp = new Otp({
        phoneNumber: user.phoneNumber,
        email, // Keep email for reference
        otp: otpCode,
        purpose: "languageChange",
        targetLanguage,
      });
      await otp.save();

      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`[LANGUAGE-OTP] SMS OTP sent to ${user.phoneNumber}: ${otpCode} for ${targetLanguage}`);

      return res.status(200).send({
        message: "OTP sent to your registered mobile number",
        deliveryMethod: "sms",
        phoneNumber: user.phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2"), // Masked
      });
    }
  } catch (error) {
    console.error("[LANGUAGE-OTP] Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// POST /language/verify-change — Verify OTP and apply language change
app.post("/language/verify-change", async (req, res) => {
  try {
    const { email, otp, targetLanguage } = req.body;
    if (!email || !otp || !targetLanguage) {
      return res.status(400).send({ error: "Email, OTP, and target language are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Find OTP record
    let otpRecord;
    if (targetLanguage === "fr") {
      otpRecord = await Otp.findOne({
        email,
        otp,
        purpose: "languageChange",
        targetLanguage,
      });
    } else {
      otpRecord = await Otp.findOne({
        phoneNumber: user.phoneNumber,
        otp,
        purpose: "languageChange",
        targetLanguage,
      });
    }

    if (!otpRecord) {
      return res.status(400).send({ error: "Invalid or expired OTP" });
    }

    // Update user's language preference
    user.preferredLanguage = targetLanguage;
    await user.save();

    // Delete the OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    console.log(`[LANGUAGE-CHANGE] User ${email} language changed to ${targetLanguage}`);

    return res.status(200).send({
      message: "Language changed successfully",
      preferredLanguage: targetLanguage,
      user,
    });
  } catch (error) {
    console.error("[LANGUAGE-CHANGE] Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/reset-password", async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) return res.status(400).send({ error: "Missing fields." });

    const user = await User.findOne({ $or: [{ email: identifier }, { phoneNumber: identifier }] });
    if (!user) return res.status(404).send({ error: "No account found with this email or phone number." });

    const oneDayMs = 24 * 60 * 60 * 1000;
    if (user.lastPasswordResetRequest && Date.now() - new Date(user.lastPasswordResetRequest).getTime() < oneDayMs) {
      return res.status(429).send({ error: "You can only reset once per day." });
    }

    user.password = newPassword;
    user.lastPasswordResetRequest = new Date();
    await user.save();
    return res.status(200).send({ message: "Password reset successfully!" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION & PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /subscription/plans — return all plans
app.get("/subscription/plans", (req, res) => {
  const plans = Object.entries(PLANS).map(([key, val]) => ({
    id: key,
    ...val,
  }));
  return res.status(200).send(plans);
});

// GET /subscription/status?userId=xxx — get user's current subscription
app.get("/subscription/status", async (req, res) => {
  try {
    const { userId, email } = req.query;
    if (!userId && !email) return res.status(400).send({ error: "userId or email required" });

    let sub;
    if (userId) {
      sub = await Subscription.findOne({ userId, status: "active" }).sort({ createdAt: -1 });
    } else {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).send({ error: "User not found" });
      sub = await Subscription.findOne({ userId: user._id, status: "active" }).sort({ createdAt: -1 });
    }

    if (!sub) {
      // Auto-create free tier
      const user = email ? await User.findOne({ email }) : null;
      if (user) {
        sub = new Subscription({
          userId: user._id,
          email: user.email,
          plan: "free",
          tweetLimit: 1,
          tweetsPostedThisMonth: 0,
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await sub.save();
      }
    }

    return res.status(200).send(sub);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// POST /subscription/create-order — create Razorpay order (time-restricted: 10–11 AM IST)
app.post("/subscription/create-order", async (req, res) => {
  try {
    // ── Time window check ──────────────────────────────────────────────────────
    if (!isPaymentWindowOpen()) {
      const hour = getISTHour();
      return res.status(403).send({
        error: `Payments are only allowed between 10:00 AM and 11:00 AM IST. Current IST hour: ${hour}:xx`,
        currentHourIST: hour,
      });
    }

    const { plan, userId, email } = req.body;
    if (!plan || !userId || !email) return res.status(400).send({ error: "plan, userId and email required" });

    const planInfo = PLANS[plan];
    if (!planInfo) return res.status(400).send({ error: "Invalid plan" });
    if (plan === "free") return res.status(400).send({ error: "Free plan requires no payment" });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: planInfo.price, // in paise
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: { plan, userId, email },
    });

    return res.status(200).send({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      planName: planInfo.name,
    });
  } catch (error) {
    console.error("[PAYMENT] Order creation error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// POST /subscription/verify-payment — verify signature & activate subscription
app.post("/subscription/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId, email } = req.body;

    // ── Signature verification ─────────────────────────────────────────────────
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret");
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).send({ error: "Payment verification failed – invalid signature" });
    }

    const planInfo = PLANS[plan];
    if (!planInfo) return res.status(400).send({ error: "Invalid plan" });

    // ── Expire old active subscriptions ──────────────────────────────────────
    await Subscription.updateMany({ userId, status: "active" }, { status: "expired" });

    // ── Create new subscription ───────────────────────────────────────────────
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month

    const sub = new Subscription({
      userId,
      email,
      plan,
      tweetLimit: planInfo.tweetLimit,
      tweetsPostedThisMonth: 0,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: planInfo.price,
      status: "active",
      invoiceNumber,
      startDate,
      endDate,
    });
    await sub.save();

    // ── Send invoice email ────────────────────────────────────────────────────
    await sendInvoiceEmail(email, {
      invoiceNumber,
      plan,
      amount: planInfo.price,
      paymentId: razorpay_payment_id,
      startDate,
      endDate,
    });

    return res.status(200).send({
      message: "Payment verified & subscription activated",
      subscription: sub,
      invoiceNumber,
    });
  } catch (error) {
    console.error("[PAYMENT] Verify error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TWEET ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

async function getTwitterBearerToken() {
  if (process.env.TWITTER_BEARER_TOKEN) {
    return process.env.TWITTER_BEARER_TOKEN;
  }

  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    return null;
  }

  const credentials = Buffer.from(
    `${encodeURIComponent(consumerKey)}:${encodeURIComponent(consumerSecret)}`
  ).toString("base64");

  const response = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.warn("[TWITTER-API] Failed to obtain bearer token", response.status, errBody);
    return null;
  }

  const data = await response.json();
  return data.access_token || null;
}

async function fetchTweetsFromTwitter(query = "technology") {
  const bearerToken = await getTwitterBearerToken();
  if (!bearerToken) {
    return { tweets: [], error: "No Twitter token configured" };
  }

  try {
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&tweet.fields=attachments,author_id,conversation_id,created_at,entities,geo,lang,public_metrics,possibly_sensitive,referenced_tweets,source,withheld&expansions=author_id,attachments.media_keys,referenced_tweets.id&user.fields=created_at,description,entities,location,name,pinned_tweet_id,profile_image_url,protected,url,username,verified,public_metrics&media.fields=alt_text,duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.warn(`[TWITTER-API] Error response status: ${response.status}`, errBody);
      return { tweets: [], error: `Twitter API returned ${response.status}: ${errBody.detail || "Error"}` };
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return { tweets: [], error: "No tweets found in response" };
    }

    const usersMap = {};
    if (data.includes && Array.isArray(data.includes.users)) {
      data.includes.users.forEach(user => {
        usersMap[user.id] = {
          _id: `twitter-user-${user.id}`,
          id: `twitter-user-${user.id}`,
          username: user.username,
          displayName: user.name,
          avatar: user.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
          verified: user.verified || false,
          raw: user,
        };
      });
    }

    const mediaMap = {};
    if (data.includes && Array.isArray(data.includes.media)) {
      data.includes.media.forEach(media => {
        mediaMap[media.media_key] = media;
      });
    }

    const mappedTweets = data.data.map(tweet => {
      const authorInfo = usersMap[tweet.author_id] || {
        _id: `twitter-user-${tweet.author_id || "unknown"}`,
        id: `twitter-user-${tweet.author_id || "unknown"}`,
        username: "twitter_user",
        displayName: "Twitter User",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${tweet.author_id || "unknown"}`,
        verified: false,
      };

      const metrics = tweet.public_metrics || {};
      const attachments = [];
      if (tweet.attachments && Array.isArray(tweet.attachments.media_keys)) {
        tweet.attachments.media_keys.forEach(key => {
          if (mediaMap[key]) {
            attachments.push(mediaMap[key]);
          }
        });
      }

      const conversationId = tweet.conversation_id || null;
      const replyTweet = Array.isArray(tweet.referenced_tweets) ? tweet.referenced_tweets[0] : null;

      return {
        _id: `twitter-tweet-${tweet.id}`,
        id: `twitter-tweet-${tweet.id}`,
        author: authorInfo,
        content: tweet.text,
        likes: metrics.like_count || 0,
        likedBy: [],
        retweets: metrics.retweet_count || 0,
        retweetedBy: [],
        comments: metrics.reply_count || 0,
        timestamp: tweet.created_at || new Date().toISOString(),
        isFromRealTwitter: true,
        source: tweet.source || "X API",
        lang: tweet.lang || "en",
        conversationId,
        referencedTweet: replyTweet,
        attachments,
        raw: tweet,
      };
    });

    return { tweets: mappedTweets, error: null };
  } catch (err) {
    console.error(`[TWITTER-API] Exception fetching from Twitter API:`, err);
    return { tweets: [], error: err.message };
  }
}

// GET /twitter/status — check Twitter API status
app.get("/twitter/status", async (req, res) => {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return res.status(200).send({ status: "offline", message: "No API token configured" });
  }

  try {
    const response = await fetch("https://api.twitter.com/2/users/by/username/TwitterDev", {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      }
    });

    if (response.status === 200) {
      return res.status(200).send({ status: "live", message: "X API is online and fully connected" });
    } else if (response.status === 402) {
      return res.status(200).send({ status: "depleted", message: "X API credits depleted (Code 402)" });
    } else if (response.status === 401) {
      return res.status(200).send({ status: "unauthorized", message: "X API unauthorized (Code 401)" });
    } else {
      return res.status(200).send({ status: "offline", message: `X API returned status ${response.status}` });
    }
  } catch (err) {
    return res.status(200).send({ status: "offline", message: err.message });
  }
});

// GET /twitter/raw — return the full X API response for a query
app.get("/twitter/raw", async (req, res) => {
  const query = typeof req.query.q === "string" && req.query.q.trim().length > 0
    ? req.query.q.trim()
    : "technology OR programming OR AI";

  const bearerToken = await getTwitterBearerToken();
  if (!bearerToken) {
    return res.status(400).send({ error: "No Twitter token configured" });
  }

  try {
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&tweet.fields=attachments,author_id,conversation_id,created_at,entities,geo,lang,public_metrics,possibly_sensitive,referenced_tweets,source,withheld&expansions=author_id,attachments.media_keys,referenced_tweets.id&user.fields=created_at,description,entities,location,name,pinned_tweet_id,profile_image_url,protected,url,username,verified,public_metrics&media.fields=alt_text,duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    const data = await response.json();
    return res.status(200).send({ query, data });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// Create Tweet (with subscription limit enforcement)
app.post("/post", async (req, res) => {
  try {
    const { audio, author } = req.body;

    // IST time check for audio tweets
    const hour = getISTHour();
    if (audio && (hour < 14 || hour >= 19)) {
      return res.status(403).send({ error: "Audio tweets can only be posted between 2:00 PM and 7:00 PM IST." });
    }

    // ── Subscription / tweet limit check ─────────────────────────────────────
    if (author) {
      let sub = await Subscription.findOne({ userId: author, status: "active" }).sort({ createdAt: -1 });

      if (!sub) {
        // Auto-create free tier if missing
        const user = await User.findById(author);
        if (user) {
          sub = new Subscription({
            userId: author,
            email: user.email,
            plan: "free",
            tweetLimit: 1,
            tweetsPostedThisMonth: 0,
            status: "active",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
          await sub.save();
        }
      }

      if (sub) {
        // -1 means unlimited (Gold plan)
        if (sub.tweetLimit !== -1 && sub.tweetsPostedThisMonth >= sub.tweetLimit) {
          const planName = PLANS[sub.plan]?.name || sub.plan;
          return res.status(429).send({
            error: `Tweet limit reached for your ${planName} plan (${sub.tweetLimit} tweet${sub.tweetLimit > 1 ? "s" : ""}/month). Upgrade to post more!`,
            tweetLimit: sub.tweetLimit,
            tweetsPosted: sub.tweetsPostedThisMonth,
            plan: sub.plan,
          });
        }

        // Increment counter
        sub.tweetsPostedThisMonth += 1;
        await sub.save();
      }
    }

    const tweet = new Tweet(req.body);
    await tweet.save();
    const populatedTweet = await Tweet.findById(tweet._id).populate("author");
    return res.status(201).send(populatedTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Get All Tweets
app.get("/post", async (req, res) => {
  try {
    const localTweets = await Tweet.find().sort({ timestamp: -1 }).populate("author");

    // Fetch real tweets from Twitter API (default query)
    const { tweets: twitterTweets } = await fetchTweetsFromTwitter("technology OR programming OR AI");

    // Merge and sort by timestamp desc
    const allTweets = [...localTweets, ...twitterTweets];
    allTweets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).send(allTweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Search Tweets
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).send({ error: "Query required" });

    const localTweets = await Tweet.find({ content: { $regex: q, $options: "i" } })
      .sort({ timestamp: -1 })
      .populate("author");

    // Fetch real tweets from Twitter API matching search query
    const { tweets: twitterTweets } = await fetchTweetsFromTwitter(q);

    // Merge and sort by timestamp desc
    const allTweets = [...localTweets, ...twitterTweets];
    allTweets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).send(allTweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Like Tweet
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    const likedIndex = tweet.likedBy.indexOf(userId);
    if (likedIndex === -1) { tweet.likes += 1; tweet.likedBy.push(userId); }
    else { tweet.likes -= 1; tweet.likedBy.splice(likedIndex, 1); }
    await tweet.save();
    const populatedTweet = await Tweet.findById(tweet._id).populate("author");
    res.send(populatedTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Retweet
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });
    const retweetIndex = tweet.retweetedBy.indexOf(userId);
    if (retweetIndex === -1) { tweet.retweets += 1; tweet.retweetedBy.push(userId); }
    else { tweet.retweets -= 1; tweet.retweetedBy.splice(retweetIndex, 1); }
    await tweet.save();
    const populatedTweet = await Tweet.findById(tweet._id).populate("author");
    res.send(populatedTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
