// api/auth-callback.js
// Step 2: X redirects here with oauth_token + oauth_verifier
// We exchange them for permanent tokens and store them in HttpOnly cookies

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
  const { oauth_token, oauth_verifier } = req.query;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send("Missing oauth_token or oauth_verifier.");
  }

  const cookies = cookie.parse(req.headers.cookie || "");
  const oauthTokenSecret = cookies.oauth_token_secret;

  if (!oauthTokenSecret) {
    return res.status(400).send("Missing oauth_token_secret cookie. Please try connecting again.");
  }

  oa.getOAuthAccessToken(
    oauth_token,
    oauthTokenSecret,
    oauth_verifier,
    (err, accessToken, accessTokenSecret, results) => {
      if (err) {
        console.error("Access token error:", err);
        return res.status(500).send("Token exchange failed: " + JSON.stringify(err));
      }

      const userId = results.user_id;
      const screenName = results.screen_name;

      console.log(`✅ Linked @${screenName} (${userId})`);

      // Store ALL tokens in HttpOnly cookies — no database needed!
      // These survive serverless cold starts since they live in the browser.
      res.setHeader("Set-Cookie", [
        `x_access_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        `x_access_token_secret=${accessTokenSecret}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        `x_user_id=${userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        `x_screen_name=${screenName}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        `oauth_token_secret=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      ]);

      res.redirect("/?connected=true&user=" + encodeURIComponent(screenName));
    }
  );
};
