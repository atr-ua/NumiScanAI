# Changelog — ATR NumiScan AI (GemCoin)

All notable changes to this project are documented here.

---

## [Unreleased] — 2026-06-17

### Added
- **OpenAI integration** — coin recognition now supports GPT-4o, GPT-4.1, GPT-5.x and o4-mini alongside Gemini; provider auto-detected by model prefix (`gpt-`/`o[n]`)
- **OpenAI Structured Outputs** — uses `json_schema` mode with `strict: true` for reliable field extraction (same guarantee as Gemini `responseSchema`)
- **GPT-5.x models** — added gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano to the model picker on the Services page
- **Favicon** — SVG coin with faceted gem design; gold ring, dark inner field, specular highlights; `theme-color` and `description` meta tags added to index.html
- **Libya historical flag** — `CountryFlag` component accepts optional `year` prop; coins minted 1969–2011 display the Gaddafi-era solid green flag instead of the current national flag
- **Gemini model picker** — Services page fetches available multimodal Gemini models from API; users can pin up to 6 models (raised from 4) for quick access on the Recognition tab
- **Pinned models** — mixed Gemini + OpenAI model buttons on the Recognition tab; OpenAI models highlighted in green, Gemini in gold
- **Recognition prompt improvements** — system prompt now references NGC, PCGS, Krause Standard Catalog; user prompt for dual-image mode lists all visual cues (denomination, portrait, emblem, mint mark, inscription script, edge); refinement prompt explicitly instructs re-deriving all dependent fields

### Changed
- Default pinned models reduced from 4 to 3 to leave room for OpenAI models out of the box
- Pin limit raised from 4 to 6
- `CollectionAnalytics` passes representative coin year to `CountryFlag` for correct historical flag display
- `CoinDatabase` passes `coin.year` to `CountryFlag` in both list and detail views

### Technical
- Added `openai` npm dependency (Structured Outputs API)
- Shared `buildCoinSystemPrompt` / `buildCoinUserPrompt` helpers used by both Gemini and OpenAI paths
- `OPENAI_API_KEY` documented in `.env.example`

---

## [1.3.0] — 2026-06-06

### Added
- **PDF export** — server-side PDF catalog generation via PDFKit; white rounded cards with AV/RV coin images (r=36pt), 2-column data grid, dark price button; 3 columns × N rows per A4 page
- **Gemini model list endpoint** — `/api/gemini-models` fetches and filters multimodal-only models using `ai.models.list()` (AsyncIterable pager)
- **Known RPD badges** — hardcoded free-tier request-per-day limits for popular Gemini models displayed on the Services page
- **Image cache busting** — coin images served with `Cache-Control: immutable`; cache key invalidated on update
- **Edit form race condition fix** in CoinDatabase

---

## [1.2.0] — 2026-05-28

### Added
- **Numista sync** — SSE-based background sync with Numista API v3; fills weight, diameter, thickness, edge, mintage for existing coins
- **Batch Gemini specs** — `/api/batch-mintage` endpoint updates mintage/thickness/edge via Gemini text model in chunks of 30
- **`vis_id` ordering** — drag-and-drop reorder with persistent `vis_id` field in SQLite
- **Country filter** — filter catalog by country from the Analytics map or country list
- **Thickness / edge fields** — new coin attributes with Ukrainian edge-type vocabulary
- **Windows installer** — `install.bat` / `install.ps1` for one-click setup on Windows
- **Update system** — `update.bat` / `update.ps1`; git version hash displayed in ServicePage header

---

## [1.1.0] — 2026-05-15

### Added
- **World map** — interactive SVG map (react-simple-maps) with geodata bundled locally; Crimea assigned to Ukraine per internationally recognized borders
- **Full world country flags** — 200+ country mappings (ISO codes → flagcdn.com images + emoji fallback); historical codes for USSR, DDR, Yugoslavia
- **Duplicate detection** — warns when a recognized coin already exists in the catalog
- **Lightbox** — full-screen image viewer with keyboard navigation (←/→/Esc) and hotkey changes
- **Collection analytics** — charts for country distribution, metal composition, rarity breakdown, timeline, value range

---

## [1.0.0] — 2026-05-01

### Initial release
- Express + Vite full-stack architecture; SQLite via `sqlite3`; React 19 + Tailwind CSS v4
- AI coin recognition via Google Gemini (multimodal, structured JSON output)
- Coin catalog: add, edit, delete, reorder; obverse/reverse image storage as base64 in SQLite
- REST API: `/api/coins`, `/api/recognize-coin`, `/api/export/pdf`
- Apache 2.0 license; authored by Andrii (ATR) Tarasenko
