const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null
  });
};

const sendError = (res, statusCode, message, code, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code,
      details
    }
  });
};

module.exports = {
  sendSuccess,
  sendError
};
