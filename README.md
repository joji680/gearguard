# ⚙ GearGuard

Ein Steampunk-Roguelite fürs Browser-Fenster: Räume leeren, Gegner zerlegen, Upgrades sammeln — bis der Dampf ausgeht.

## Über das Spiel

Du steuerst eine Dampfmaschine durch eine Folge von Räumen voller Gegner. Statt Lebenspunkten hast du **Dampf** (HP) und **Hitze** — schießt du zu viel, überhitzt deine Waffe. Nach jedem Raum wählst du ein Upgrade (Feuerrate, Durchschlag, Panzerung, Kühlung, …) und baust dir so deinen eigenen Build für den Run.

- **Steuerung:** WASD zum Bewegen, Maus zum Zielen/Schießen
- **Fortschritt:** Accounts mit Login, Spielstand-Speicherung und Online-Leaderboard (Raum-Tiefe, gesammelte Zahnräder)

## Tech-Stack

| Teil | Technologie |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (`index.html`, `login.html`) |
| Backend | Python 3, `http.server` (kein Framework) |
| Datenbank | SQLite (`gearguard.db`) |
| Auth | PBKDF2-Hashing (200k Iterationen) + Session-Tokens |

## Lokal starten

```bash
python3 server.py
```

Server läuft auf `http://localhost:8000` (Port siehe `server.py`). Beim ersten Start wird `gearguard.db` automatisch mit den nötigen Tabellen angelegt.

## API

| Endpoint | Zweck |
|---|---|
| `POST /api/register` | Account erstellen |
| `POST /api/login` / `POST /api/logout` | Anmelden / Abmelden |
| `GET /api/me` | Aktuelle Session prüfen |
| `GET /api/save` / `POST /api/save` | Spielstand laden / speichern |
| `POST /api/score` | Score einreichen |
| `GET /api/leaderboard` | Bestenliste abrufen |

## Projektstruktur

```
gearguard/
├── index.html   # Spiel (UI + Logik)
├── login.html   # Login/Registrierung
└── server.py    # Backend: Auth, Saves, Leaderboard
```
