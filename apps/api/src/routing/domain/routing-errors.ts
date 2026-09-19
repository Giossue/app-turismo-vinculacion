export class NoRouteFoundError extends Error {
  constructor() {
    super("No se encontró una ruta entre esos puntos.");
    this.name = "NoRouteFoundError";
  }
}

export class RouteProviderUnavailableError extends Error {
  constructor() {
    super("El servicio de rutas no está disponible.");
    this.name = "RouteProviderUnavailableError";
  }
}
