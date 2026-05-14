// api/status.js
// GET /api/status — returns whether current user has linked their X account

const cookie = require("cookie");

module.exports = (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  const accessToken = cookies.x_access_token;
  const screenName  = cookies.x_screen_name;
  const userId      = cookies.x_user_id;

  if (accessToken && screenName) {
    return res.json({ connected: true, screenName, userId });
  }

  return res.json({ connected: false });
};
