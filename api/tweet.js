// api/tweet.js
// POST /api/tweet  { text: "Hello world" }
// Uses the stored access token to post a tweet as the linked user

const OAuth = require("oauth").OAuth;
const cookie = require("cookie");

const oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  process.env.X_API_KEY,
  process.env.X_API_SECRET,
  "1.0A",
  process.env.CALLBACK_URL,
  "HMAC-SHA1"
);

// Shared in-memory store (same global as auth-callback)
const tokenStore = global._tokenStore || (global._tokenStore = {});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get user identity from cookie
  const cookies = cookie.parse(req.headers.cookie || "");
  const userId = cookies.x_user_id;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated. Please connect your X account first." });
  }

  const userTokens = tokenStore[userId];
  if (!userTokens) {
    return res.status(401).json({ error: "No token found for this user. Please re-link your account." });
  }

  // Parse request body
  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { text } = body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Tweet text is required" });
  }
  if (text.length > 280) {
    return res.status(400).json({ error: "Tweet exceeds 280 characters" });
  }

  // Post the tweet using X API v2
  const url = "https://api.twitter.com/2/tweets";
  const tweetBody = JSON.stringify({ text: text.trim() });

  // Build OAuth 1.0a Authorization header manually for v2 endpoint
  const authHeader = oa.authHeader(url, userTokens.accessToken, userTokens.accessTokenSecret, "POST");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: tweetBody,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("X API error:", data);
      return res.status(response.status).json({ error: data?.detail || "X API error", raw: data });
    }

    console.log(`✅ Tweet posted by @${userTokens.screenName}: ${text.slice(0, 40)}`);
    return res.status(200).json({
      success: true,
      tweet: data.data,
      postedAs: userTokens.screenName,
    });

  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ error: "Failed to reach X API" });
  }
};
