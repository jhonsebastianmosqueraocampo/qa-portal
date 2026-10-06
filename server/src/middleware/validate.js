/**
 * Valida body, query y/o params con esquemas de Zod antes de llegar al controlador.
 * Los datos ya validados (y convertidos: "5" → 5, fechas, mayúsculas...) quedan en req.valid.
 * Si algo no cumple, Zod lanza un error que el errorHandler convierte en un 400.
 *
 * Uso: router.post('/', validate({ body: createSprintBody }), controller.create)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  };
}
