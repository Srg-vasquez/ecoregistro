# Del dato ambiental al cierre mensual

## Caso ficticio

VerdeSur Alimentos tiene dos instalaciones y reúne consumos eléctricos y producción mensuales. Una persona carga las referencias de sus facturas y otra comprueba la información antes de utilizarla en un reporte. La empresa, los usuarios, las evidencias y las cifras de la demo son ficticios.

El problema que se propone resolver es el cierre con datos incompletos, duplicados o difíciles de reconstruir. Es un **caso de estudio ficticio** pensado para demostrar flujo, trazabilidad y reportes; no proviene de un levantamiento con una empresa real ni documenta procesos internos de terceros.

## Usuarios y decisiones

| Usuario | Necesita | Decide |
| --- | --- | --- |
| Operador de instalación | Registrar consumo, producción y referencia; atender observaciones | Qué dato corregir antes de reenviar |
| Revisor ambiental | Ver evidencia referenciada, cambios y factor | Aprobar o solicitar corrección |
| Responsable de gestión | Indicadores con cobertura y origen conocido | Dónde investigar y qué falta para cerrar |

## Historias y aceptación

1. Como operador, registro una instalación y un mes. Si esa combinación existe, el sistema rechaza la duplicación.
2. Como operador, puedo guardar y corregir mis borradores. No puedo alterar un registro enviado o aprobado.
3. Como revisor, puedo pedir corrección con un motivo o aprobar un registro enviado por otra persona.
4. Como responsable de gestión, consulto exclusivamente totales aprobados y veo cuántas instalaciones faltan.
5. Como revisor, puedo reconstruir quién cambió los datos y qué factor se utilizó al aprobar.

## Flujo

`borrador → enviado → aprobado`

`enviado → corrección solicitada → edición → reenviado → aprobado`

La edición no devuelve automáticamente un registro a aprobado. Se exige un nuevo envío. Una aprobación es terminal en este MVP: no existe reapertura ni eliminación desde la aplicación.

## Indicadores

- Consumo eléctrico: suma de kWh aprobados en el mes seleccionado.
- Emisiones estimadas: consumo de cada registro por su factor, sumado y convertido de kg a toneladas.
- Intensidad: suma de kWh / suma de toneladas producidas, no promedio simple de intensidades.
- Cobertura: registros aprobados / instalaciones activas esperadas del período.
- Sin registro: instalación activa sin ninguna carga para el mes. No equivale a consumo cero.
- Pendientes de revisión: registros enviados de todos los períodos; la interfaz lo indica explícitamente.

Ejemplo: 10.000 kWh / 100 t = 100 kWh/t; 12.000 kWh / 150 t = 80 kWh/t. El consumo aumenta 20 % y la intensidad baja 20 %. No se puede atribuir causalidad a una mejora técnica sin más evidencia.

## Qué medir en un piloto posterior

Medir tiempo real de cierre, número de correcciones, cobertura al vencimiento y tiempo dedicado a reconstruir un cálculo. Levantar una línea base antes de usar el sistema y comparar tareas equivalentes. No se han medido ahorros ni reducciones ambientales reales en este proyecto.

## Preguntas para validar con el negocio

- ¿La unidad de carga es instalación, medidor, proceso o factura?
- ¿Qué documentos se aceptan como evidencia y quién los verifica?
- ¿Cómo se detectan lecturas estimadas y cambios de unidades?
- ¿Se permiten cierres parciales? ¿Quién autoriza reaperturas?
- ¿Qué sistemas eléctricos, años y métodos de cálculo se necesitan?
- ¿Cómo se define la producción para comparar instalaciones?

## Límites y siguientes entregas

El MVP gestiona una sola organización, referencias textuales de evidencia y electricidad. El catálogo de instalaciones y factores es de solo lectura en la interfaz. Se excluyen adjuntos, importación CSV, configuración multiempresa, emisiones directas y alcance 3, certificados de energía, verificación externa, producción y cambios de capacidad de instalaciones a lo largo del tiempo. Las instalaciones activas actuales determinan la cobertura de todos los meses de la demo; una versión operativa necesitaría vigencias históricas.
