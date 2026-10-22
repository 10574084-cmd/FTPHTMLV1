# Cloudflare Worker para FTPHTMLV1

Este archivo está listo para pegar en **Cloudflare Dashboard → Workers & Pages → Create → Worker → Edit code**:

- Código: [`worker.js`](./worker.js)

## Antes de configurarlo

**Este Worker es una puerta de enlace HTTP protegida; no es un servidor FTP y no puede conectarse directamente a la IP privada de la Wii U.** Necesita un puente HTTP real, accesible mediante HTTPS, que se ejecute en un dispositivo que sí pueda conectarse a FTPiiU dentro de la red local (o a través de un túnel seguro). Sin ese puente, la web no podrá listar ni transferir archivos.

No publiques el puerto FTP de la Wii U directamente en Internet.

## 1. Crear el Worker

1. Abre https://dash.cloudflare.com/ y entra en **Workers & Pages**.
2. Crea un Worker nuevo y ponle, por ejemplo, `ftphtmlv1-gateway`.
3. Abre **Edit code** y reemplaza todo el ejemplo por el contenido completo de `cloudflare/worker.js`.
4. Pulsa **Deploy**.

## 2. Configurar variables y secretos

En la configuración del Worker, abre **Settings → Variables and Secrets**. Añade:

| Nombre | Tipo | Valor |
|---|---|---|
| `BACKEND_URL` | Variable (texto) | URL HTTPS completa/base del puente HTTP; por ejemplo, la dirección HTTPS de un servicio de puente publicado por un túnel. No pongas una IP privada `192.168.x.x`. |
| `ALLOWED_ORIGIN` | Variable (texto) | `https://10574084-cmd.github.io` |
| `ACCESS_KEY` | Secret | Crea una clave larga y única. Es la clave que escribirás en el panel HTML. |
| `BRIDGE_KEY` | Secret | Otra clave distinta, que el puente HTTP debe aceptar en la cabecera `Authorization: Bearer ...`. |

Guarda y vuelve a desplegar el Worker si el panel lo solicita. No pongas claves reales en archivos públicos de GitHub ni en el HTML.

## 3. Comprueba el Worker

Abre en el navegador la dirección asignada por Cloudflare seguida de `/health`, por ejemplo:

`https://ftphtmlv1-gateway.<tu-subdominio>.workers.dev/health`

Debe devolver JSON con `service` y `configured`. Eso solo confirma que están puestas las variables; **no confirma que FTPiiU esté conectado**.

## 4. Conectar la página

1. Abre https://10574084-cmd.github.io/FTPHTMLV1/
2. En el campo «URL HTTPS del puente HTTP / Cloudflare Worker», pega la URL `workers.dev` de arriba, sin `/health`.
3. En «Clave de acceso», escribe el valor secreto `ACCESS_KEY`.
4. Pulsa **Conectar**.

## API que debe implementar el puente HTTP real

El Worker reenvía estas rutas al `BACKEND_URL), y envía `BRIDGE_KEY` al puente mediante una cabecera Bearer:

- `GET /api/list?path=...` → JSON `{ "entries": [{ "name": "carpeta", "type": "dir" }, { "name": "archivo.bin", "type": "file", "size": 123 }] }`
- `GET /api/download?path=...` → contenido binario del archivo
- `PUT /api/upload?path=...` → cuerpo binario de la subida
- `POST /api/mkdir?path=...` → crea una carpeta
- `POST /api/delete?path=...&type=file|dir` → elimina el elemento solicitado

El puente debe validar rutas, impedir salir de la raíz de la SD, validar la clave `BRIDGE_KEY`, y responder con CORS cuando corresponda si se accede directamente. El Worker aplica un límite preventivo de 25 MiB a las subidas con `Content-Length`.

## Limitación importante para tu configuración

Cloudflare Workers no puede descubrir ni conectarse a FTPiiU por su cuenta. Para que el sistema funcione, el `BACKEND_URL` debe ser el de un puente HTTP compatible que tenga acceso de red a la Wii U. GitHub Pages aloja el panel, pero no ejecuta programas permanentes. Si tu Chromebook no puede ejecutar Python/Linux, el puente debe correr en otro dispositivo disponible en la misma Wi-Fi; el Worker por sí solo no sustituye esa parte.
