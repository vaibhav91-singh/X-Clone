import mongoose from "mongoose";

const LoginHistorySchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  browser: { type: String, required: true }, // Chrome, Firefox, Safari, Edge, etc.
  browserVersion: { type: String },
  os: { type: String, required: true }, // Windows, macOS, Linux, Android, iOS
  osVersion: { type: String },
  device: { type: String, required: true, enum: ["desktop", "laptop", "mobile", "tablet"] },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true }, // Full user agent string
  location: { type: String }, // City, Country (if available from IP)
  loginTime: { type: Date, default: Date.now },
  loginStatus: { type: String, enum: ["success", "failed", "blocked"], default: "success" },
  failureReason: { type: String }, // Time restriction, OTP failed, etc.
  requiresOTP: { type: Boolean, default: false },
  otpVerified: { type: Boolean, default: false },
});

// Index for efficient queries
LoginHistorySchema.index({ userId: 1, loginTime: -1 });
LoginHistorySchema.index({ email: 1, loginTime: -1 });

export default mongoose.model("LoginHistory", LoginHistorySchema);
