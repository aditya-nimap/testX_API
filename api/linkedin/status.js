// api/linkedin/status.js
// GET /api/linkedin/status
// Check if current user has connected their LinkedIn account

const cookie = require("cookie");

module.exports = (req, res) => {
  const cookies     = cookie.parse(req.headers.cookie || "");
  const accessToken = cookies.li_access_token;
  const userId      = cookies.li_user_id;
  const name        = cookies.li_name ? decodeURIComponent(cookies.li_name) : null;

  if (accessToken && userId) {
    return res.json({ connected: true, name, userId });
  }

  return res.json({ connected: false });
};
