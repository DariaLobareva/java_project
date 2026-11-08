# Простой сервер для фронта: отдаёт index.html и пересылает /api/* на бэкенд.
# Запуск:  python server.py          (порт 3000, бэкенд на 8080)
#          python server.py 5000 8080  (свой порт фронта и бэкенда)
import sys, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
BACKEND = f"http://localhost:{sys.argv[2] if len(sys.argv) > 2 else 8080}"
PAGE = (Path(__file__).parent / "index.html").read_bytes()

class H(BaseHTTPRequestHandler):
    def _proxy(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        req = urllib.request.Request(BACKEND + self.path, data=body, method=self.command)
        for k in ("Content-Type", "Authorization", "Accept"):
            if self.headers.get(k):
                req.add_header(k, self.headers[k])
        try:
            r = urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            r = e
        except Exception:
            self.send_response(502); self.end_headers()
            self.wfile.write(b'{"message":"Backend is not running"}'); return
        data = r.read()
        self.send_response(r.status if hasattr(r, "status") else r.code)
        self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api/"): return self._proxy()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers(); self.wfile.write(PAGE)

    do_POST = do_PUT = do_DELETE = _proxy

print(f"Фронт: http://localhost:{PORT}  ->  бэкенд {BACKEND}")
ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
