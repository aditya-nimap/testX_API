// api/linkedin/auth-start.js
// GET /auth/linkedin
// Redirect user to LinkedIn's approval page

module.exports = (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    scope: "openid profile w_member_social",
    state: "linkedin_csrf_" + Math.random().toString(36).slice(2),
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
};
