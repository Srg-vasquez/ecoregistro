# Arquitectura y contratos

## Stack

- PHP 8.4 y Laravel 13; Eloquent, validación, sesiones y protección CSRF del framework.
- React 19 y Vite 8; componentes JSX, CSS propio e iconos Lucide. Fuentes empaquetadas localmente.
- PostgreSQL 17 en Compose. SQLite permite arranque local y pruebas rápidas.
- Una aplicación de mismo origen: Laravel sirve HTML, assets compilados y endpoints JSON bajo `/api`.

No se usa un token pegado en localStorage. La identidad proviene de la sesión de Laravel. Las mutaciones envían el token CSRF de esa sesión. Las contraseñas se guardan mediante hashing. No hay registro público ni recuperación de contraseña en el MVP.

## Capas

`React → routes/web.php → Controllers / FormRequest → EnergyWorkflow / DashboardService → Eloquent → SQL`

`EnergyWorkflow` controla reglas de estado, permisos, transacciones, bloqueos y auditoría. `EnergyMetrics` concentra unidades y fórmulas. React representa resultados; no es la fuente de autorización ni cálculo aprobado.

## Modelo de datos

| Tabla | Responsabilidad |
| --- | --- |
| users | Identidad y rol operador/revisor |
| facilities | Instalación, código y sistema eléctrico |
| emission_factors | Año, sistema, versión, valor, unidad implícita kgCO₂e/kWh y fuente |
| energy_records | Un registro por instalación/mes; estado, evidencia, versión y resultado aprobado |
| audit_events | Actor, acción, antes/después y fecha |

Las claves foráneas restringen eliminación. No hay endpoints de borrado. La auditoría es de solo lectura en la aplicación, pero un administrador con acceso directo a la base puede modificarla: no se ofrece un registro criptográficamente inmutable.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /api/session | Usuario actual y token CSRF |
| POST | /api/login | Iniciar sesión; limitado a 10 intentos/minuto por ruta/IP |
| POST | /api/logout | Invalidar sesión y renovar CSRF |
| GET | /api/meta | Catálogos y último período aprobado |
| GET | /api/dashboard?period=2026-05 | Indicadores, cobertura y tendencia de seis meses |
| GET | /api/records | Hasta 500 registros; `period` filtra opcionalmente |
| GET | /api/records/{id} | Detalle e historial |
| POST | /api/records | Crear borrador como operador |
| PUT | /api/records/{id} | Editar borrador/corrección propios; requiere lock_version |
| POST | /api/records/{id}/transition | submit, approve o request_changes; requiere lock_version |
| GET | /api/export?period=2026-05 | CSV UTF-8; solo aprobados y factor de aprobación |

Errores: 401 sin sesión; 403 sin permiso; 409 estado incompatible o versión antigua; 422 datos inválidos. El cliente informa el error y no muestra un éxito simulado. Las celdas CSV que podrían interpretarse como fórmulas se neutralizan antes de exportar.

## Límites operativos

Aplicación de demostración para una organización, sin separación entre empresas ni permisos por instalación. Todos los usuarios autenticados pueden leer sus registros; solo el autor operador edita los suyos. No hay filtros temporales históricos para instalaciones activas, paginación más allá de 500 registros ni conciliación documental automática. El servidor PHP incorporado de Compose es para desarrollo local; un despliegue real requiere una configuración de servidor, secretos, HTTPS, respaldos y operación adecuados.
