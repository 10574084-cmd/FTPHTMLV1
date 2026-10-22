/**
 * FTPHTMLV1 Cloudflare Worker — HTTP gateway
 *
 * IMPORTANT:
 * This Worker does NOT speak FTP and cannot reach your Wii U's private LAN IP.
 * Set BACKEND_URL to an HTTPS HTTP-bridge reachable from Cloudflare (for example,
 * a bridge exposed through a properly configured Cloudflare Tunnel).
 * The bridge must implement the /api/* endpoints documented in cloudflare/README.md.
 *
 * Required Worker settings:
 *   Variable: BACKEND_URL  (HTTPS URL of the bridge; no path required)
 *   Variable: ALLOWED_ORIGIN = https://10574084-cmd.github.io
 *   Secret:   ACCESS_KEY   (entered in the website UI)
 *   Secret:   BRIDGE_KEY   (sent from Worker to the bridge)
 */

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_ROUTES = new Map([
  ["GET /api/list", "GET"],
  ["GET /api/download", "GET"],
  ["PUT /api/upload", "PUT"],
  ["POST /api/mkdir", "POST"],
  ["POST /api/delete", "POST"],
]);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function corsHeaders(origin, allowedOrigin) {
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://10574084-cmd.github.io";
    const cors = corsHeaders(origin, allowedOrigin);

    if (origin && origin !== allowedOrigin) {
      return json({ error: "Origin not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({
        service: "FTPHTMLV1 Cloudflare gateway",
        status: "worker_online",
        message: "El Worker está activo. Para comprobar su configuración abre /health. La gestión de archivos usa /api/* y requiere ACCESS_KEY.",
        next: "Este Worker no se conecta directamente a FTPiiU. Necesita un puente HTTP HTTPS accesible desde Cloudflare en BACKEND_URL."
      }, 200, cors);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      let backendUrlValid = false;
      let backendUrlMessage = "Falta BACKEND_URL: todavía no se configuró un puente HTTP.";
      try {
        const backend = new URL(env.BACKEND_URL || "");
        backendUrlValid = backend.protocol === "https:" && Boolean(backend.hostname);
        backendUrlMessage = backendUrlValid
          ? "La URL tiene formato HTTPS. Esto no confirma que el puente esté funcionando."
          : "BACKEND_URL debe ser una URL HTTPS pública del puente HTTP; una IP privada de la Wii U no sirve aquí.";
      } catch {
        backendUrlMessage = "BACKEND_URL no es una URL válida. No pongas 192.168.0.18 ni otra IP local: hace falta la URL HTTPS pública de un puente HTTP real.";
      }
      return json({
        service: "FTPHTMLV1 Cloudflare gateway",
        configured: Boolean(backendUrlValid && env.ACCESS_KEY && env.BRIDGE_KEY),
        backendUrlValid,
        credentialsPresent: Boolean(env.ACCESS_KEY && env.BRIDGE_KEY),
        note: "El Worker no habla FTP ni se conecta directamente a FTPiiU.",
        message: backendUrlMessage,
        nextStep: backendUrlValid
          ? "Comprueba que el puente HTTP esté encendido y tenga acceso a FTPiiU."
          : "Primero necesitas ejecutar un puente HTTP en un dispositivo de tu misma Wi-Fi que pueda alcanzar la Wii U, y publicarlo de forma segura por HTTPS."
      }, 200, cors);
    }

    const routeKey = request.method + " " + url.pathname;
    if (!ALLOWED_ROUTES.has(routeKey)) {
      return json({ error: "Unsupported route or HTTP method." }, 404, cors);
    }

    const auth = request.headers.get("Authorization") || "";
    const suppliedKey = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!constantTimeEqual(suppliedKey, env.ACCESS_KEY || "")) {
      return json({ error: "Unauthorized: check ACCESS_KEY." }, 401, cors);
    }

    if (!env.BACKEND_URL || !env.BRIDGE_KEY) {
      return json({
        error: "Worker secrets are incomplete. Configure BACKEND_URL and BRIDGE_KEY.",
      }, 503, cors);
    }

    let backendBase;
    try {
      backendBase = new URL(env.BACKEND_URL);
      if (backendBase.protocol !== "https:") {
        return json({
          error: "BACKEND_URL debe usar HTTPS.",
          explanation: "No uses http:// ni la IP privada 192.168.0.18. Se necesita la URL HTTPS pública de un puente HTTP real; el Worker no puede conectarse directamente a FTPiiU."
        }, 500, cors);
      }
      if (!backendBase.hostname) throw new Error("Missing hostname");
    } catch {
      return json({
        error: "BACKEND_URL no es una URL HTTPS válida.",
        explanation: "No pongas 192.168.0.18 ni una IP local. Primero hace falta crear y publicar un puente HTTP que pueda conectarse a la Wii U."
      }, 500, cors);
    }

    if (request.method === "PUT") {
      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > MAX_UPLOAD_BYTES) {
        return json({ error: "Uploads are limited to 25 MiB by this Worker." }, 413, cors);
      }
    }

    // Only allow fixed API paths; the caller cannot choose an arbitrary upstream host.
    const target = new URL(url.pathname + url.search, backendBase.origin);
    const headers = new Headers();
    const contentType = request.headers.get("Content-Type");
    const accept = request.headers.get("Accept");
    if (contentType) headers.set("Content-Type", contentType);
    if (accept) headers.set("Accept", accept);
    headers.set("Authorization", "Bearer " + env.BRIDGE_KEY);
    headers.set("Cache-Control", "no-store");

    try {
      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
      });

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set("Cache-Control", "no-store");
      for (const [key, value] of Object.entries(cors)) responseHeaders.set(key, value);

      // Do not follow upstream redirects: avoid leaking the bridge key to another host.
      if (upstream.status >= 300 && upstream.status < 400) {
        return json({ error: "The bridge returned a redirect; configure BACKEND_URL to its final HTTPS address." }, 502, cors);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch {
      return json({
        error: "Could not reach BACKEND_URL. Check that the HTTP bridge is running and reachable via HTTPS.",
      }, 502, cors);
    }
  },
};
