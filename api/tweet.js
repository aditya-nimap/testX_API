// api/tweet.js
// POST /api/tweet  { text: "Hello world" }
// Reads access tokens from cookies (set during OAuth callback) — no DB needed

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Read tokens directly from HttpOnly cookies — survives cold starts!
  const cookies = cookie.parse(req.headers.cookie || "");
  const accessToken       = cookies.x_access_token;
  const accessTokenSecret = cookies.x_access_token_secret;
  const screenName        = cookies.x_screen_name;

  if (!accessToken || !accessTokenSecret) {
    return res.status(401).json({
      error: "Not authenticated. Please connect your X account first."
    });
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
  const authHeader = oa.authHeader(url, accessToken, accessTokenSecret, "POST");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("X API error:", data);
      return res.status(response.status).json({
        error: data?.detail || "X API error",
        raw: data
      });
    }

    console.log("Tweet posted by @" + screenName + ": " + text.slice(0, 40));
    return res.status(200).json({
      success: true,
      tweet: data.data,
      postedAs: screenName,
    });

  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ error: "Failed to reach X API" });
  }
};
