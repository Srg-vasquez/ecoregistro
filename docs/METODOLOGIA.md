# Metodología del prototipo

## Alcance definido

Estimación parcial de emisiones indirectas por electricidad adquirida, con enfoque local. No representa toda la huella organizacional, un análisis de ciclo de vida ni una certificación.

```
emisiones_kg_co2e = consumo_kwh × factor_kg_co2e_por_kwh
emisiones_t_co2e  = emisiones_kg_co2e / 1000
intensidad_kwh_t  = consumo_kwh / produccion_t
```

El backend calcula y redondea emisiones a seis decimales en kg; los valores se almacenan en columnas decimales. El cálculo PHP usa punto flotante y redondeo explícito, adecuado para la demo; no se presenta como un motor verificado. La intensidad queda nula con producción cero. Los formularios aceptan como máximo tres decimales en consumo y producción.

## Factores

La semilla incorpora **0,25 kgCO₂e/kWh**, versión **DEMO-2026-v1**, para el sistema **SEN** y año **2026**. El valor es inventado para probar el software; no se atribuye al Ministerio del Medio Ambiente ni al sistema eléctrico real. El catálogo y la UI lo marcan como ficticio.

Cada registro exige un factor del mismo año y sistema eléctrico que la instalación. No se mezclan unidades. Al aprobar se guardan valor, año, sistema, versión, fuente y condición de demo en una instantánea JSON. El resultado aprobado permanece independiente de cambios posteriores en el catálogo.

Para un uso real se debe seleccionar y documentar el factor pertinente, su vigencia, método y unidad a partir de fuentes autorizadas. Aplicar un promedio anual a cortes mensuales requiere documentar la aproximación y no convertir ese resultado automáticamente en una declaración oficial.

## Calidad e interpretación

- Solo los aprobados se suman o exportan; no se cuentan preliminares como definitivos.
- El historial se escribe en la misma transacción que la modificación.
- La restricción única instalación/mes protege incluso ante solicitudes simultáneas.
- Un bloqueo de fila y la versión del registro previenen sobreescrituras con información antigua.
- La cobertura debe acompañar siempre a los totales. Un mes incompleto no permite afirmar que disminuyó el consumo.
- La intensidad agregada es ponderada por producción. La unidad productiva debe ser comparable entre instalaciones.
- Una alerta o comentario no determina cumplimiento de normas ambientales.

## Fuentes de estudio

Consultadas el 17 de noviembre de 2026:

1. Prácticas de **gestión multi-instalación** (cierre por periodo, evidencia asociada y reportes consolidados) descritas en guías públicas de inventarios organizacionales; este prototipo no implementa requisitos normativos concretos.
2. [HuellaChile: reportes organizacionales](https://huellachile.mma.gob.cl/informacion-sobre-reportes-organizacionales-programa-huellachile/). Explicación del método local y distinción respecto del método de mercado.
3. [HuellaChile: material de apoyo](https://huellachile.mma.gob.cl/recursos-material-de-apoyo/). Ubicación de recursos y factores oficiales que deben verificarse para cada uso real.
4. [MMA: huella de carbono](https://mma.gob.cl/cambio-climatico/cc-02-7-huella-de-carbono/). Contexto sobre inventarios, datos de actividad, factores y emisiones.
