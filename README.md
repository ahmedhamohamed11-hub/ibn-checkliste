# 🔧 Inbetriebnahme-Checkliste

Professionelle PWA für Monteure in der Kälte-, Klima- und Wärmepumpentechnik.

## Features

- ✅ Projekte mit Aufgaben, Kommentaren & Aktivitätsverlauf
- ⚡ Echtzeit-Sync via Supabase Realtime
- 📱 PWA — installierbar auf Android, iPhone, Tablet
- 🌙 Dark Mode / Light Mode
- 👥 Mehrbenutzer-fähig (kein Passwort, nur Name)
- ⭐ Favoriten & Projektvorlagen
- 📋 Listen-Import (eine Zeile = eine Aufgabe)
- 🧠 Intelligente Aufgabenvorschläge

## Setup

### 1. Supabase einrichten

1. Öffne deinen Supabase-Account: https://byajcepqydkyoegztcgj.supabase.co
2. Gehe zu **SQL Editor**
3. Füge den Inhalt von `supabase_setup.sql` ein und führe ihn aus
4. Gehe zu **Project Settings → API**
5. Kopiere den **anon/public** Key

### 2. .env.local befüllen

```
NEXT_PUBLIC_SUPABASE_URL=https://byajcepqydkyoegztcgj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_anon_key_hier
```

### 3. Lokal starten

```bash
npm install
npm run dev
```

→ http://localhost:3000

### 4. Deployment auf Vercel

```bash
npm install -g vercel
vercel
```

Oder: GitHub → Vercel verbinden → Environment Variables setzen:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| Datenbank | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| Icons | Lucide React |
| Deployment | Vercel |

## Projektstruktur

```
app/
  page.tsx              # Login
  dashboard/page.tsx    # Projektübersicht
  project/[id]/page.tsx # Projektdetails + Aufgaben
  favorites/page.tsx    # Favoriten verwalten
  templates/page.tsx    # Vorlagen anzeigen
components/
  CreateProjectModal    # Neues Projekt + Aufgabenauswahl
  TaskCard              # Aufgabe mit Status, Kommentaren
  ActivityModal         # Aktivitätsverlauf
  AddTaskModal          # Einzelne Aufgabe hinzufügen
  ManageParticipantsModal
  EditProjectModal
lib/
  supabase.ts           # Client
  constants.ts          # Favoriten, Vorlagen
types/index.ts          # TypeScript Typen
```

## Benutzer

Kein Passwort, keine E-Mail — nur Name eingeben.  
Name wird lokal (localStorage) gespeichert.  
Name kann jederzeit geändert werden.

## Datenbankstruktur

- `projects` — Projekte
- `project_participants` — Teilnehmer
- `tasks` — Aufgaben mit Status
- `comments` — Kommentare zu Aufgaben
- `activity_log` — Aktivitätsverlauf
- `favorites` — Persönliche Favoriten
- `suggestion_library` — Lernende Vorschläge
- `templates` — Projektvorlagen
