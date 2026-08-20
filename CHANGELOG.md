# Changelog — ATR NumiScan AI (GemCoin)

All notable changes to this project are documented here.

---

## [Unreleased]

### Added
- **Numista quota tracking** — live counter/warning banner for the plan's 2000 requests/calendar-month limit, backed by a new `/api/numista-quota` endpoint
- **Numista sync log split into two columns** — coin list (unchanged) alongside a request/result detail log showing the search query, resolved issuer code, matched Numista type, and outcome (updated / no change / not found / error)
- **New sort preset "Country + denomination + year"** — groups a country's coins by denomination first, then by year within each denomination; denomination comparison is now numeric-aware so "10" no longer sorts before "2"
- **Historical SVG flags** for coins minted under defunct states — 18 bundled flags (USSR, Third Reich, Austria-Hungary, Rhodesia across its three eras, Federation of Malaya, Ceylon, United Arab Republic, Zaire, Mongolian People's Republic, Artsakh, Somaliland, and more) instead of falling back to a modern successor state's flag or a generic emoji; sourced from Wikimedia Commons, licenses documented in `docs/FLAG_ATTRIBUTIONS.md`

### Changed
- **Numista search query** now built from the bare denomination number + year instead of a translated currency name, avoiding mistranslation mismatches (e.g. Ethiopia's "santim" → "centimes"); issuer/country is resolved via Numista's own `/issuers` list instead of a guessed slug
- Starting a new Numista sync now cancels any previous run still looping in the background instead of stacking concurrent runs against the same monthly quota

### Fixed
- **Numista sync kept running after disconnect** — the server-side loop had no way to detect the client stopping (Stop button, page navigation) and would keep burning API quota in the background, invisibly; now aborts via `req.on("close")` plus a single-active-run guard
- **Coin detail/edit modal briefly showed "image missing"** while the full per-coin fetch was still in flight; now falls back to the same fast per-side image endpoint the catalog grid and lightbox already use, instead of waiting on the raw base64 payload
- **Taiwan / Republic of China coins showed mainland China's flag** — "Китайська Республіка" matched the generic China check before the Taiwan-specific one
- **First coin-list load was slow** after repeated forced server restarts left SQLite's WAL file growing unbounded (observed ~1 GB); now checkpointed on every startup

### Technical
- New `app_settings` key-value table for persisting the Numista quota counter across restarts
- New `src/utils/historicalFlags.ts` module, checked first in `CountryFlag` before the modern ISO-code/emoji lookup

### Додано
- **Відстеження квоти Numista** — лічильник і попередження про ліміт плану (2000 запитів/календарний місяць), новий ендпоінт `/api/numista-quota`
- **Лог синхронізації з Numista розділено на дві колонки** — список монет (без змін) поряд з деталями запиту/результату: пошуковий запит, визначений код країни, знайдений тип Numista, результат (оновлено / без змін / не знайдено / помилка)
- **Новий вид сортування «Країна + номінал + рік»** — групує монети країни спершу за номіналом, потім за роком усередині номіналу; порівняння номіналу тепер числове, тому «10» більше не сортується перед «2»
- **Історичні SVG-прапори** для монет зниклих держав — 18 вбудованих прапорів (СРСР, Третій Рейх, Австро-Угорщина, Родезія в трьох епохах, Федерація Малайя, Цейлон, Об'єднана Арабська Республіка, Заїр, Монгольська Народна Республіка, Нагірно-Карабаська Республіка, Сомаліленд та інші) замість прапора сучасної країни-наступниці чи узагальненого emoji; джерело — Wikimedia Commons, ліцензії задокументовано в `docs/FLAG_ATTRIBUTIONS.md`

### Змінено
- **Пошуковий запит до Numista** тепер будується з голого числа номіналу + року замість перекладеної назви валюти — уникає помилок перекладу (напр. ефіопський «santim» → «centimes»); країна/емітент визначається через власний список `/issuers` Numista замість вгаданого слага
- Запуск нової синхронізації з Numista тепер скасовує попередній цикл, що ще міг працювати у фоні, замість накопичення паралельних циклів на одній квоті

### Виправлено
- **Синхронізація з Numista продовжувала працювати після відключення** — серверний цикл не мав способу дізнатись про відключення клієнта (кнопка «Зупинити», перехід на іншу сторінку) і непомітно витрачав квоту API далі; тепер зупиняється через `req.on("close")` і захист «лише один активний запуск»
- **Картка/форма редагування монети на кілька секунд показувала «зображення відсутнє»**, поки фонове довантаження повних даних монети ще тривало; тепер використовує той самий швидкий URL-ендпоінт зображення, що й каталог і лайтбокс, замість очікування на base64-дані
- **Монети Тайваню/Китайської Республіки показували прапор материкового Китаю** — рядок «Китайська Республіка» ловився загальною перевіркою Китаю раніше за перевірку Тайваню
- **Перше завантаження списку монет ставало повільним** після кількох примусових перезапусків сервера, які лишали WAL-файл SQLite необмежено зростати (спостерігався ~1 ГБ); тепер стискається при кожному старті сервера

### Технічне
- Нова таблиця `app_settings` (ключ-значення) для збереження лічильника квоти Numista між перезапусками
- Новий модуль `src/utils/historicalFlags.ts`, перевіряється першим у `CountryFlag` до звичайного ISO-коду/emoji

---

## [1.4.0] — 2026-07-27

### Added
- **OpenAI integration** — coin recognition now supports GPT-4o, GPT-4.1, GPT-5.x and o4-mini alongside Gemini; provider auto-detected by model prefix (`gpt-`/`o[n]`)
- **OpenAI Structured Outputs** — uses `json_schema` mode with `strict: true` for reliable field extraction (same guarantee as Gemini `responseSchema`)
- **GPT-5.x models** — added gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano to the model picker on the Services page
- **Favicon** — SVG coin with faceted gem design; gold ring, dark inner field, specular highlights; `theme-color` and `description` meta tags added to index.html
- **Libya historical flag** — `CountryFlag` component accepts optional `year` prop; coins minted 1969–2011 display the Gaddafi-era solid green flag instead of the current national flag
- **Gemini model picker** — Services page fetches available multimodal Gemini models from API; users can pin up to 6 models (raised from 4) for quick access on the Recognition tab
- **Pinned models** — mixed Gemini + OpenAI model buttons on the Recognition tab; OpenAI models highlighted in green, Gemini in gold
- **Recognition prompt improvements** — system prompt now references NGC, PCGS, Krause Standard Catalog; user prompt for dual-image mode lists all visual cues (denomination, portrait, emblem, mint mark, inscription script, edge); refinement prompt explicitly instructs re-deriving all dependent fields
- **Loading indicator** — animated spinner with coin logo shown on first app load while coins are being fetched from the database; all tabs blocked until data is ready
- **Collection physical stats** — three new fun metric cards in Analytics: total weight (g / kg), total stack height from coin thickness (mm / cm / m), and total row length from diameter (mm / cm / m); each card shows how many coins contributed data
- **Desktop launcher** — `NumiScan.cmd` shortcut on the desktop starts the dev server and opens the browser automatically
- **Ollama custom model entry** — manual input field on the Services page lets users add any Ollama model name (e.g. `minimax-m3:cloud`) that `/api/tags` does not return; custom models persist in `localStorage`, appear with a "custom" badge, and can be individually removed
- **LM Studio support** — Services page now includes an LM Studio section with URL config, model list fetched from `/v1/models`, pin/unpin, and the same custom model input field
- **World map click → country filter** — clicking a highlighted country on the WorldMap choropleth now sets the country filter in the Catalog; `WorldMap` accepts an `onCountryClick` callback; `CollectionAnalytics` passes it through; `CoinDatabase` resolves ISO codes to Ukrainian country names using `getCountryIsoCode`
- **Coin ID in detail card header** — full coin ID displayed in tiny monospace text next to the card title; click to copy to clipboard; hidden in edit mode
- **Lightbox keyboard & swipe navigation**:
  - **Enter** (catalog lightbox) → opens coin detail card; closing the card returns to the same lightbox position
  - **Esc** closes the detail card (dedicated `useEffect` with `zoomedImageRef` to avoid closing when lightbox is open)
  - **Touch swipe** — vertical swipe navigates between coins (↑ = next, ↓ = prev); horizontal swipe toggles obverse/reverse; 50 px threshold
- **`fromCatalog` preserved** — arrow-key and scroll-wheel navigation between coins in the lightbox now carries the `fromCatalog` flag forward so Enter-to-card and hint text stay correct
- **Continent completion stats** — new block under the world map in Analytics shows, per continent, how many of its countries are present in the collection (`collected / total · %`) with gold progress bars; powered by a new `CONTINENTS` registry in `countryUtils.ts` (sovereign countries per UN geoscheme + Kosovo/Taiwan/Vatican; Russia → Europe, Turkey/Caucasus/Kazakhstan → Asia); historical entities (USSR, GDR, Yugoslavia) and territories (Hong Kong, Gibraltar, …) intentionally count toward neither numerator nor denominator
- **Timeline fun-fact chips** — 🏆 record day (count + date), ⚡ average pace (coins/day since first addition), 🔥 current streak of consecutive days with additions (plus best streak)
- **Cumulative growth chart** — gold SVG area chart of collection size over the entire collecting history (daily granularity); interactive crosshair with tooltip (date, total, added that day) on mouse hover and touch
- **Period total** — the additions bar chart header now shows the window sum (e.g. "Додано за останні 14 днів: +207 шт"); per-bar tooltip includes the running collection size
- **Macau mapping** — "Макао"/"Macau" now resolves to `mo` / 🇲🇴
- **AI data verification in coin card** — new panel in the detail card runs a fresh recognition of the stored photos with a user-selected model (defaults to a *different* model than the one that recognized the coin — independent second opinion, no anchoring) and programmatically diffs 12 structured fields (title, denomination, country, year, metal, weight, diameter, thickness, edge, mintage, rarity, grade); discrepancies are listed as `current → proposed` with checkboxes, "Apply selected" fills the edit form — final save stays with the user; full match shows a green confirmation
- **`recognizedBy` column** — every newly recognized coin stores the AI model id that produced its data (shown in the verification panel); editing an old card never wipes the value (UPSERT keeps existing on empty)

### Changed
- Default pinned models reduced from 4 to 3 to leave room for OpenAI models out of the box
- Pin limit raised from 4 to 6
- `CollectionAnalytics` passes representative coin year to `CountryFlag` for correct historical flag display
- `CoinDatabase` passes `coin.year` to `CountryFlag` in both list and detail views
- `fetchCoins` now tracks loading state (`isLoading`); tab content hidden during initial fetch
- Analytics grid for physical stats uses 3-column layout matching the existing stat widgets
- Detail card header now shows the coin ID instead of a separate copy button
- Lightbox hint text updated: `"← → свайп — аверс/реверс · ↑↓ ↕ свайп — монета · Enter — картка · Esc закрити"`

### Technical
- Added `openai` npm dependency (Structured Outputs API)
- Shared `buildCoinSystemPrompt` / `buildCoinUserPrompt` helpers used by both Gemini and OpenAI paths
- `OPENAI_API_KEY` documented in `.env.example`

### Fixed
- **Czech Republic flag** — "Чеська Республіка" (adjective form "чеськ") now correctly resolves to `🇨🇿`; both `getCountryIsoCode` and the emoji helper updated
- **Detail card scroll** — eliminated unwanted scrollbar: reduced padding (`p-6` → `px-5 py-3`), image heights (`h-56` → `h-40`), merged two date rows into one line, hidden notes block when empty and not editing, compact footer
- **Days tab showed oldest additions** — daily registry keys were built in coin iteration order (API returns newest first), so `.slice(-7)` picked the *oldest* seven days; timeline now aggregates by real local dates, sorts chronologically, and fills gaps with zero-days (last 14 days / 12 months / up to 6 years)
- **Day key collision across years** — labels like "12 лип." no longer merge the same day of different years
- **Dateless coins inflated today** — coins without a parseable `createdAt`/`recognizedAt` were counted as added "now"; they are excluded from per-period bars and counted once in the cumulative base
- **Libya not recognized** — Ukrainian nominative "Лівія" failed the `лівій` root check, so Libya was missing from the map and continent stats; fixed via `startsWith("лівія")` (Bolivia is unaffected — its check runs earlier)
- **Jordan misdetected as Denmark** — the substring "данія" inside "йорданія" made Jordan resolve to the Danish flag/ISO code; Denmark's check now excludes any string mentioning "йордан"
- **Papua New Guinea misdetected as Guinea** — same substring issue ("гвіне"/"guinea" inside "папуа нова гвінея"); Guinea's check now excludes strings mentioning "папуа"/"papua"
- **Costa Rica spelling variant not recognized** — stored data used the "Коста-Рика" spelling (vs. expected "Коста-Ріка"); both variants now match
- **Bahamas / Aruba missing** — no ISO/flag mapping existed for "Багами" (→ `bs` 🇧🇸) or "Аруба" (→ `aw` 🇦🇼); added

### Додано
- **Інтеграція OpenAI** — розпізнавання монет тепер підтримує GPT-4o, GPT-4.1, GPT-5.x та o4-mini поряд із Gemini; провайдер визначається автоматично за префіксом моделі (`gpt-`/`o[n]`)
- **OpenAI Structured Outputs** — використовується режим `json_schema` з `strict: true` для гарантованої структури відповіді (аналог Gemini `responseSchema`)
- **Моделі GPT-5.x** — додано gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano до вибору моделей на сторінці Сервісів
- **Favicon** — SVG-іконка у вигляді монети з гранованим каменем; золоте кільце, темне поле, відблиски; мета-теги `theme-color` та `description` додано до index.html
- **Історичний прапор Лівії** — компонент `CountryFlag` приймає необов'язковий параметр `year`; монети 1969–2011 рр. відображають суцільно зелений прапор епохи Каддафі замість поточного
- **Вибір моделі Gemini** — сторінка Сервісів завантажує актуальний список мультимодальних моделей через API; можна закріпити до 6 моделей (було 4) для швидкого доступу на вкладці Розпізнавання
- **Закріплені моделі** — кнопки Gemini та OpenAI на вкладці Розпізнавання; OpenAI підсвічується зеленим, Gemini — золотим
- **Покращення промптів** — системний промпт тепер посилається на NGC, PCGS, Krause Standard Catalog; промпт для двох фото перелічує всі візуальні підказки (номінал, портрет, герб, мітка МД, мова напису, гурт); промпт уточнення явно вказує перерахувати всі залежні поля
- **Індикатор завантаження** — анімований спінер з іконкою монети відображається при першому запуску, поки дані завантажуються з бази; всі вкладки заблоковані до завершення
- **Фізичні параметри колекції** — три нові картки на вкладці Статистика: загальна вага (г / кг), висота стопки монет (мм / см / м), довжина монет у ряд (мм / см / м); у підписі — кількість монет з даними
- **Ярлик запуску** — файл `NumiScan.cmd` на робочому столі запускає сервер і відкриває браузер
- **Ручне введення моделі Ollama** — поле вводу на сторінці Сервісів дозволяє додати будь-яку назву моделі Ollama (наприклад `minimax-m3:cloud`), яка не відображається у `/api/tags`; кастомні моделі зберігаються в `localStorage`, позначаються бейджем "custom" і видаляються кнопкою ×
- **Підтримка LM Studio** — сторінка Сервісів тепер включає секцію LM Studio з налаштуванням URL, завантаженням моделей із `/v1/models`, закріпленням і полем введення кастомних моделей
- **Клік по карті → фільтр** — клік по забарвленій країні на хороплет-карті встановлює фільтр країни в Каталозі; `WorldMap` отримує callback `onCountryClick`; `CoinDatabase` резолвить ISO-коди до українських назв через `getCountryIsoCode`
- **ID монети в заголовку картки** — повний ID відображається дрібним моноширинним шрифтом поряд з назвою; клік копіює в буфер; приховується в режимі редагування
- **Навігація в лайтбоксі клавіатурою та свайпом**:
  - **Enter** (лайтбокс з каталогу) → відкриває картку монети; закриття картки повертає до лайтбоксу
  - **Esc** закриває картку монети (окремий `useEffect` з `zoomedImageRef`)
  - **Touch-свайп** — вертикальний свайп (поріг 50 пк) перемикає монети; горизонтальний — аверс/реверс
- **Збереження `fromCatalog`** — навігація стрілками та колесом миші між монетами тепер зберігає прапор `fromCatalog`
- **Заповнення по континентах** — новий блок під картою світу в Аналітиці: для кожного континенту кількість країн у колекції із загальної (`зібрано / всього · %`) з золотими прогрес-барами; базується на новому довіднику `CONTINENTS` у `countryUtils.ts` (суверенні країни за геосхемою ООН + Косово/Тайвань/Ватикан; Росія → Європа, Туреччина/Кавказ/Казахстан → Азія); історичні утворення (СРСР, НДР, Югославія) та території (Гонконг, Гібралтар, …) свідомо не враховуються ані в чисельнику, ані в знаменнику
- **Метрики-факти таймлайну** — 🏆 рекордний день (кількість + дата), ⚡ середній темп (монет/день з першого додавання), 🔥 поточна серія днів поспіль з додаваннями (та рекордна серія)
- **Графік зростання колекції** — золота SVG area-діаграма розміру колекції за всю історію збирання (по днях); інтерактивне перехрестя з тултіпом (дата, всього, додано за день) при наведенні миші та дотику
- **Сума за період** — заголовок бар-чарту показує підсумок вікна (напр. «Додано за останні 14 днів: +207 шт»); підказка стовпчика містить розмір колекції на той момент
- **Маппінг Макао** — «Макао»/"Macau" тепер резолвиться до `mo` / 🇲🇴
- **AI-перевірка даних у картці монети** — нова панель у картці запускає свіже розпізнавання збережених фото обраною моделлю (за замовчуванням — *іншою*, ніж та, що розпізнавала: незалежна друга думка без ефекту якоря) і програмно порівнює 12 структурованих полів (назва, номінал, країна, рік, метал, вага, діаметр, товщина, гурт, тираж, рідкість, грейд); розбіжності показуються як `поточне → запропоноване` з чекбоксами, «Застосувати вибрані» підставляє значення у форму редагування — фінальне збереження за користувачем; повний збіг — зелене підтвердження
- **Колонка `recognizedBy`** — кожна нова монета зберігає ID моделі, що розпізнала її дані (видно в панелі перевірки); редагування старої картки не затирає значення (UPSERT зберігає наявне при порожньому)

### Змінено
- Дефолтний список закріплених моделей скорочено з 4 до 3, щоб залишити місце для OpenAI
- Ліміт закріплених моделей підвищено з 4 до 6
- `CollectionAnalytics` передає рік монети в `CountryFlag` для коректного відображення історичного прапора
- `CoinDatabase` передає `coin.year` до `CountryFlag` у списку та детальній панелі
- `fetchCoins` відстежує стан `isLoading`; вміст вкладок приховується під час першого завантаження
- Сітка фізичних параметрів у Статистиці — 3 колонки
- Заголовок картки монети тепер показує ID замість окремої кнопки копіювання
- Підказка лайтбоксу оновлена: `"← → свайп — аверс/реверс · ↑↓ ↕ свайп — монета · Enter — картка · Esc закрити"`

### Технічне
- Додано npm-залежність `openai` (Structured Outputs API)
- Спільні хелпери `buildCoinSystemPrompt` / `buildCoinUserPrompt` використовуються обома гілками (Gemini та OpenAI)
- `OPENAI_API_KEY` задокументовано у `.env.example`

### Виправлено
- **Прапор Чехії** — "Чеська Республіка" (форма "чеськ") тепер коректно резолвиться до `🇨🇿`
- **Скрол у картці монети** — усунено небажану смугу прокрутки: зменшено відступи, висоти зображень, об'єднано рядки дат, нотатки приховані коли порожні і не в режимі редагування
- **Вкладка «По днях» показувала найстаріші додавання** — ключі днів створювалися в порядку ітерації монет (API віддає найновіші першими), тому `.slice(-7)` брав *найстаріші* сім днів; тепер агрегація за реальними локальними датами, хронологічне сортування та заповнення порожніх днів нулями (останні 14 днів / 12 місяців / до 6 років)
- **Колізія ключів днів між роками** — мітки на кшталт «12 лип.» більше не об'єднують однакові дні різних років
- **Монети без дати завищували сьогодні** — монети без коректної `createdAt`/`recognizedAt` рахувалися як додані «зараз»; тепер вони виключені зі стовпчиків і враховані один раз у базі накопичення
- **Лівія не розпізнавалася** — українська назва «Лівія» не проходила перевірку за коренем «лівій», тому Лівія не потрапляла на карту та в статистику континентів; виправлено через `startsWith("лівія")` (Болівія не зачеплена — її перевірка спрацьовує раніше)
- **Йорданія розпізнавалася як Данія** — підрядок «данія» всередині «йорданія» призводив до прапора/коду Данії; перевірка Данії тепер виключає рядки зі згадкою «йордан»
- **Папуа Нова Гвінея розпізнавалася як Гвінея** — та сама проблема з підрядком («гвіне»/«guinea» всередині «папуа нова гвінея»); перевірка Гвінеї тепер виключає рядки зі згадкою «папуа»/«papua»
- **Не розпізнавався варіант написання Коста-Рики** — у збережених даних використано написання «Коста-Рика» (замість очікуваного «Коста-Ріка»); тепер приймаються обидва варіанти
- **Відсутні Багами / Аруба** — не було ISO/прапор-мапінгу для «Багами» (→ `bs` 🇧🇸) та «Аруба» (→ `aw` 🇦🇼); додано

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
