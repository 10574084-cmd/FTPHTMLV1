# FTPHTMLV1

Interfaz web estática para administrar archivos a través de una API HTTP compatible con FTP.

## Página web

La página se publica con GitHub Actions en:

**https://10574084-cmd.github.io/FTPHTMLV1/**

Workflow: [Deploy FTPHTMLV1](https://github.com/10574084-cmd/FTPHTMLV1/actions/workflows/pages.yml)

## Código que debes poner en Cloudflare

El código del Worker está en **[`cloudflare/worker.js`](cloudflare/worker.js)** y los pasos están en **[`cloudflare/README.md`](cloudflare/README.md)**.

Resumen:
1. Crea un Worker en Cloudflare Dashboard y pega todo `cloudflare/worker.js`.
2. En Settings → Variables and Secrets configura `BACKEND_URL` y `ALLOWED_ORIGIN`.
3. Añade los secretos `ACCESS_KEY` y `BRIDGE_KEY`.
4. Despliega el Worker y prueba `https://TU-WORKER/health`.
5. En el panel HTML, pega la URL de tu Worker y el valor de `ACCESS_KEY`.

**Importante:** este Worker es una puerta de enlace HTTP protegida, no un servidor FTP. No puede conectarse directamente a la IP privada de la Wii U. Necesita un puente HTTP compatible accesible mediante HTTPS que tenga acceso real a FTPiiU en la red local. Sin ese puente, listar, subir y descargar archivos no funcionará.

## API que espera el panel

- `GET /api/list?path=...`
- `GET /api/download?path=...`
- `PUT /api/upload?path=...`
- `POST /api/mkdir?path=...`
- `POST /api/delete?path=...&type=file|dir`

El puente debe validar rutas y claves, y no permitir salir de la raíz de la SD.

## Seguridad

- No guardes claves reales en el repositorio público ni en el HTML.
- No publiques el puerto FTPiiU directamente en Internet.
- Usa HTTPS y claves largas y distintas para el panel (`ACCESS_KEY`) y para el puente (`BRIDGE_KEY`).
- La ruta de la SD en FTPiiU suele mostrarse como `/fs/vol/external01/`, pero confirma la ruta que indique tu instalación.

## Desarrollo

- Interfaz: `index.html`
- Worker para Cloudflare: `cloudflare/worker.js`
- Guía de configuración: `cloudflare/README.md`
- Publicación: `.github/workflows/pages.yml`
