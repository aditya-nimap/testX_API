// api/auth-callback.js
// Step 2: X redirects here with oauth_token + oauth_verifier
// We exchange them for a permanent access_token + access_token_secret

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

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE LAYER
// For demo: we store in memory (resets on cold start).
// For production: replace with a real DB (Vercel Postgres, PlanetScale, Redis…)
// ─────────────────────────────────────────────────────────────────────────────
const tokenStore = global._tokenStore || (global._tokenStore = {});

module.exports = async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send("Missing oauth_token or oauth_verifier.");
  }

  // Retrieve the token secret we saved in the cookie during auth-start
  const cookies = cookie.parse(req.headers.cookie || "");
  const oauthTokenSecret = cookies.oauth_token_secret;

  if (!oauthTokenSecret) {
    return res.status(400).send("Missing oauth_token_secret cookie. Please try again.");
  }

  // Exchange for permanent access token
  oa.getOAuthAccessToken(
    oauth_token,
    oauthTokenSecret,
    oauth_verifier,
    (err, accessToken, accessTokenSecret, results) => {
      if (err) {
        console.error("Access token error:", err);
        return res.status(500).send("Token exchange failed.");
      }

      const userId = results.user_id;
      const screenName = results.screen_name;

      // ✅ SAVE the tokens — user is now linked!
      tokenStore[userId] = {
        accessToken,
        accessTokenSecret,
        screenName,
        linkedAt: new Date().toISOString(),
      };

      console.log(`✅ Linked @${screenName} (${userId})`);

      // Store userId in a cookie so the frontend knows who's logged in
      res.setHeader("Set-Cookie", [
        `x_user_id=${userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        `x_screen_name=${screenName}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        // Clear the temp secret cookie
        `oauth_token_secret=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      ]);

      // Redirect back to the app homepage with success
      res.redirect("/?connected=true&user=" + encodeURIComponent(screenName));
    }
  );
};

// Export store so other functions can access it
module.exports.tokenStore = tokenStore;
