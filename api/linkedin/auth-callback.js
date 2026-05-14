// api/linkedin/auth-callback.js
// GET /auth/linkedin/callback?code=XXX
// Exchange code for access token, save in cookies

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code from LinkedIn.");
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("LinkedIn token error:", tokenData);
      return res.status(500).send("Failed to get access token from LinkedIn.");
    }

    const accessToken = tokenData.access_token;

    // Step 2: Get user's LinkedIn ID and name (needed to post on their behalf)
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = await profileRes.json();
    const userId = profile.sub;   // LinkedIn unique ID e.g. "abc123XYZ"
    const name   = profile.name;  // e.g. "John Doe"

    console.log(`✅ LinkedIn linked: ${name} (${userId})`);

    // Step 3: Save tokens in HttpOnly cookies (expires in 60 days — LinkedIn token lifetime)
    res.setHeader("Set-Cookie", [
      `li_access_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=5184000`,
      `li_user_id=${userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=5184000`,
      `li_name=${encodeURIComponent(name)}; Secure; SameSite=Lax; Path=/; Max-Age=5184000`,
    ]);

    res.redirect("/linkedin.html?connected=true&name=" + encodeURIComponent(name));

  } catch (err) {
    console.error("LinkedIn callback error:", err);
    res.status(500).send("LinkedIn auth failed.");
  }
};
