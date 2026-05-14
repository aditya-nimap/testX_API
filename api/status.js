// api/status.js
// GET /api/status — returns whether the current user has linked their X account

const cookie = require("cookie");

const tokenStore = global._tokenStore || (global._tokenStore = {});

module.exports = (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  const userId = cookies.x_user_id;
  const screenName = cookies.x_screen_name;

  if (userId && tokenStore[userId]) {
    return res.json({
      connected: true,
      screenName,
      userId,
      linkedAt: tokenStore[userId].linkedAt,
    });
  }

  return res.json({ connected: false });
};
