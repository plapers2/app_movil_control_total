export const paramsFecha = (criterio, textoBusqueda) => {
  const params = new URLSearchParams({ periodo: criterio.periodo });
  if (criterio.desde && criterio.hasta) {
    params.set('desde', criterio.desde);
    params.set('hasta', criterio.hasta);
  }
  if (textoBusqueda?.trim()) params.set('q', textoBusqueda.trim());
  return params;
};
