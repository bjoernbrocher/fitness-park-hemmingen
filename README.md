# FITNESS PARK in Hemmingen

Mobile, installierbare PWA zur transparenten Dokumentation von Check-ins und
Check-outs in einem Fitnessstudio.

## Enthalten

- Interaktiver Mitgliederfluss mit QR-Demo, Check-in, Live-Dauer und Check-out
- Besuchshistorie und Profil
- Betreiber-Dashboard mit Live-Anwesenheit, Suche und Filtern
- Vorfallsanlage und neutrale zeitliche Auswertung
- Offline-fähige PWA mit Manifest und Service Worker
- Supabase-Schema mit Rollen, Audit-Logs, unveränderlichen Vorfall-Snapshots,
  Serverfunktionen und Row Level Security

## Demo

`index.html` über einen lokalen Webserver öffnen. In der Profilansicht führt
„Betreiber-Demo öffnen“ in den Mitarbeiterbereich.

## Produktivsetzung

Vor einem echten Einsatz sind ein Supabase-Projekt, E-Mail-Einladungen,
Edge-Functions/Cron für automatische Schließung und Löschung sowie eine
datenschutzrechtliche Prüfung des konkreten Betriebskonzepts erforderlich.
