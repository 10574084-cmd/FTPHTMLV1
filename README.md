# FTPHTMLV1

Interfaz web estática para administrar archivos a través de una API HTTP compatible con FTP.

## Página web

El workflow de GitHub Actions publica automáticamente `index.html` en GitHub Pages al hacer push a `main`.

URL prevista del sitio: https://10574084-cmd.github.io/FTPHTMLV1/

Abre **Actions → Deploy FTPHTMLV1 to GitHub Pages** para verificar el estado de la publicación. La primera ejecución puede tardar un poco. Si GitHub Pages no está activado para el repositorio, entra a **Settings → Pages** y elige **GitHub Actions** como origen de publicación.

## Configuración de la interfaz

1. Abre la URL publicada.
2. En «URL HTTPS del puente», introduce la URL del Worker o servicio HTTP que implementa la API.
3. Introduce la clave `ACCESS_KEY` que configuraste en ese servicio.
4. Pulsa **Conectar**.

La API debe implementar:
- `GET /api/list?path=...`
- `GET /api/download?path=...`
- `PUT /api/upload?path=...`
- `POST /api/mkdir?path=...`
- `POST /api/delete?path=...&type=file|dir`

Las respuestas cross-origin deben permitir CORS desde la página y la cabecera `Authorization`.

## Importante: FTPiiU de Wii U

GitHub Pages solo aloja el HTML. No ejecuta Python ni mantiene un servidor FTP permanente. Un Cloudflare Worker tampoco puede conectarse directamente a una IP privada de casa como `192.168.x.x`.

Para acceder a FTPiiU desde fuera de la red, hace falta un puente/túnel que se ejecute en un dispositivo dentro de la misma LAN que la Wii U. **No expongas el puerto FTP de la consola directamente a Internet.** La ruta habitual de la SD en FTPiiU puede ser `/fs/vol/external01/`, según cómo presente las rutas el servidor.

El panel por sí solo no prueba una conexión FTP; esa conexión depende de configurar un backend autorizado y alcanzable.

## Desarrollo

La interfaz está en `index.html`. El workflow está en `.github/workflows/pages.yml`.
