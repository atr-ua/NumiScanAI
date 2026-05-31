/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

/**
 * Maps country names (in Ukrainian or English) to their respective 2-letter ISO codes.
 */
export const getCountryIsoCode = (country: string): string | null => {
  const lower = (country || "").toLowerCase().trim();
  if (!lower) return null;

  // ── Ukraine & major Western ───────────────────────────────────────────────
  if (lower.includes("укра") || lower.includes("ukra")) return "ua";
  if (lower.includes("фін") || lower.includes("fin")) return "fi";
  if (lower.includes("сша") || lower.includes("usa") || lower.includes("united states") || lower.includes("america")) return "us";

  // German historical (must precede modern Germany)
  if (lower.includes("кайзер") || lower.includes("kaiserreich") || lower.includes("german empire") || lower.includes("нім. імпер") || lower.includes("германська імп") || lower.includes("німецька імпер")) return "de";
  if (lower.includes("третій рейх") || lower.includes("third reich") || lower.includes("нацистська нім") || lower.includes("nazi germ") || lower.includes("deutsches reich")) return "de";
  if (lower === "ндр" || lower.includes("ddr") || lower.includes("east germ") || lower.includes("німецька демократична") || lower.includes("нім. демокр")) return "dd";
  if (lower.includes("німеч") || lower.includes("germany") || lower.includes("deutsch")) return "de";

  if (lower.includes("поль") || lower.includes("poland") || lower.includes("polska")) return "pl";
  if (lower.includes("велик") || lower.includes("брита") || lower.includes("uk") || lower.includes("united kingdom") || lower.includes("англі")) return "gb";
  if (lower.includes("фран") || lower.includes("france")) return "fr";
  if (lower.includes("італ") || lower.includes("italy")) return "it";
  if (lower.includes("ісп") || lower.includes("spain") || lower.includes("esp")) return "es";
  if (lower.includes("кана") || lower.includes("canada")) return "ca";
  if (lower.includes("росі") || lower.includes("russia")) return "ru";

  // Historical supranational
  if (lower.includes("срср") || lower.includes("ussr") || lower.includes("радян") || lower.includes("ссср") || lower.includes("soviet")) return "su";
  if (lower.includes("югос") || lower.includes("yugos")) return "yu";
  if (lower.includes("євро") || lower.includes("euro")) return "eu";

  // ── Western & Southern Europe ─────────────────────────────────────────────
  if (lower.includes("австрал") || lower.includes("australia")) return "au";
  if (lower.includes("австрі") || lower.includes("austria")) return "at";
  if (lower.includes("швейц") || lower.includes("switzerland") || lower.includes("helvetia")) return "ch";
  if (lower.includes("бельг") || lower.includes("belg")) return "be";
  if (lower.includes("нідер") || lower.includes("nether") || lower.includes("holland") || lower.includes("голланд")) return "nl";
  if (lower.includes("кюрасао") || lower.includes("curacao") || lower.includes("curaçao")) return "cw";
  if (lower.includes("португ") || lower.includes("portug")) return "pt";
  if (lower.includes("ірлан") || lower.includes("irelan")) return "ie";
  if (lower.includes("іслан") || lower.includes("icelan")) return "is";
  if (lower.includes("люксем") || lower.includes("luxem")) return "lu";
  if (lower.includes("мальт") || lower.includes("malta")) return "mt";
  if (lower.includes("кіпр") || lower.includes("cyprus")) return "cy";
  if (lower.includes("монак") || lower.includes("monaco")) return "mc";
  if (lower.includes("ватик") || lower.includes("vatican")) return "va";
  if (lower.includes("марин") || lower.includes("marino")) return "sm";
  if (lower.includes("андор") || lower.includes("andor")) return "ad";
  if (lower.includes("ліхтен") || lower.includes("liechten")) return "li";
  if (lower.includes("грец") || lower.includes("greec")) return "gr";
  if (lower.includes("грек") || lower.includes("greek")) return "gr";
  if (lower.includes("албан") || lower.includes("albania")) return "al";
  if (lower.includes("косов") || lower.includes("kosovo")) return "xk";

  // ── Northern Europe ───────────────────────────────────────────────────────
  if (lower.includes("швец") || lower.includes("swed") || lower.includes("швед")) return "se";
  if (lower.includes("норв") || lower.includes("norw")) return "no";
  if (lower.includes("данія") || lower.includes("denm") || lower.includes("denmark")) return "dk";
  if (lower.includes("литв") || lower.includes("lithu")) return "lt";
  if (lower.includes("латв") || lower.includes("latv")) return "lv";
  if (lower.includes("естон") || lower.includes("eston")) return "ee";

  // ── Central & Eastern Europe ──────────────────────────────────────────────
  if (lower.includes("чех") || lower.includes("czech")) return "cz";
  if (lower.includes("словач") || lower.includes("slovak")) return "sk";
  if (lower.includes("угор") || lower.includes("hungar") || lower.includes("magyar")) return "hu";
  if (lower.includes("румун") || lower.includes("romania")) return "ro";
  if (lower.includes("болг") || lower.includes("bulgar")) return "bg";
  if (lower.includes("слов") || lower.includes("sloven")) return "si";
  if (lower.includes("хорв") || lower.includes("croat")) return "hr";
  if (lower.includes("серб") || lower.includes("serbi")) return "rs";
  if (lower.includes("босн") || lower.includes("bosnia")) return "ba";
  if (lower.includes("черног") || lower.includes("monteneg") || lower.includes("чорног")) return "me";
  if (lower.includes("макед") || lower.includes("macedon")) return "mk";

  // ── Former Soviet / CIS ───────────────────────────────────────────────────
  if (lower.includes("білорус") || lower.includes("belarus")) return "by";
  if (lower.includes("казах") || lower.includes("kazakh")) return "kz";
  if (lower.includes("груз") || lower.includes("georgia")) return "ge";
  if (lower.includes("вірмен") || lower.includes("armenia")) return "am";
  if (lower.includes("азерб") || lower.includes("azerb")) return "az";
  if (lower.includes("молд") || lower.includes("moldov")) return "md";
  if (lower.includes("узбек") || lower.includes("uzbek")) return "uz";
  if (lower.includes("киргиз") || lower.includes("киргіз") || lower.includes("kyrgyz")) return "kg";
  if (lower.includes("таджик") || lower.includes("tajik")) return "tj";
  if (lower.includes("туркмен") || lower.includes("turkmen")) return "tm";

  // ── Turkey ────────────────────────────────────────────────────────────────
  if (lower.includes("тур") || lower.includes("turkey") || lower.includes("turkish")) return "tr";

  // ── East Asia ─────────────────────────────────────────────────────────────
  if (lower.includes("кита") || lower.includes("china")) return "cn";
  if (lower.includes("япон") || lower.includes("japan")) return "jp";
  if (lower.includes("монгол") || lower.includes("mongol")) return "mn";
  if (lower.includes("кндр") || lower.includes("north korea") || lower.includes("пн. коре") || lower.includes("північ") && lower.includes("коре")) return "kp";
  if (lower.includes("тайван") || lower.includes("taiwan")) return "tw";
  if (lower.includes("коре") || lower.includes("korea")) return "kr";

  // ── Southeast Asia ────────────────────────────────────────────────────────
  if (lower.includes("сінга") || lower.includes("singap")) return "sg";
  if (lower.includes("таїл") || lower.includes("thail")) return "th";
  if (lower.includes("філіп") || lower.includes("philip")) return "ph";
  if (lower.includes("в'єт") || lower.includes("viet")) return "vn";
  if (lower.includes("індонез") || lower.includes("indonesia")) return "id";
  if (lower.includes("малайз") || lower.includes("malaysia") || lower.includes("малай") || lower.includes("malay")) return "my";
  if (lower.includes("мьянм") || lower.includes("myanmar") || lower.includes("бірм") || lower.includes("burma")) return "mm";
  if (lower.includes("камбодж") || lower.includes("cambod") || lower.includes("кхмер") || lower.includes("khmer")) return "kh";
  if (lower.includes("лаос") || lower.includes("laos")) return "la";
  if (lower.includes("бруней") || lower.includes("brunei")) return "bn";
  if (lower.includes("тимор") || lower.includes("timor")) return "tl";

  // ── South Asia ────────────────────────────────────────────────────────────
  if (lower.includes("індія") || lower.includes("india")) return "in";
  if (lower.includes("непал") || lower.includes("nepal")) return "np";
  if (lower.includes("пакист") || lower.includes("pakist")) return "pk";
  if (lower.includes("шрі-ланк") || lower.includes("sri lanka") || lower.includes("цейлон") || lower.includes("ceylon")) return "lk";
  if (lower.includes("бангладеш") || lower.includes("bangladesh")) return "bd";
  if (lower.includes("афганіст") || lower.includes("afghan")) return "af";
  if (lower.includes("бутан") || lower.includes("bhutan")) return "bt";
  if (lower.includes("мальдів") || lower.includes("maldiv")) return "mv";

  // ── Middle East ───────────────────────────────────────────────────────────
  if (lower.includes("ізраїл") || lower.includes("israel")) return "il";
  if (lower.includes("іран") || lower.includes("iran")) return "ir";
  if (lower.includes("ірак") || lower.includes("iraq")) return "iq";
  if (lower.includes("сирі") || lower.includes("syria")) return "sy";
  if (lower.includes("ліван") || lower.includes("lebanon")) return "lb";
  if (lower.includes("йордан") || lower.includes("jordan")) return "jo";
  if (lower.includes("кувейт") || lower.includes("kuwait")) return "kw";
  if (lower.includes("бахрейн") || lower.includes("bahrain")) return "bh";
  if (lower.includes("катар") || lower.includes("qatar")) return "qa";
  if (lower.includes("оман") || lower.includes("oman")) return "om";
  if (lower.includes("ємен") || lower.includes("yemen")) return "ye";
  if (lower.includes("сауд") || lower.includes("saudi")) return "sa";
  if (lower.includes("оае") || lower.includes("uae") || lower.includes("емірат") || lower.includes("emirates")) return "ae";

  // ── North Africa ──────────────────────────────────────────────────────────
  if (lower.includes("єгип") || lower.includes("egypt")) return "eg";
  if (lower.includes("марокко") || lower.includes("morocc") || lower.includes("марок")) return "ma";
  if (lower.includes("алжир") || lower.includes("algeri")) return "dz";
  if (lower.includes("туніс") || lower.includes("tunisi")) return "tn";
  if (lower.includes("лівій") || lower.includes("libya")) return "ly";
  if (lower.includes("судан") || lower.includes("sudan")) return "sd";

  // ── Sub-Saharan Africa ────────────────────────────────────────────────────
  if (lower.includes("ефіоп") || lower.includes("ethiop")) return "et";
  if (lower.includes("сомал") || lower.includes("somali")) return "so";
  if (lower.includes("еритрея") || lower.includes("eritrea")) return "er";
  if (lower.includes("джибуті") || lower.includes("djibouti")) return "dj";
  if (lower.includes("кені") || lower.includes("kenya")) return "ke";
  if (lower.includes("танзан") || lower.includes("tanzania") || lower.includes("танганьїк") || lower.includes("tanganyik")) return "tz";
  if (lower.includes("уганд") || lower.includes("uganda")) return "ug";
  if (lower.includes("руанд") || lower.includes("rwanda")) return "rw";
  if (lower.includes("бурунд") || lower.includes("burundi")) return "bi";
  if (lower.includes("нігерія") || lower.includes("nigeria")) return "ng";
  if (lower.includes("нігер") || lower === "niger") return "ne";
  if (lower.includes("мозамб") || lower.includes("mozamb")) return "mz";
  if (lower.includes("гана") || lower.includes("ghana") || lower.includes("золот берег") || lower.includes("gold coast")) return "gh";
  if (lower.includes("зімбабв") || lower.includes("zimbabw") || lower.includes("родез") || lower.includes("rhodesia")) return "zw";
  if (lower.includes("замбі") || lower.includes("zambia") || lower.includes("пн. родез") || lower.includes("north. rhod")) return "zm";
  if (lower.includes("малаві") || lower.includes("malawi") || lower.includes("ньясаленд") || lower.includes("nyasaland")) return "mw";
  if (lower.includes("африк") || lower.includes("south africa") || lower.includes("пд. африк")) return "za";
  if (lower.includes("ботсван") || lower.includes("botswana") || lower.includes("бечуаналенд") || lower.includes("bechuanaland")) return "bw";
  if (lower.includes("намібі") || lower.includes("namibia")) return "na";
  if (lower.includes("есватін") || lower.includes("eswatini") || lower.includes("свазіленд") || lower.includes("swaziland")) return "sz";
  if (lower.includes("лесото") || lower.includes("lesotho") || lower.includes("басутоленд") || lower.includes("basutoland")) return "ls";
  if (lower.includes("ангол") || lower.includes("angola")) return "ao";
  if (lower.includes("сенегал") || lower.includes("senegal")) return "sn";
  if (lower.includes("кот-д") || lower.includes("ivory coast") || lower.includes("côte d") || lower.includes("cote d")) return "ci";
  if (lower.includes("малі") || lower === "mali") return "ml";
  if (lower.includes("буркін") || lower.includes("burkina")) return "bf";
  if (lower.includes("чад") || lower === "chad") return "td";
  if (lower.includes("камерун") || lower.includes("cameroon")) return "cm";
  if (lower.includes("республіка конго") || lower.includes("republic of congo") || lower.includes("конго-браз")) return "cg";
  if (lower.includes("конго") || lower.includes("congo") || lower.includes("заїр") || lower.includes("zaire")) return "cd";
  if (lower.includes("мадагаск") || lower.includes("madagascar")) return "mg";
  if (lower.includes("ліберія") || lower.includes("liberia")) return "lr";
  if (lower.includes("екваторіальна") || lower.includes("equatorial guinea")) return "gq";
  if (lower.includes("гвінея-бісау") || lower.includes("guinea-biss") || lower.includes("guinea biss")) return "gw";
  if (lower.includes("гвіне") || lower.includes("guinea")) return "gn";
  if (lower.includes("габон") || lower.includes("gabon")) return "ga";
  if (lower.includes("того") || lower === "togo") return "tg";
  if (lower.includes("бенін") || lower.includes("benin")) return "bj";
  if (lower.includes("цар") || lower.includes("central african")) return "cf";
  if (lower.includes("комор") || lower.includes("comoro")) return "km";
  if (lower.includes("кабо-верде") || lower.includes("cape verde") || lower.includes("cabo verde")) return "cv";
  if (lower.includes("сан-томе") || lower.includes("são tomé") || lower.includes("sao tome")) return "st";
  if (lower.includes("сейшел") || lower.includes("seychel")) return "sc";
  if (lower.includes("мавритан") || lower.includes("mauritan")) return "mr";
  if (lower.includes("сьєрра-леоне") || lower.includes("sierra leone")) return "sl";
  if (lower.includes("гамбі") || lower.includes("gambia")) return "gm";
  if (lower.includes("маврик") || lower.includes("maurit")) return "mu";

  // ── Americas ──────────────────────────────────────────────────────────────
  if (lower.includes("мекс") || lower.includes("mexic")) return "mx";
  if (lower.includes("браз") || lower.includes("brazil")) return "br";
  if (lower.includes("аргент") || lower.includes("argent")) return "ar";
  if (lower.includes("чилі") || lower.includes("chile")) return "cl";
  if (lower.includes("колумб") || lower.includes("colomb")) return "co";
  if (lower.includes("перу") || lower.includes("peru")) return "pe";
  if (lower.includes("болів") || lower.includes("boliv")) return "bo";
  if (lower.includes("еквадор") || lower.includes("ecuador")) return "ec";
  if (lower.includes("парагв") || lower.includes("paragua")) return "py";
  if (lower.includes("уругвай") || lower.includes("uruguay")) return "uy";
  if (lower.includes("венес") || lower.includes("venez")) return "ve";
  if (lower.includes("куба") || lower.includes("cuba")) return "cu";
  if (lower.includes("домінікан") || lower.includes("dominican")) return "do";
  if (lower.includes("гаїті") || lower.includes("haiti")) return "ht";
  if (lower.includes("гондурас") || lower.includes("honduras")) return "hn";
  if (lower.includes("нікарагуа") || lower.includes("nicaragua")) return "ni";
  if (lower.includes("панама") || lower.includes("panama")) return "pa";
  if (lower.includes("коста-ріка") || lower.includes("коста ріка") || lower.includes("costa rica")) return "cr";
  if (lower.includes("гватемал") || lower.includes("guatemal")) return "gt";
  if (lower.includes("сальвадор") || lower.includes("el salvador")) return "sv";
  if (lower.includes("суринам") || lower.includes("surinam")) return "sr";
  if (lower.includes("гайан") || lower.includes("guyan")) return "gy";
  if (lower.includes("ямайк") || lower.includes("jamaica")) return "jm";
  if (lower.includes("тринідад") || lower.includes("trinidad")) return "tt";
  if (lower.includes("барбадос") || lower.includes("barbados")) return "bb";
  if (lower.includes("беліз") || lower.includes("belize") || lower.includes("brit. honduras") || lower.includes("брит. гондур")) return "bz";
  if (lower.includes("антигуа") || lower.includes("antigua")) return "ag";
  if (lower.includes("гренада") || lower.includes("grenada")) return "gd";
  if (lower.includes("сент-кітс") || lower.includes("saint kitts") || lower.includes("st. kitts")) return "kn";
  if (lower.includes("сент-люсія") || lower.includes("saint lucia") || lower.includes("st. lucia")) return "lc";
  if (lower.includes("сент-вінсент") || lower.includes("saint vincent")) return "vc";
  if (lower.includes("домінік") && !lower.includes("домінікан")) return "dm";
  if (lower.includes("пуерто-ріко") || lower.includes("puerto rico")) return "pr";

  // ── Oceania ───────────────────────────────────────────────────────────────
  if (lower.includes("зеланд") || lower.includes("zealand")) return "nz";
  if (lower.includes("фіджі") || lower.includes("fiji")) return "fj";
  if (lower.includes("папуа") || lower.includes("papua")) return "pg";
  if (lower.includes("соломон") || lower.includes("solomon")) return "sb";
  if (lower.includes("вануату") || lower.includes("vanuatu")) return "vu";
  if (lower.includes("самоа") || lower.includes("samoa")) return "ws";
  if (lower.includes("тонга") || lower.includes("tonga")) return "to";
  if (lower.includes("кірібаті") || lower.includes("kiribati")) return "ki";
  if (lower.includes("мікронезія") || lower.includes("micronesia")) return "fm";
  if (lower.includes("палау") || lower.includes("palau")) return "pw";
  if (lower.includes("маршалл") || lower.includes("marshall")) return "mh";
  if (lower.includes("науру") || lower.includes("nauru")) return "nr";
  if (lower.includes("тувалу") || lower.includes("tuvalu")) return "tv";

  // ── British Crown Dependencies & Overseas Territories ────────────────────
  if (lower.includes("острів мен") || lower.includes("isle of man") || lower.includes("о-в мен")) return "im";
  if (lower.includes("джерсі") || lower.includes("jersey")) return "je";
  if (lower.includes("гернсі") || lower.includes("guernsey")) return "gg";
  if (lower.includes("гібралт") || lower.includes("gibralt")) return "gi";
  if (lower.includes("гонконг") || lower.includes("hong kong") || lower.includes("гонґконг")) return "hk";
  if (lower.includes("бермуд") || lower.includes("bermud")) return "bm";
  if (lower.includes("фолкленд") || lower.includes("falkland") || lower.includes("мальвін")) return "fk";
  if (lower.includes("кайман") || lower.includes("cayman")) return "ky";
  if (lower.includes("теркс") || lower.includes("turks and caicos")) return "tc";
  if (lower.includes("брит. вірг") || lower.includes("british virgin") || lower.includes("brit. virg")) return "vg";
  if (lower.includes("монтсерат") || lower.includes("montserrat")) return "ms";
  if (lower.includes("ангілья") || lower.includes("anguilla")) return "ai";
  if (lower.includes("пітк") || lower.includes("pitcairn")) return "pn";
  if (lower.includes("острів св") || lower.includes("острова св") || lower.includes("saint helena") || lower.includes("єлени") || lower.includes("st. helena")) return "sh";

  // ── Ancient / classical civilisations ────────────────────────────────────
  if (lower.includes("рим") || lower.includes("roman") || lower.includes("антич") || lower.includes("ancient") || lower.includes("візант") || lower.includes("byzant") || lower.includes("визант")) return "ancient";

  return null;
};

/**
 * Maps country names (in Ukrainian or English) to their respective flag emojis.
 * Supports historical regions, multi-lingual variants, and broad matching.
 */
export const getCountryFlag = (country: string): string => {
  const lower = (country || "").toLowerCase().trim();
  if (!lower) return "🌐";

  // ── Ukraine & major Western ───────────────────────────────────────────────
  if (lower.includes("укра") || lower.includes("ukra")) return "🇺🇦";
  if (lower.includes("фін") || lower.includes("fin")) return "🇫🇮";
  if (lower.includes("сша") || lower.includes("usa") || lower.includes("united states") || lower.includes("america")) return "🇺🇸";

  // German historical
  if (lower.includes("кайзер") || lower.includes("kaiserreich") || lower.includes("german empire") || lower.includes("нім. імпер") || lower.includes("германська імп") || lower.includes("німецька імпер")) return "🇩🇪";
  if (lower.includes("третій рейх") || lower.includes("third reich") || lower.includes("нацистська нім") || lower.includes("nazi germ") || lower.includes("deutsches reich")) return "🇩🇪";
  if (lower === "ндр" || lower.includes("ddr") || lower.includes("east germ") || lower.includes("німецька демократична") || lower.includes("нім. демокр")) return "🚩";
  if (lower.includes("німеч") || lower.includes("germany") || lower.includes("deutsch")) return "🇩🇪";

  if (lower.includes("поль") || lower.includes("poland") || lower.includes("polska")) return "🇵🇱";
  if (lower.includes("велик") || lower.includes("брита") || lower.includes("uk") || lower.includes("united kingdom") || lower.includes("англі")) return "🇬🇧";
  if (lower.includes("фран") || lower.includes("france")) return "🇫🇷";
  if (lower.includes("італ") || lower.includes("italy")) return "🇮🇹";
  if (lower.includes("ісп") || lower.includes("spain") || lower.includes("esp")) return "🇪🇸";
  if (lower.includes("кана") || lower.includes("canada")) return "🇨🇦";
  if (lower.includes("росі") || lower.includes("russia")) return "🇷🇺";

  // Historical supranational
  if (lower.includes("срср") || lower.includes("ussr") || lower.includes("радян") || lower.includes("ссср") || lower.includes("soviet")) return "🚩";
  if (lower.includes("югос") || lower.includes("yugos")) return "🚩";
  if (lower.includes("євро") || lower.includes("euro")) return "🇪🇺";

  // ── Western & Southern Europe ─────────────────────────────────────────────
  if (lower.includes("австрал") || lower.includes("australia")) return "🇦🇺";
  if (lower.includes("австрі") || lower.includes("austria")) return "🇦🇹";
  if (lower.includes("швейц") || lower.includes("switzerland") || lower.includes("helvetia")) return "🇨🇭";
  if (lower.includes("бельг") || lower.includes("belg")) return "🇧🇪";
  if (lower.includes("нідер") || lower.includes("nether") || lower.includes("holland") || lower.includes("голланд")) return "🇳🇱";
  if (lower.includes("кюрасао") || lower.includes("curacao") || lower.includes("curaçao")) return "🇨🇼";
  if (lower.includes("португ") || lower.includes("portug")) return "🇵🇹";
  if (lower.includes("ірлан") || lower.includes("irelan")) return "🇮🇪";
  if (lower.includes("іслан") || lower.includes("icelan")) return "🇮🇸";
  if (lower.includes("люксем") || lower.includes("luxem")) return "🇱🇺";
  if (lower.includes("мальт") || lower.includes("malta")) return "🇲🇹";
  if (lower.includes("кіпр") || lower.includes("cyprus")) return "🇨🇾";
  if (lower.includes("монак") || lower.includes("monaco")) return "🇲🇨";
  if (lower.includes("ватик") || lower.includes("vatican")) return "🇻🇦";
  if (lower.includes("марин") || lower.includes("marino")) return "🇸🇲";
  if (lower.includes("андор") || lower.includes("andor")) return "🇦🇩";
  if (lower.includes("ліхтен") || lower.includes("liechten")) return "🇱🇮";
  if (lower.includes("грец") || lower.includes("greec")) return "🇬🇷";
  if (lower.includes("грек") || lower.includes("greek")) return "🇬🇷";
  if (lower.includes("албан") || lower.includes("albania")) return "🇦🇱";
  if (lower.includes("косов") || lower.includes("kosovo")) return "🇽🇰";

  // ── Northern Europe ───────────────────────────────────────────────────────
  if (lower.includes("швец") || lower.includes("swed") || lower.includes("швед")) return "🇸🇪";
  if (lower.includes("норв") || lower.includes("norw")) return "🇳🇴";
  if (lower.includes("данія") || lower.includes("denm") || lower.includes("denmark")) return "🇩🇰";
  if (lower.includes("литв") || lower.includes("lithu")) return "🇱🇹";
  if (lower.includes("латв") || lower.includes("latv")) return "🇱🇻";
  if (lower.includes("естон") || lower.includes("eston")) return "🇪🇪";

  // ── Central & Eastern Europe ──────────────────────────────────────────────
  if (lower.includes("чех") || lower.includes("czech")) return "🇨🇿";
  if (lower.includes("словач") || lower.includes("slovak")) return "🇸🇰";
  if (lower.includes("угор") || lower.includes("hungar") || lower.includes("magyar")) return "🇭🇺";
  if (lower.includes("румун") || lower.includes("romania")) return "🇷🇴";
  if (lower.includes("болг") || lower.includes("bulgar")) return "🇧🇬";
  if (lower.includes("слов") || lower.includes("sloven")) return "🇸🇮";
  if (lower.includes("хорв") || lower.includes("croat")) return "🇭🇷";
  if (lower.includes("серб") || lower.includes("serbi")) return "🇷🇸";
  if (lower.includes("босн") || lower.includes("bosnia")) return "🇧🇦";
  if (lower.includes("черног") || lower.includes("monteneg") || lower.includes("чорног")) return "🇲🇪";
  if (lower.includes("макед") || lower.includes("macedon")) return "🇲🇰";

  // ── Former Soviet / CIS ───────────────────────────────────────────────────
  if (lower.includes("білорус") || lower.includes("belarus")) return "🇧🇾";
  if (lower.includes("казах") || lower.includes("kazakh")) return "🇰🇿";
  if (lower.includes("груз") || lower.includes("georgia")) return "🇬🇪";
  if (lower.includes("вірмен") || lower.includes("armenia")) return "🇦🇲";
  if (lower.includes("азерб") || lower.includes("azerb")) return "🇦🇿";
  if (lower.includes("молд") || lower.includes("moldov")) return "🇲🇩";
  if (lower.includes("узбек") || lower.includes("uzbek")) return "🇺🇿";
  if (lower.includes("киргиз") || lower.includes("киргіз") || lower.includes("kyrgyz")) return "🇰🇬";
  if (lower.includes("таджик") || lower.includes("tajik")) return "🇹🇯";
  if (lower.includes("туркмен") || lower.includes("turkmen")) return "🇹🇲";

  // ── Turkey ────────────────────────────────────────────────────────────────
  if (lower.includes("тур") || lower.includes("turkey") || lower.includes("turkish")) return "🇹🇷";

  // ── Classical civilisations ───────────────────────────────────────────────
  if (lower.includes("рим") || lower.includes("roman") || lower.includes("антич") || lower.includes("ancient") || lower.includes("візант") || lower.includes("byzant") || lower.includes("визант")) return "🏛️";

  // ── East Asia ─────────────────────────────────────────────────────────────
  if (lower.includes("кита") || lower.includes("china")) return "🇨🇳";
  if (lower.includes("япон") || lower.includes("japan")) return "🇯🇵";
  if (lower.includes("монгол") || lower.includes("mongol")) return "🇲🇳";
  if (lower.includes("кндр") || lower.includes("north korea") || lower.includes("пн. коре") || lower.includes("північ") && lower.includes("коре")) return "🇰🇵";
  if (lower.includes("тайван") || lower.includes("taiwan")) return "🇹🇼";
  if (lower.includes("коре") || lower.includes("korea")) return "🇰🇷";

  // ── Southeast Asia ────────────────────────────────────────────────────────
  if (lower.includes("сінга") || lower.includes("singap")) return "🇸🇬";
  if (lower.includes("таїл") || lower.includes("thail")) return "🇹🇭";
  if (lower.includes("філіп") || lower.includes("philip")) return "🇵🇭";
  if (lower.includes("в'єт") || lower.includes("viet")) return "🇻🇳";
  if (lower.includes("індонез") || lower.includes("indonesia")) return "🇮🇩";
  if (lower.includes("малайз") || lower.includes("malaysia") || lower.includes("малай") || lower.includes("malay")) return "🇲🇾";
  if (lower.includes("мьянм") || lower.includes("myanmar") || lower.includes("бірм") || lower.includes("burma")) return "🇲🇲";
  if (lower.includes("камбодж") || lower.includes("cambod") || lower.includes("кхмер") || lower.includes("khmer")) return "🇰🇭";
  if (lower.includes("лаос") || lower.includes("laos")) return "🇱🇦";
  if (lower.includes("бруней") || lower.includes("brunei")) return "🇧🇳";
  if (lower.includes("тимор") || lower.includes("timor")) return "🇹🇱";

  // ── South Asia ────────────────────────────────────────────────────────────
  if (lower.includes("індія") || lower.includes("india")) return "🇮🇳";
  if (lower.includes("непал") || lower.includes("nepal")) return "🇳🇵";
  if (lower.includes("пакист") || lower.includes("pakist")) return "🇵🇰";
  if (lower.includes("шрі-ланк") || lower.includes("sri lanka") || lower.includes("цейлон") || lower.includes("ceylon")) return "🇱🇰";
  if (lower.includes("бангладеш") || lower.includes("bangladesh")) return "🇧🇩";
  if (lower.includes("афганіст") || lower.includes("afghan")) return "🇦🇫";
  if (lower.includes("бутан") || lower.includes("bhutan")) return "🇧🇹";
  if (lower.includes("мальдів") || lower.includes("maldiv")) return "🇲🇻";

  // ── Middle East ───────────────────────────────────────────────────────────
  if (lower.includes("ізраїл") || lower.includes("israel")) return "🇮🇱";
  if (lower.includes("іран") || lower.includes("iran")) return "🇮🇷";
  if (lower.includes("ірак") || lower.includes("iraq")) return "🇮🇶";
  if (lower.includes("сирі") || lower.includes("syria")) return "🇸🇾";
  if (lower.includes("ліван") || lower.includes("lebanon")) return "🇱🇧";
  if (lower.includes("йордан") || lower.includes("jordan")) return "🇯🇴";
  if (lower.includes("кувейт") || lower.includes("kuwait")) return "🇰🇼";
  if (lower.includes("бахрейн") || lower.includes("bahrain")) return "🇧🇭";
  if (lower.includes("катар") || lower.includes("qatar")) return "🇶🇦";
  if (lower.includes("оман") || lower.includes("oman")) return "🇴🇲";
  if (lower.includes("ємен") || lower.includes("yemen")) return "🇾🇪";
  if (lower.includes("сауд") || lower.includes("saudi")) return "🇸🇦";
  if (lower.includes("оае") || lower.includes("uae") || lower.includes("емірат") || lower.includes("emirates")) return "🇦🇪";

  // ── North Africa ──────────────────────────────────────────────────────────
  if (lower.includes("єгип") || lower.includes("egypt")) return "🇪🇬";
  if (lower.includes("марокко") || lower.includes("morocc") || lower.includes("марок")) return "🇲🇦";
  if (lower.includes("алжир") || lower.includes("algeri")) return "🇩🇿";
  if (lower.includes("туніс") || lower.includes("tunisi")) return "🇹🇳";
  if (lower.includes("лівій") || lower.includes("libya")) return "🇱🇾";
  if (lower.includes("судан") || lower.includes("sudan")) return "🇸🇩";

  // ── Sub-Saharan Africa ────────────────────────────────────────────────────
  if (lower.includes("ефіоп") || lower.includes("ethiop")) return "🇪🇹";
  if (lower.includes("сомал") || lower.includes("somali")) return "🇸🇴";
  if (lower.includes("еритрея") || lower.includes("eritrea")) return "🇪🇷";
  if (lower.includes("джибуті") || lower.includes("djibouti")) return "🇩🇯";
  if (lower.includes("кені") || lower.includes("kenya")) return "🇰🇪";
  if (lower.includes("танзан") || lower.includes("tanzania") || lower.includes("танганьїк") || lower.includes("tanganyik")) return "🇹🇿";
  if (lower.includes("уганд") || lower.includes("uganda")) return "🇺🇬";
  if (lower.includes("руанд") || lower.includes("rwanda")) return "🇷🇼";
  if (lower.includes("бурунд") || lower.includes("burundi")) return "🇧🇮";
  if (lower.includes("нігерія") || lower.includes("nigeria")) return "🇳🇬";
  if (lower.includes("нігер") || lower === "niger") return "🇳🇪";
  if (lower.includes("мозамб") || lower.includes("mozamb")) return "🇲🇿";
  if (lower.includes("гана") || lower.includes("ghana") || lower.includes("золот берег") || lower.includes("gold coast")) return "🇬🇭";
  if (lower.includes("зімбабв") || lower.includes("zimbabw") || lower.includes("родез") || lower.includes("rhodesia")) return "🇿🇼";
  if (lower.includes("замбі") || lower.includes("zambia") || lower.includes("пн. родез") || lower.includes("north. rhod")) return "🇿🇲";
  if (lower.includes("малаві") || lower.includes("malawi") || lower.includes("ньясаленд") || lower.includes("nyasaland")) return "🇲🇼";
  if (lower.includes("африк") || lower.includes("south africa") || lower.includes("пд. африк")) return "🇿🇦";
  if (lower.includes("ботсван") || lower.includes("botswana") || lower.includes("бечуаналенд") || lower.includes("bechuanaland")) return "🇧🇼";
  if (lower.includes("намібі") || lower.includes("namibia")) return "🇳🇦";
  if (lower.includes("есватін") || lower.includes("eswatini") || lower.includes("свазіленд") || lower.includes("swaziland")) return "🇸🇿";
  if (lower.includes("лесото") || lower.includes("lesotho") || lower.includes("басутоленд") || lower.includes("basutoland")) return "🇱🇸";
  if (lower.includes("ангол") || lower.includes("angola")) return "🇦🇴";
  if (lower.includes("сенегал") || lower.includes("senegal")) return "🇸🇳";
  if (lower.includes("кот-д") || lower.includes("ivory coast") || lower.includes("côte d") || lower.includes("cote d")) return "🇨🇮";
  if (lower.includes("малі") || lower === "mali") return "🇲🇱";
  if (lower.includes("буркін") || lower.includes("burkina")) return "🇧🇫";
  if (lower.includes("чад") || lower === "chad") return "🇹🇩";
  if (lower.includes("камерун") || lower.includes("cameroon")) return "🇨🇲";
  if (lower.includes("республіка конго") || lower.includes("republic of congo") || lower.includes("конго-браз")) return "🇨🇬";
  if (lower.includes("конго") || lower.includes("congo") || lower.includes("заїр") || lower.includes("zaire")) return "🇨🇩";
  if (lower.includes("мадагаск") || lower.includes("madagascar")) return "🇲🇬";
  if (lower.includes("ліберія") || lower.includes("liberia")) return "🇱🇷";
  if (lower.includes("екваторіальна") || lower.includes("equatorial guinea")) return "🇬🇶";
  if (lower.includes("гвінея-бісау") || lower.includes("guinea-biss") || lower.includes("guinea biss")) return "🇬🇼";
  if (lower.includes("гвіне") || lower.includes("guinea")) return "🇬🇳";
  if (lower.includes("габон") || lower.includes("gabon")) return "🇬🇦";
  if (lower.includes("того") || lower === "togo") return "🇹🇬";
  if (lower.includes("бенін") || lower.includes("benin")) return "🇧🇯";
  if (lower.includes("цар") || lower.includes("central african")) return "🇨🇫";
  if (lower.includes("комор") || lower.includes("comoro")) return "🇰🇲";
  if (lower.includes("кабо-верде") || lower.includes("cape verde") || lower.includes("cabo verde")) return "🇨🇻";
  if (lower.includes("сан-томе") || lower.includes("são tomé") || lower.includes("sao tome")) return "🇸🇹";
  if (lower.includes("сейшел") || lower.includes("seychel")) return "🇸🇨";
  if (lower.includes("мавритан") || lower.includes("mauritan")) return "🇲🇷";
  if (lower.includes("сьєрра-леоне") || lower.includes("sierra leone")) return "🇸🇱";
  if (lower.includes("гамбі") || lower.includes("gambia")) return "🇬🇲";
  if (lower.includes("маврик") || lower.includes("maurit")) return "🇲🇺";

  // ── Americas ──────────────────────────────────────────────────────────────
  if (lower.includes("мекс") || lower.includes("mexic")) return "🇲🇽";
  if (lower.includes("браз") || lower.includes("brazil")) return "🇧🇷";
  if (lower.includes("аргент") || lower.includes("argent")) return "🇦🇷";
  if (lower.includes("чилі") || lower.includes("chile")) return "🇨🇱";
  if (lower.includes("колумб") || lower.includes("colomb")) return "🇨🇴";
  if (lower.includes("перу") || lower.includes("peru")) return "🇵🇪";
  if (lower.includes("болів") || lower.includes("boliv")) return "🇧🇴";
  if (lower.includes("еквадор") || lower.includes("ecuador")) return "🇪🇨";
  if (lower.includes("парагв") || lower.includes("paragua")) return "🇵🇾";
  if (lower.includes("уругвай") || lower.includes("uruguay")) return "🇺🇾";
  if (lower.includes("венес") || lower.includes("venez")) return "🇻🇪";
  if (lower.includes("куба") || lower.includes("cuba")) return "🇨🇺";
  if (lower.includes("домінікан") || lower.includes("dominican")) return "🇩🇴";
  if (lower.includes("гаїті") || lower.includes("haiti")) return "🇭🇹";
  if (lower.includes("гондурас") || lower.includes("honduras")) return "🇭🇳";
  if (lower.includes("нікарагуа") || lower.includes("nicaragua")) return "🇳🇮";
  if (lower.includes("панама") || lower.includes("panama")) return "🇵🇦";
  if (lower.includes("коста-ріка") || lower.includes("коста ріка") || lower.includes("costa rica")) return "🇨🇷";
  if (lower.includes("гватемал") || lower.includes("guatemal")) return "🇬🇹";
  if (lower.includes("сальвадор") || lower.includes("el salvador")) return "🇸🇻";
  if (lower.includes("суринам") || lower.includes("surinam")) return "🇸🇷";
  if (lower.includes("гайан") || lower.includes("guyan")) return "🇬🇾";
  if (lower.includes("ямайк") || lower.includes("jamaica")) return "🇯🇲";
  if (lower.includes("тринідад") || lower.includes("trinidad")) return "🇹🇹";
  if (lower.includes("барбадос") || lower.includes("barbados")) return "🇧🇧";
  if (lower.includes("беліз") || lower.includes("belize") || lower.includes("brit. honduras") || lower.includes("брит. гондур")) return "🇧🇿";
  if (lower.includes("антигуа") || lower.includes("antigua")) return "🇦🇬";
  if (lower.includes("гренада") || lower.includes("grenada")) return "🇬🇩";
  if (lower.includes("сент-кітс") || lower.includes("saint kitts") || lower.includes("st. kitts")) return "🇰🇳";
  if (lower.includes("сент-люсія") || lower.includes("saint lucia") || lower.includes("st. lucia")) return "🇱🇨";
  if (lower.includes("сент-вінсент") || lower.includes("saint vincent")) return "🇻🇨";
  if (lower.includes("домінік") && !lower.includes("домінікан")) return "🇩🇲";
  if (lower.includes("пуерто-ріко") || lower.includes("puerto rico")) return "🇵🇷";

  // ── Oceania ───────────────────────────────────────────────────────────────
  if (lower.includes("зеланд") || lower.includes("zealand")) return "🇳🇿";
  if (lower.includes("фіджі") || lower.includes("fiji")) return "🇫🇯";
  if (lower.includes("папуа") || lower.includes("papua")) return "🇵🇬";
  if (lower.includes("соломон") || lower.includes("solomon")) return "🇸🇧";
  if (lower.includes("вануату") || lower.includes("vanuatu")) return "🇻🇺";
  if (lower.includes("самоа") || lower.includes("samoa")) return "🇼🇸";
  if (lower.includes("тонга") || lower.includes("tonga")) return "🇹🇴";
  if (lower.includes("кірібаті") || lower.includes("kiribati")) return "🇰🇮";
  if (lower.includes("мікронезія") || lower.includes("micronesia")) return "🇫🇲";
  if (lower.includes("палау") || lower.includes("palau")) return "🇵🇼";
  if (lower.includes("маршалл") || lower.includes("marshall")) return "🇲🇭";
  if (lower.includes("науру") || lower.includes("nauru")) return "🇳🇷";
  if (lower.includes("тувалу") || lower.includes("tuvalu")) return "🇹🇻";

  // ── British Crown Dependencies & Overseas Territories ────────────────────
  if (lower.includes("острів мен") || lower.includes("isle of man") || lower.includes("о-в мен")) return "🇮🇲";
  if (lower.includes("джерсі") || lower.includes("jersey")) return "🇯🇪";
  if (lower.includes("гернсі") || lower.includes("guernsey")) return "🇬🇬";
  if (lower.includes("гібралт") || lower.includes("gibralt")) return "🇬🇮";
  if (lower.includes("гонконг") || lower.includes("hong kong") || lower.includes("гонґконг")) return "🇭🇰";
  if (lower.includes("бермуд") || lower.includes("bermud")) return "🇧🇲";
  if (lower.includes("фолкленд") || lower.includes("falkland") || lower.includes("мальвін")) return "🇫🇰";
  if (lower.includes("кайман") || lower.includes("cayman")) return "🇰🇾";
  if (lower.includes("теркс") || lower.includes("turks and caicos")) return "🇹🇨";
  if (lower.includes("брит. вірг") || lower.includes("british virgin") || lower.includes("brit. virg")) return "🇻🇬";
  if (lower.includes("монтсерат") || lower.includes("montserrat")) return "🇲🇸";
  if (lower.includes("ангілья") || lower.includes("anguilla")) return "🇦🇮";
  if (lower.includes("пітк") || lower.includes("pitcairn")) return "🇵🇳";
  if (lower.includes("острів св") || lower.includes("острова св") || lower.includes("saint helena") || lower.includes("єлени") || lower.includes("st. helena")) return "🇸🇭";

  return "🌐";
};
