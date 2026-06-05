import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinDate: { type: Date, default: Date.now },
  notificationsEnabled: { type: Boolean, default: true },
  audioVerified: { type: Boolean, default: false },
  phoneNumber: { type: String, default: "" },
  password: { type: String, default: "" },
  lastPasswordResetRequest: { type: Date, default: null },
  preferredLanguage: { type: String, default: "en", enum: ["en", "es", "hi", "pt", "zh", "fr"] },
});

export default mongoose.model("User", UserSchema);
