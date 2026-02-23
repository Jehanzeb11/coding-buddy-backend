const { errorResponse } = require("../Utils/responseErrorHandler");

const invalidId = (res, id) => {
  if (!id || isNaN(Number(id))) {
    return errorResponse(
      res,
      400,
      "INVALID_PARAM",
      "User ID must be a valid number",
    );
  }
};

module.exports = {
  invalidId,
};
