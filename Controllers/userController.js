const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Model/User");
const {
  errorResponse,
  successResponse,
} = require("../Utils/responseErrorHandler");
const { serializeUser } = require("../Utils/reusable");

const BCRYPT_SALT_ROUNDS = 12;

const validateRegistrationPayload = ({ username, email, password }) => {
  const errors = [];
  const sanitized = {};

  // username
  if (!username || typeof username !== "string") {
    errors.push("username is required");
  } else {
    sanitized.username = username.trim();
    if (sanitized.username.length < 3 || sanitized.username.length > 30) {
      errors.push("username must be between 3 and 30 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(sanitized.username)) {
      errors.push(
        "username may only contain letters, numbers, and underscores",
      );
    }
  }

  // email
  if (!email || typeof email !== "string") {
    errors.push("email is required");
  } else {
    sanitized.email = email.trim().toLowerCase();
    // RFC-5322 simplified pattern — good enough for most cases
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
      errors.push("email must be a valid email address");
    }
  }

  // password
  if (!password || typeof password !== "string") {
    errors.push("password is required");
  } else {
    if (password.length < 8) {
      errors.push("password must be at least 8 characters");
    }
    if (password.length > 72) {
      // bcrypt silently truncates at 72 bytes — reject early to avoid user confusion
      errors.push("password must not exceed 72 characters");
    }
    if (!/[A-Z]/.test(password))
      errors.push("password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password))
      errors.push("password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password))
      errors.push("password must contain at least one number");

    // Ensure password is included in sanitized data
    if (errors.length === 0 || !errors.some(e => e.includes("password"))) {
      sanitized.password = password;
    }
  }

  return { sanitized, validationErrors: errors };
};

const validateProfileUpdatePayload = (payload = {}) => {
  const errors = [];
  const sanitized = {};
  const hasUsername = Object.prototype.hasOwnProperty.call(payload, "username");
  const hasEmail = Object.prototype.hasOwnProperty.call(payload, "email");
  const hasPassword = Object.prototype.hasOwnProperty.call(payload, "password");
  const hasCurrentPassword = Object.prototype.hasOwnProperty.call(
    payload,
    "currentPassword",
  );

  if (!hasUsername && !hasEmail && !hasPassword && !hasCurrentPassword) {
    errors.push(
      "At least one updatable field is required: username, email, or password",
    );
    return { sanitized, validationErrors: errors };
  }

  if (hasUsername) {
    if (typeof payload.username !== "string") {
      errors.push("username must be a string");
    } else {
      sanitized.username = payload.username.trim();
      if (sanitized.username.length < 3 || sanitized.username.length > 30) {
        errors.push("username must be between 3 and 30 characters");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(sanitized.username)) {
        errors.push("username may only contain letters, numbers, and underscores");
      }
    }
  }

  if (hasEmail) {
    if (typeof payload.email !== "string") {
      errors.push("email must be a string");
    } else {
      sanitized.email = payload.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
        errors.push("email must be a valid email address");
      }
    }
  }

  if (hasCurrentPassword && typeof payload.currentPassword !== "string") {
    errors.push("currentPassword must be a string");
  } else if (hasCurrentPassword) {
    sanitized.currentPassword = payload.currentPassword;
  }

  if (hasPassword) {
    if (typeof payload.password !== "string") {
      errors.push("password must be a string");
    } else {
      sanitized.password = payload.password;
      if (sanitized.password.length < 8) {
        errors.push("password must be at least 8 characters");
      }
      if (sanitized.password.length > 72) {
        errors.push("password must not exceed 72 characters");
      }
      if (!/[A-Z]/.test(sanitized.password)) {
        errors.push("password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(sanitized.password)) {
        errors.push("password must contain at least one lowercase letter");
      }
      if (!/[0-9]/.test(sanitized.password)) {
        errors.push("password must contain at least one number");
      }
      if (!hasCurrentPassword || !sanitized.currentPassword) {
        errors.push("currentPassword is required when updating password");
      }
    }
  }

  return { sanitized, validationErrors: errors };
};

const registerUser = async (req, res) => {
  // 1. Validate & sanitize input before touching the DB
  const { sanitized, validationErrors } = validateRegistrationPayload(req.body);

  if (validationErrors.length > 0) {
    return errorResponse(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid request payload",
      validationErrors,
    );
  }

  const { username, email, password } = sanitized;

  try {
    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 3. Persist user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // 4. Return safe representation
    return successResponse(res, 201, serializeUser(newUser), "User Successfully Registered!");
  } catch (error) {
    console.error("[registerUser]", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      const conflictedFields = error.errors.map((e) => e.path);
      const isEmailConflict = conflictedFields.includes("email");

      if (isEmailConflict) {
        return errorResponse(res, 409, "CONFLICT", "Email is already registered", conflictedFields);
      }

      // Non-email unique constraint hit — still return a 409, not a 500
      return errorResponse(res, 409, "CONFLICT", "A user with those credentials already exists", conflictedFields);
    }

    if (error.name === "SequelizeValidationError") {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Sequelize model validation failed",
        error.errors.map((e) => e.message),
      );
    }

    return errorResponse(
      res,
      500,
      "INTERNAL_ERROR",
      "Failed to register user",
      null,
      error,
    );
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(
      res,
      400,
      "VALIDATION_ERROR",
      "Email and password are required",
    );
  }

  try {
    const user = await User.unscoped().findOne({ where: { email } });

    if (!user) {
      return errorResponse(
        res,
        404,
        "NOT_FOUND",
        `User with email ${email} not found`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse(
        res,
        400,
        "BAD_REQUEST",
        "Invalid password",
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    return successResponse(res, 200, {
      user: serializeUser(user),
      token,
    });
  } catch (error) {
    console.error("[loginUser]", error);
    return errorResponse(
      res,
      500,
      "INTERNAL_ERROR",
      "Failed to login user",
      null,
      error,
    );
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { raw: true });
    if (!user) {
      return errorResponse(
        res,
        404,
        "NOT_FOUND",
        `User with id ${req.user.id} not found`,
      );
    }
    return successResponse(res, 200, serializeUser(user));
  } catch (error) {
    console.error("[getUser]", error);
    return errorResponse(
      res,
      500,
      "INTERNAL_ERROR",
      "Failed to get user",
      null,
      error,
    );
  }
}

const updateUser = async (req, res) => {
  const { sanitized, validationErrors } = validateProfileUpdatePayload(req.body);

  if (validationErrors.length > 0) {
    return errorResponse(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid request payload",
      validationErrors,
    );
  }

  try {
    const user = await User.unscoped().findByPk(req.user.id);
    if (!user) {
      return errorResponse(
        res,
        404,
        "NOT_FOUND",
        `User with id ${req.user.id} not found`,
      );
    }

    const updates = {};

    if (
      sanitized.username &&
      sanitized.username !== user.username
    ) {
      updates.username = sanitized.username;
    }

    if (
      sanitized.email &&
      sanitized.email !== user.email
    ) {
      const existingUser = await User.findOne({ where: { email: sanitized.email } });
      if (existingUser && existingUser.id !== user.id) {
        return errorResponse(
          res,
          409,
          "CONFLICT",
          "Email is already registered",
        );
      }
      updates.email = sanitized.email;
    }

    if (sanitized.password) {
      const isCurrentPasswordValid = await bcrypt.compare(
        sanitized.currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        return errorResponse(
          res,
          400,
          "BAD_REQUEST",
          "Current password is incorrect",
        );
      }

      const isSamePassword = await bcrypt.compare(sanitized.password, user.password);
      if (isSamePassword) {
        return errorResponse(
          res,
          400,
          "BAD_REQUEST",
          "New password must be different from current password",
        );
      }

      updates.password = await bcrypt.hash(sanitized.password, BCRYPT_SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return successResponse(res, 200, serializeUser(user), "No changes detected");
    }

    await user.update(updates);
    return successResponse(res, 200, serializeUser(user), "User profile updated successfully");
  } catch (error) {
    console.error("[updateUser]", error);
    return errorResponse(
      res,
      500,
      "INTERNAL_ERROR",
      "Failed to update user profile",
      null,
      error,
    );
  }
};

module.exports = { registerUser, loginUser, getUser, updateUser };
