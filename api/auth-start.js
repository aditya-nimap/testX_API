// api/auth-start.js
// Step 1: Get a request token from X, then redirect user to X's auth page

const OAuth = require("oauth").OAuth;

const oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  process.env.X_API_KEY,
  process.env.X_API_SECRET,
  "1.0A",
  process.env.CALLBACK_URL, // e.g. https://your-app.vercel.app/auth/x/callback
  "HMAC-SHA1"
);

module.exports = async (req, res) => {
  oa.getOAuthRequestToken((err, oauthToken, oauthTokenSecret) => {
    if (err) {
      console.error("Request token error:", err);
      return res.status(500).send("Failed to start OAuth. Check your API keys.");
    }

    // Temporarily store the token secret in a cookie so we can use it in the callback
    // (In production, store in a DB or Redis keyed by oauthToken)
    res.setHeader(
      "Set-Cookie",
      `oauth_token_secret=${oauthTokenSecret}; HttpOnly; Path=/; Max-Age=600`
    );

    // Redirect user to X to approve your app
    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`);
  });
};
