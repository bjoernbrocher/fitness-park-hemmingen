# Fitness Park Hemmingen

## Zweck
Anwesenheits-PWA fuer FITNESS PARK in Hemmingen mit Mitgliederansicht, Betreiberansicht, Adminbereich, QR-Check-in und Besuchsprotokoll.

## Fester Projektkontext
- Lokaler Ordner: `D:\0000 DATEN\OneDrive\Dokumente\Fitness Park Hemmingen`
- GitHub-Repo: `https://github.com/bjoernbrocher/fitness-park-hemmingen.git`
- Standard-Branch: `main`
- Live-Domain: `https://fitness-park-hemmingen.vercel.app/`
- Vercel-Projekt-ID: `appgprj_6a670f6cb6f0819196d01ffb4f5ebbb6`
- Supabase-Projekt: `https://kyjcbmwzcxbymbcuwtfw.supabase.co`
- Supabase-Schema: `supabase-fitness-schema.sql`

## Datenbereiche
- Browser-Demo/Offline: `localStorage`
  - `fitnessParkActiveVisit`
  - `fitnessParkVisits`
  - `fitnessParkSystemLog`
  - `fitnessParkMemberProfile`
- Supabase-Tabellen:
  - `fitness_members` fuer Mitglieder/Geraeteverknuepfung
  - `fitness_visits` fuer echte Besuche
  - `fitness_system_log` fuer Systemprotokoll

## Lokaler Start
Statischen Server im Projektordner starten, zum Beispiel:

```powershell
python -m http.server 4180 --bind 127.0.0.1
```

Dann oeffnen:

```text
http://127.0.0.1:4180/index.html
```

## Release-Ablauf
1. Vor jeder Aenderung pruefen, dass der Arbeitsordner dieser Ordner ist.
2. `git status --short` ausfuehren.
3. Nur Fitness-Park-Dateien aendern.
4. Lokal testen.
5. Commit erstellen.
6. Push nach `origin main`.
7. Vercel-Deployment pruefen.

## Trennregel
Keine Gartenbande-Dateien, Gartenbande-Supabase-Tabellen oder Gartenbande-Domains in diesem Projekt verwenden.
