/**
 * Error "esperado" con su código HTTP. Los controladores y servicios lo lanzan
 * (throw new AppError(404, 'Sprint no encontrado')) y el middleware de errores
 * lo convierte en una respuesta JSON uniforme.
 */
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}
