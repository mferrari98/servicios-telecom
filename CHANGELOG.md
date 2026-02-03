# Changelog

Registro de cambios por sesion de trabajo. Actualizar al cerrar cada sesion.

## 2026-02-03
### cont-portal
- Internos: parseo de Excel movido a servidor con cache y API /api/internos; el cliente consume la cache por defecto.
- Internos: worker actualizado para parseo en background (fallback solo si se habilita).
- Deudores: etiqueta item/items en el contador y badge sin resaltado de color.
- Deudores: formato de fecha dd/mm/aa con calendario nativo y normalizacion a ISO al guardar.
- Deudores: se removieron mensajes de edicion bloqueada y el desbloqueo abre dialogo en lugar de mostrar error.
- Auth: /api deudores ahora devuelve 403 en clave incorrecta para evitar el login de Basic Auth.
