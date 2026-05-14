// api/linkedin/post.js
// POST /api/linkedin/post   body: { text: "hello" }
// Posts to the connected user's LinkedIn profile

const cookie = require("cookie");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Read tokens from cookies
  const cookies     = cookie.parse(req.headers.cookie || "");
  const accessToken = cookies.li_access_token;
  const userId      = cookies.li_user_id;

  if (!accessToken || !userId) {
    return res.status(401).json({ error: "Not connected to LinkedIn. Please connect first." });
  }

  // Parse body
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
    return res.status(400).json({ error: "Post text is required" });
  }
  if (text.length > 3000) {
    return res.status(400).json({ error: "Post exceeds 3000 characters" });
  }

  // LinkedIn UGC post payload
  const payload = {
    author: `urn:li:person:${userId}`,   // the connected user
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text.trim() },
        shareMediaCategory: "NONE",        // text-only post
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",  // required by LinkedIn
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("LinkedIn API error:", data);
      return res.status(response.status).json({ error: data?.message || "LinkedIn API error", raw: data });
    }

    const name = decodeURIComponent(cookies.li_name || "user");
    console.log(`✅ LinkedIn post by ${name}: ${text.slice(0, 40)}`);

    return res.status(200).json({
      success: true,
      postId: data.id,
      postedAs: name,
    });

  } catch (err) {
    console.error("LinkedIn post error:", err);
    return res.status(500).json({ error: "Failed to reach LinkedIn API" });
  }
};
