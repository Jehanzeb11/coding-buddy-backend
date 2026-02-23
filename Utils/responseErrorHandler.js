const isDev = process.env.NODE_ENV === 'development';

const errorResponse = (res, status, code, message, details = null, rawError = null) => {
  const body = { error: { code, message } };

  if (details) body.error.details = details;
  if (isDev && rawError) body.error.debug = rawError.message;

  return res.status(status).json(body);
};

const successResponse = (res, status, data, meta = null) => {
  const body = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};


module.exports = {errorResponse, successResponse}