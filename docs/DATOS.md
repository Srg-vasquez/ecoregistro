# Diccionario de datos

Una fila de energy_records representa **una instalación en un mes**, no una factura ni un medidor individual. Si existen varias facturas, el consumo debe consolidarse antes de registrarlo y la referencia debe permitir reconstruir ese conjunto.

| Campo | Unidad/tipo | Regla |
| --- | --- | --- |
| facility_id | FK instalación | Debe existir y estar activa |
| period | Fecha del primer día del mes | Entrada YYYY-MM; única por instalación |
| electricity_kwh | kWh, 3 decimales | Entre 0 y 100.000.000 |
| production_tonnes | Toneladas, 3 decimales | Entre 0 y 100.000.000; cero deja intensidad indefinida |
| evidence_ref | Texto, 3-200 caracteres | Referencia a la evidencia; no archivo adjunto |
| notes | Texto opcional, hasta 2.000 caracteres | Contexto operativo |
| emission_factor_id | FK factor | Año y sistema eléctrico deben coincidir |
| status | Texto de estado | draft, submitted, changes_requested o approved |
| lock_version | Entero positivo | Se incrementa al modificar; evita cambios con una versión antigua |
| created_by | FK usuario | El autor se toma de la sesión, no del formulario |
| reviewed_by / reviewed_at | Usuario y fecha | Identifican al revisor de la última decisión |
| review_note | Texto opcional, hasta 1.000 caracteres | Al pedir corrección debe tener al menos 10 caracteres |
| factor_snapshot | JSON | Factor exacto utilizado al aprobar, incluida fuente y versión |
| emissions_kg_co2e | kgCO₂e, 6 decimales | Resultado persistido al aprobar |

Los valores de la semilla son sintéticos. Se crean dos instalaciones, un factor ficticio 2026 y 11 registros: 9 aprobados, 1 borrador de Valdivia en abril y 1 enviado de Temuco en junio. Valdivia no tiene carga en junio. Mayo ofrece un ejemplo completo con 20.300 kWh, 253 t de producción y 5,075 tCO₂e usando el factor ficticio.

El historial conserva los atributos antes y después de cada cambio. No almacena contraseñas ni cookies. Las tablas de sesiones, caché y trabajos corresponden al framework.
