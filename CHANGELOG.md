# Changelog — ATR NumiScan AI (GemCoin)

All notable changes to this project are documented here.

---

## [Unreleased] — 2026-06-24

### Added
- **Loading indicator** — animated spinner with coin logo shown on first app load while coins are being fetched from the database; all tabs blocked until data is ready
- **Collection physical stats** — three new fun metric cards in Analytics: total weight (g / kg), total stack height from coin thickness (mm / cm / m), and total row length from diameter (mm / cm / m); each card shows how many coins contributed data
- **Desktop launcher** — `NumiScan.cmd` shortcut on the desktop starts the dev server and opens the browser automatically

### Changed
- `fetchCoins` now tracks loading state (`isLoading`); tab content hidden during initial fetch
- Analytics grid for physical stats uses 3-column layout matching the existing stat widgets

---

### Додано
- **Індикатор завантаження** — анімований спінер з іконкою монети відображається при першому запуску, поки дані завантажуються з бази; всі вкладки заблоковані до завершення
- **Фізичні параметри колекції** — три нові картки на вкладці Статистика: загальна вага (г / кг), висота стопки монет (мм / см / м), довжина монет у ряд (мм / см / м); у підписі — кількість монет з даними
- **Ярлик запуску** — файл `NumiScan.cmd` на робочому столі запускає сервер і відкриває браузер

### Змінено
- `fetchCoins` відстежує стан `isLoading`; вміст вкладок приховується під час першого завантаження
- Сітка фізичних параметрів у Статистиці — 3 колонки

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

### Додано
- **Інтеграція OpenAI** — розпізнавання монет тепер підтримує GPT-4o, GPT-4.1, GPT-5.x та o4-mini поряд із Gemini; провайдер визначається автоматично за префіксом моделі (`gpt-`/`o[n]`)
- **OpenAI Structured Outputs** — використовується режим `json_schema` з `strict: true` для гарантованої структури відповіді (аналог Gemini `responseSchema`)
- **Моделі GPT-5.x** — додано gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano до вибору моделей на сторінці Сервісів
- **Favicon** — SVG-іконка у вигляді монети з гранованим каменем; золоте кільце, темне поле, відблиски; мета-теги `theme-color` та `description` додано до index.html
- **Історичний прапор Лівії** — компонент `CountryFlag` приймає необов'язковий параметр `year`; монети 1969–2011 рр. відображають суцільно зелений прапор епохи Каддафі замість поточного
- **Вибір моделі Gemini** — сторінка Сервісів завантажує актуальний список мультимодальних моделей через API; можна закріпити до 6 моделей (було 4) для швидкого доступу на вкладці Розпізнавання
- **Закріплені моделі** — кнопки Gemini та OpenAI на вкладці Розпізнавання; OpenAI підсвічується зеленим, Gemini — золотим
- **Покращення промптів** — системний промпт тепер посилається на NGC, PCGS, Krause Standard Catalog; промпт для двох фото перелічує всі візуальні підказки (номінал, портрет, герб, мітка МД, мова напису, гурт); промпт уточнення явно вказує перерахувати всі залежні поля

### Змінено
- Дефолтний список закріплених моделей скорочено з 4 до 3, щоб залишити місце для OpenAI
- Ліміт закріплених моделей підвищено з 4 до 6
- `CollectionAnalytics` передає рік монети в `CountryFlag` для коректного відображення історичного прапора
- `CoinDatabase` передає `coin.year` до `CountryFlag` у списку та детальній панелі

### Технічне
- Додано npm-залежність `openai` (Structured Outputs API)
- Спільні хелпери `buildCoinSystemPrompt` / `buildCoinUserPrompt` використовуються обома гілками (Gemini та OpenAI)
- `OPENAI_API_KEY` задокументовано у `.env.example`

---

## [1.3.0] — 2026-06-06

### Added
- **PDF export** — server-side PDF catalog generation via PDFKit; white rounded cards with AV/RV coin images (r=36pt), 2-column data grid, dark price button; 3 columns × N rows per A4 page
- **Gemini model list endpoint** — `/api/gemini-models` fetches and filters multimodal-only models using `ai.models.list()` (AsyncIterable pager)
- **Known RPD badges** — hardcoded free-tier request-per-day limits for popular Gemini models displayed on the Services page
- **Image cache busting** — coin images served with `Cache-Control: immutable`; cache key invalidated on update
- **Edit form race condition fix** in CoinDatabase

### Додано
- **Експорт PDF** — серверна генерація PDF-каталогу через PDFKit; білі картки з заокругленими кутами з фото АВ/РВ (r=36pt), двоколонкова сітка даних, темна кнопка ціни; 3 колонки × N рядків на аркуш A4
- **Ендпоінт списку моделей Gemini** — `/api/gemini-models` отримує та фільтрує мультимодальні моделі через `ai.models.list()` (AsyncIterable pager)
- **Бейджі RPD** — відомі ліміти безкоштовного тіра (запитів/день) для популярних Gemini-моделей на сторінці Сервісів
- **Кешування зображень** — зображення монет роздаються з `Cache-Control: immutable`; ключ кешу оновлюється при зміні
- **Виправлення race condition** у формі редагування CoinDatabase

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

### Додано
- **Синхронізація з Numista** — фонова синхронізація через SSE з Numista API v3; заповнює вагу, діаметр, товщину, гурт та тираж для наявних монет
- **Пакетне заповнення через Gemini** — ендпоінт `/api/batch-mintage` оновлює тираж/товщину/гурт через текстову модель Gemini порціями по 30 монет
- **Сортування `vis_id`** — перетягування для зміни порядку з постійним полем `vis_id` у SQLite
- **Фільтр за країною** — фільтрація каталогу за країною з карти аналітики або списку країн
- **Поля товщина / гурт** — нові атрибути монети з українськомовним словником типів гурту
- **Інсталятор для Windows** — `install.bat` / `install.ps1` для швидкого встановлення
- **Система оновлення** — `update.bat` / `update.ps1`; хеш версії git відображається в заголовку ServicePage

---

## [1.1.0] — 2026-05-15

### Added
- **World map** — interactive SVG map (react-simple-maps) with geodata bundled locally; Crimea assigned to Ukraine per internationally recognized borders
- **Full world country flags** — 200+ country mappings (ISO codes → flagcdn.com images + emoji fallback); historical codes for USSR, DDR, Yugoslavia
- **Duplicate detection** — warns when a recognized coin already exists in the catalog
- **Lightbox** — full-screen image viewer with keyboard navigation (←/→/Esc) and hotkey changes
- **Collection analytics** — charts for country distribution, metal composition, rarity breakdown, timeline, value range

### Додано
- **Карта світу** — інтерактивна SVG-карта (react-simple-maps) з локально збереженими геоданими; Крим позначено як територію України відповідно до міжнародно визнаних кордонів
- **Прапори всіх країн світу** — 200+ відповідностей (ISO-коди → зображення flagcdn.com + emoji як резерв); підтримка історичних кодів СРСР, НДР, Югославії
- **Виявлення дублікатів** — попередження якщо розпізнана монета вже є в каталозі
- **Лайтбокс** — повноекранний перегляд зображень із навігацією клавіатурою (←/→/Esc)
- **Аналітика колекції** — графіки розподілу за країнами, металами, рідкістю, часовою шкалою та діапазоном вартості

---

## [1.0.0] — 2026-05-01

### Initial release
- Express + Vite full-stack architecture; SQLite via `sqlite3`; React 19 + Tailwind CSS v4
- AI coin recognition via Google Gemini (multimodal, structured JSON output)
- Coin catalog: add, edit, delete, reorder; obverse/reverse image storage as base64 in SQLite
- REST API: `/api/coins`, `/api/recognize-coin`, `/api/export/pdf`
- Apache 2.0 license; authored by Andrii (ATR) Tarasenko

### Початковий реліз
- Повностекова архітектура Express + Vite; SQLite через `sqlite3`; React 19 + Tailwind CSS v4
- AI-розпізнавання монет через Google Gemini (мультимодальний, структурований JSON)
- Каталог монет: додавання, редагування, видалення, сортування; зображення АВ/РВ зберігаються як base64 у SQLite
- REST API: `/api/coins`, `/api/recognize-coin`, `/api/export/pdf`
- Ліцензія Apache 2.0; автор — Андрій (ATR) Тарасенко
