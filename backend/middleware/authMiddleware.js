// This middleware runs before any protected route handler.
// It checks whether the request has a valid session with a userId.
// If not, it immediately returns 401 and the route handler never runs.

const authMiddleware = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  next(); // User is logged in — proceed to the route handler
};

module.exports = authMiddleware;
