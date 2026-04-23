import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

// Database connection mangoose databse 
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

// AUTH ROUTES

// Register or Login (Unified)
app.post("/register", async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(200).send(user);
    }
    
    user = new User(req.body);
    await user.save();
    return res.status(201).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Get logged in user
app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
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

// TWEET ROUTES

// Create Tweet
app.post("/post", async (req, res) => {
  try {
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
    const tweets = await Tweet.find()
      .sort({ timestamp: -1 })
      .populate("author");
    return res.status(200).send(tweets);
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
    if (likedIndex === -1) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
    } else {
      tweet.likes -= 1;
      tweet.likedBy.splice(likedIndex, 1);
    }
    
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
    if (retweetIndex === -1) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
    } else {
      tweet.retweets -= 1;
      tweet.retweetedBy.splice(retweetIndex, 1);
    }
    
    await tweet.save();
    const populatedTweet = await Tweet.findById(tweet._id).populate("author");
    res.send(populatedTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
