# Arte Concreto - Plataforma de control operativo (prototipo navegable)

Prototipo sin backend: datos ficticios en memoria, persistidos en `localStorage` (clave `arteconcreto-demo-v1`). Moneda USD, interfaz en español. Todo lo externo (tienda en línea, sistema contable, correos y WhatsApp) es SIMULADO.

## Cómo ejecutar

    npm install
    npm run dev        # desarrollo
    npm run build      # compilación de producción (tsc + vite)
    npm run preview    # sirve la compilación

## Usuarios de demostración

Se elige en la pantalla de ingreso (sin contraseña). Cada usuario ve solo lo que su rol permite.

| Usuario | Rol |
| --- | --- |
| Laura Mendoza | Administrador |
| Carlos Rueda | Solicitante / Planta |
| Marcela Ortiz | Director de solicitudes |
| Andrés Pineda | Compras y Solicitante |
| Julián Ardila | Aprobador de compra |
| Paola Suárez | Tesorería |
| Sergio Báez | Almacén |
| Daniela Rojas | Producción |
| Camila Vargas | Ventas / Despacho |

## Recorridos de demostración

La pantalla **Guía de demostración** (`/guia-demo`) trae los siete recorridos con guion y botones "Cambiar a [usuario] e ir a [pantalla]":
D-01 solicitud y aprobación, D-02 compra con pago posterior, D-03 compra con anticipo, D-04 transformación en planta, D-05 traslado y salida, D-06 consulta de disponibilidad, D-07 venta de comercio electrónico, D-08 facturas y conciliación bancaria.
El **Mapa del sistema** (`/mapa-sistema`) muestra los flujos y las 18 pantallas con enlaces.

## Cómo reiniciar los datos

En la Guía de demostración pulsa **Preparar demostración**: borra los cambios y restaura el estado inicial (conserva la sesión). Alternativa manual: borrar la clave `arteconcreto-demo-v1` en el almacenamiento local del navegador. Si el modelo de datos cambia entre versiones, la persistencia anterior se descarta sola.

## Estructura

- `src/data`: semilla de datos ficticios.
- `src/store`: estado (Zustand), acciones de negocio por fase (`accionesFaseN.ts`) y selectores (`selectoresFaseN.ts`).
- `src/lib`: permisos y segregación, notificaciones, unidades, numeración, fabricación, trazabilidad.
- `src/pages`: una carpeta por módulo (P-03 a P-18); `src/components`: componentes comunes.
