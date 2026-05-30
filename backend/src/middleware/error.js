export function notFound(req, res) {
  return res.status(404).json({
    error: "Rota não encontrada.",
    path: req.originalUrl
  });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  return res.status(status).json({
    error: error.message || "Erro interno do servidor."
  });
}
