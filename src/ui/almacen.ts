/** localStorage que nunca rompe la app (modo privado, almacenamiento bloqueado...). */
export const almacen = {
  leer(clave: string): string | null {
    try {
      return window.localStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  guardar(clave: string, valor: string): void {
    try {
      window.localStorage.setItem(clave, valor);
    } catch {
      // sin almacenamiento: la preferencia dura solo esta sesión
    }
  },
};
