import mongoose from "mongoose";

const OtpSchema = mongoose.Schema({
  email: { type: String },
  phoneNumber: { type: String },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ["verification", "languageChange", "login"], default: "verification" },
  targetLanguage: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 minutes expiry
});

export default mongoose.model("Otp", OtpSchema);
