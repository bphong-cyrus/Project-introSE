// Centralised error handler. Logs the error and returns a JSON envelope
// that the React Native client can display in an Alert.

module.exports = function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  const payload = {
    success: false,
    error: err.publicMessage || err.message || 'Internal Server Error',
  };

  // eslint-disable-next-line no-console
  console.error(`[${status}] ${err.message}`);
  if (err.stack) console.error(err.stack);

  res.status(status).json(payload);
};
