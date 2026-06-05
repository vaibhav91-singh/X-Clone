import mongoose from "mongoose";

const SubscriptionSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  tweetLimit: { type: Number, default: 1 },        // -1 = unlimited
  tweetsPostedThisMonth: { type: Number, default: 0 },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  amountPaid: { type: Number, default: 0 },        // in paise (INR × 100)
  currency: { type: String, default: "INR" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },           // 1 month from startDate
  status: {
    type: String,
    enum: ["active", "expired", "pending"],
    default: "active",
  },
  invoiceNumber: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Subscription", SubscriptionSchema);
