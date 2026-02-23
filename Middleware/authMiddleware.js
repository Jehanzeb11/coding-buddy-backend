const jwt = require("jsonwebtoken");
const { errorResponse } = require("../Utils/responseErrorHandler");

const authMiddleware = (req, res, next) => {
    let token = req.headers.authorization;
    console.log("token -- ", token);

    if (!token) {
        return errorResponse(
            res,
            401,
            "UNAUTHORIZED",
            "No token provided",
        );
    }

    // Handle Bearer token format
    if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("[authMiddleware]", error);
        return errorResponse(
            res,
            401,
            "UNAUTHORIZED",
            "Invalid token",
            null,
            error,
        );
    }
}

module.exports = authMiddleware;