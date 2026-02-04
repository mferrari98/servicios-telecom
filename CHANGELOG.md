# Changelog

Registro de cambios por sesion de trabajo. Actualizar al cerrar cada sesion.

## 2026-02-03
### cont-reportespiolis
- Sunburst: redisenio con anillo total, agua/vacio y sitios, ajustes de etiquetas, opacidad y tipografias, y leyenda de colores.
- Barras: color de textos normalizado, maximo operativo agregado y ajustes de espaciado/legibilidad en web y mail.
- Mail: capturas y tamanos de imagen ajustados para barras y sunburst; leyenda de colores agregada en el correo.

## 2026-02-04
### cont-reportespiolis
- Barras: texto de nivel actual alineado arriba con margen interno; texto de maximo operativo sin opacidad heredada.
- Sunburst: porcentajes de agua y vacio con 1 decimal y formato con coma en labels y tooltip.

### cont-nginx
- /reporte/ sin auth_basic; el resto del portal sigue protegido.

### cont-portal
- Internos: parseo de Excel movido a servidor con cache y API /api/internos; el cliente consume la cache por defecto.
- Internos: worker actualizado para parseo en background (fallback solo si se habilita).
- Deudores: etiqueta item/items en el contador y badge sin resaltado de color.
- Deudores: formato de fecha dd/mm/aa con calendario nativo y normalizacion a ISO al guardar.
- Deudores: se removieron mensajes de edicion bloqueada y el desbloqueo abre dialogo en lugar de mostrar error.
- Auth: /api deudores ahora devuelve 403 en clave incorrecta para evitar el login de Basic Auth.
- Docker: ca-certificates agregado en builder y deps para npm ci con node-gyp.
