import http.server, socketserver, sqlite3, json, hashlib, secrets, time, os
from http.cookies import SimpleCookie
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "gearguard.db")
ITER = 200_000
SESSION_TTL = 30 * 24 * 3600


def db():
    conn = sqlite3.connect(DB)
    conn.execute("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created_at REAL)")
    conn.execute("CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at REAL)")
    conn.execute("CREATE TABLE IF NOT EXISTS saves(user_id INTEGER PRIMARY KEY, data TEXT, updated_at REAL)")
    conn.execute("CREATE TABLE IF NOT EXISTS scores(user_id INTEGER PRIMARY KEY, username TEXT, score INTEGER, room INTEGER, cogs INTEGER, updated_at REAL)")
    return conn


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITER).hex()
    return salt, h


def verify_password(password, salt, expected_hash):
    _, h = hash_password(password, salt)
    return secrets.compare_digest(h, expected_hash)


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "GearGuard/1.0"

    def _session_user(self):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        if "session" not in cookie:
            return None
        token = cookie["session"].value
        conn = db()
        row = conn.execute(
            "SELECT users.id, users.username, sessions.expires_at FROM sessions "
            "JOIN users ON users.id = sessions.user_id WHERE sessions.token=?",
            (token,),
        ).fetchone()
        conn.close()
        if not row or row[2] < time.time():
            return None
        return {"id": row[0], "username": row[1]}

    def _send_json(self, code, obj, cookie_header=None):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie_header:
            self.send_header("Set-Cookie", cookie_header)
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, name):
        with open(os.path.join(BASE, name), "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode())
        except Exception:
            return {}

    def _create_session(self, conn, user_id):
        token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO sessions(token, user_id, expires_at) VALUES(?,?,?)",
            (token, user_id, time.time() + SESSION_TTL),
        )
        conn.commit()
        return token

    def _cookie(self, token):
        return f"session={token}; Path=/; Max-Age={SESSION_TTL}; HttpOnly; SameSite=Lax"

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self._send_html("index.html" if self._session_user() else "login.html")
            return
        if path == "/login.html":
            self._send_html("login.html")
            return
        if path == "/api/me":
            user = self._session_user()
            if user:
                self._send_json(200, {"username": user["username"]})
            else:
                self._send_json(401, {"error": "unauthenticated"})
            return
        if path == "/api/save":
            user = self._session_user()
            if not user:
                self._send_json(401, {"error": "unauthenticated"})
                return
            conn = db()
            row = conn.execute("SELECT data FROM saves WHERE user_id=?", (user["id"],)).fetchone()
            conn.close()
            self._send_json(200, {"data": json.loads(row[0]) if row and row[0] else None})
            return
        if path == "/api/leaderboard":
            user = self._session_user()
            if not user:
                self._send_json(401, {"error": "unauthenticated"})
                return
            conn = db()
            rows = conn.execute("SELECT user_id, username, score, room, cogs FROM scores ORDER BY score DESC LIMIT 50").fetchall()
            conn.close()
            entries = [{"username": r[1], "score": r[2], "room": r[3], "cogs": r[4], "me": r[0] == user["id"]} for r in rows]
            self._send_json(200, {"entries": entries})
            return
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/register":
            body = self._read_json()
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""
            if not (3 <= len(username) <= 20) or not username.isalnum():
                self._send_json(400, {"error": "Benutzername muss 3-20 alphanumerische Zeichen haben"})
                return
            if len(password) < 6:
                self._send_json(400, {"error": "Passwort muss mind. 6 Zeichen haben"})
                return
            salt, h = hash_password(password)
            conn = db()
            try:
                conn.execute(
                    "INSERT INTO users(username, salt, hash, created_at) VALUES(?,?,?,?)",
                    (username, salt, h, time.time()),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                conn.close()
                self._send_json(409, {"error": "Benutzername bereits vergeben"})
                return
            user_id = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()[0]
            token = self._create_session(conn, user_id)
            conn.close()
            self._send_json(200, {"ok": True}, cookie_header=self._cookie(token))
            return
        if path == "/api/login":
            body = self._read_json()
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""
            conn = db()
            row = conn.execute("SELECT id, salt, hash FROM users WHERE username=?", (username,)).fetchone()
            if not row or not verify_password(password, row[1], row[2]):
                conn.close()
                self._send_json(401, {"error": "Benutzername oder Passwort falsch"})
                return
            token = self._create_session(conn, row[0])
            conn.close()
            self._send_json(200, {"ok": True}, cookie_header=self._cookie(token))
            return
        if path == "/api/logout":
            cookie = SimpleCookie(self.headers.get("Cookie", ""))
            if "session" in cookie:
                conn = db()
                conn.execute("DELETE FROM sessions WHERE token=?", (cookie["session"].value,))
                conn.commit()
                conn.close()
            self._send_json(200, {"ok": True}, cookie_header="session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
            return
        if path == "/api/save":
            user = self._session_user()
            if not user:
                self._send_json(401, {"error": "unauthenticated"})
                return
            body = self._read_json()
            conn = db()
            conn.execute(
                "INSERT INTO saves(user_id, data, updated_at) VALUES(?,?,?) "
                "ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at",
                (user["id"], json.dumps(body.get("data")), time.time()),
            )
            conn.commit()
            conn.close()
            self._send_json(200, {"ok": True})
            return
        if path == "/api/score":
            user = self._session_user()
            if not user:
                self._send_json(401, {"error": "unauthenticated"})
                return
            body = self._read_json()
            score = int(body.get("score") or 0)
            room = int(body.get("room") or 0)
            cogs = int(body.get("cogs") or 0)
            conn = db()
            conn.execute(
                "INSERT INTO scores(user_id, username, score, room, cogs, updated_at) VALUES(?,?,?,?,?,?) "
                "ON CONFLICT(user_id) DO UPDATE SET username=excluded.username, score=excluded.score, room=excluded.room, cogs=excluded.cogs, updated_at=excluded.updated_at "
                "WHERE excluded.score > scores.score",
                (user["id"], user["username"], score, room, cogs, time.time()),
            )
            conn.commit()
            conn.close()
            self._send_json(200, {"ok": True})
            return
        self.send_error(404)

    def log_message(self, fmt, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("0.0.0.0", 8080), Handler) as httpd:
        httpd.serve_forever()
