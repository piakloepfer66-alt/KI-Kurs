# Asteroids Arcade (Static Web Project)

Ein kleines Asteroids-Arcade-Spiel im Retro-Stil mit **reinem HTML, CSS und JavaScript**.
Kein Backend, keine Datenbank, kein Build-Prozess nötig.

## Lokal starten

1. Repository klonen oder Dateien herunterladen.
2. `index.html` direkt im Browser öffnen.

Optional (empfohlen für lokale Vorschau mit Server):

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## Auf GitHub Pages hosten (statische Vorschau)

1. Repository nach GitHub pushen.
2. In GitHub: **Settings → Pages**.
3. Unter **Build and deployment** bei **Source**: `Deploy from a branch` wählen.
4. Branch auswählen (z. B. `main`) und Ordner `/ (root)`.
5. Speichern – nach kurzer Zeit ist die Vorschau unter der GitHub-Pages-URL erreichbar.

## Steuerung

- **Pfeil links/rechts**: Schiff drehen
- **Pfeil hoch**: Schub
- **Leertaste**: Schießen
- **Enter** (bei Game Over): Neustart

## Features

- Trägheitsbasierte Bewegung des Schiffs
- Screen-Wrapping für Schiff, Asteroiden und Schüsse
- Asteroiden mit unterschiedlichen Flugbahnen und Geschwindigkeiten
- Große Asteroiden zerbrechen in kleinere
- Kollisionen Schiff/Asteroid kosten Leben
- 3 Leben + Score-System
- Game-Over-Screen mit sauberem Reset beim Neustart

## Projektstruktur

```text
.
├── index.html   # Struktur & Canvas
├── style.css    # Retro-Arcade-Design
├── script.js    # Spiel-Logik, Rendering, Input, Collision
└── README.md
```
