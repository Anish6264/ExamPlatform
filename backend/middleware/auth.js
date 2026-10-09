import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // An admin token must not be accepted as a user token.
    if (payload.type === "admin" || !payload.userId) {
      return res.status(401).json({
        message: "A valid user session is required."
      });
    }

    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({
      message: "Session expired. Please log in again."
    });
  }
}

export function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Admin password verification is required."
    });
  }

  const secret =
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    return res.status(503).json({
      message: "Admin authentication is not configured."
    });
  }

  try {
    const payload = jwt.verify(token, secret);

    if (payload.type !== "admin") {
      return res.status(403).json({
        message: "Administrator access required."
      });
    }

    req.isAdmin = true;
    next();
  } catch {
    return res.status(401).json({
      message: "Admin session expired. Enter the password again."
    });
  }
}