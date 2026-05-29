/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Maps country names (in Ukrainian or English) to their respective 2-letter ISO codes.
 */
export const getCountryIsoCode = (country: string): string | null => {
  const lower = (country || "").toLowerCase().trim();
  if (!lower) return null;

  if (lower.includes("укра") || lower.includes("ukra")) return "ua";
  if (lower.includes("фін") || lower.includes("fin")) return "fi";
  if (lower.includes("сша") || lower.includes("usa") || lower.includes("united states") || lower.includes("america")) return "us";
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
  
  if (lower.includes("срср") || lower.includes("ussr") || lower.includes("радян") || lower.includes("ссср") || lower.includes("soviet")) return "su";
  if (lower.includes("югос") || lower.includes("yugos")) return "yu";

  if (lower.includes("євро") || lower.includes("euro")) return "eu";
  if (lower.includes("австрал") || lower.includes("australia")) return "au";
  if (lower.includes("австрі") || lower.includes("austria")) return "at";
  if (lower.includes("швейц") || lower.includes("switzerland") || lower.includes("helvetia")) return "ch";
  if (lower.includes("кита") || lower.includes("china")) return "cn";
  if (lower.includes("япон") || lower.includes("japan")) return "jp";
  
  if (lower.includes("рим") || lower.includes("roman") || lower.includes("антич") || lower.includes("ancient") || lower.includes("візант") || lower.includes("byzant") || lower.includes("визант")) return "ancient";

  if (lower.includes("чех") || lower.includes("czech")) return "cz";
  if (lower.includes("словач") || lower.includes("slovak")) return "sk";
  if (lower.includes("угор") || lower.includes("hungar") || lower.includes("magyar")) return "hu";
  if (lower.includes("румун") || lower.includes("romania")) return "ro";
  if (lower.includes("болг") || lower.includes("bulgar")) return "bg";
  if (lower.includes("тур") || lower.includes("turkey") || lower.includes("turkish")) return "tr";
  if (lower.includes("нідер") || lower.includes("nether") || lower.includes("holland") || lower.includes("голланд")) return "nl";
  if (lower.includes("кюрасао") || lower.includes("curacao") || lower.includes("curaçao")) return "cw";
  if (lower.includes("бельг") || lower.includes("belg")) return "be";
  if (lower.includes("швец") || lower.includes("swed") || lower.includes("швед")) return "se";
  if (lower.includes("норв") || lower.includes("norw")) return "no";
  if (lower.includes("йордан") || lower.includes("jordan")) return "jo";
  if (lower.includes("данія") || lower.includes("denm") || lower.includes("denmark")) return "dk";
  if (lower.includes("литв") || lower.includes("lithu")) return "lt";
  if (lower.includes("латв") || lower.includes("latv")) return "lv";
  if (lower.includes("естон") || lower.includes("eston")) return "ee";
  
  if (lower.includes("португ") || lower.includes("portug")) return "pt";
  if (lower.includes("ірлан") || lower.includes("irelan")) return "ie";
  if (lower.includes("іслан") || lower.includes("icelan")) return "is";
  if (lower.includes("люксем") || lower.includes("luxem")) return "lu";
  if (lower.includes("мальт") || lower.includes("malta")) return "mt";
  if (lower.includes("кіпр") || lower.includes("cyprus")) return "cy";
  if (lower.includes("грец") || lower.includes("greec")) return "gr";
  if (lower.includes("грек") || lower.includes("greek")) return "gr";
  
  if (lower.includes("білорус") || lower.includes("belarus")) return "by";
  if (lower.includes("казах") || lower.includes("kazakh")) return "kz";
  if (lower.includes("груз") || lower.includes("georgia")) return "ge";
  if (lower.includes("вірмен") || lower.includes("armenia")) return "am";
  if (lower.includes("азерб") || lower.includes("azerb")) return "az";
  if (lower.includes("молд") || lower.includes("moldov")) return "md";
  
  if (lower.includes("зеланд") || lower.includes("zealand")) return "nz";
  if (lower.includes("фіджі") || lower.includes("fiji")) return "fj";
  if (lower.includes("індонез") || lower.includes("indonesia")) return "id";
  if (lower.includes("індія") || lower.includes("india")) return "in";
  if (lower.includes("мекс") || lower.includes("mexic")) return "mx";
  if (lower.includes("браз") || lower.includes("brazil")) return "br";
  if (lower.includes("аргент") || lower.includes("argent")) return "ar";
  if (lower.includes("чилі") || lower.includes("chile")) return "cl";
  if (lower.includes("колумб") || lower.includes("colomb")) return "co";
  if (lower.includes("перу") || lower.includes("peru")) return "pe";
  if (lower.includes("венес") || lower.includes("venez")) return "ve";
  if (lower.includes("куба") || lower.includes("cuba")) return "cu";
  if (lower.includes("домінікан") || lower.includes("dominican")) return "do";
  
  // British Crown Dependencies & Overseas Territories
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

  // Former British dominions & colonies (Commonwealth, numismatically relevant)
  if (lower.includes("пакист") || lower.includes("pakist")) return "pk";
  if (lower.includes("шрі-ланк") || lower.includes("sri lanka") || lower.includes("цейлон") || lower.includes("ceylon")) return "lk";
  if (lower.includes("зімбабв") || lower.includes("zimbabw") || lower.includes("родез") || lower.includes("rhodesia")) return "zw";
  if (lower.includes("мьянм") || lower.includes("myanmar") || lower.includes("бірм") || lower.includes("burma")) return "mm";
  if (lower.includes("нігер") || lower.includes("nigeria")) return "ng";
  if (lower.includes("ефіоп") || lower.includes("ethiop")) return "et";
  if (lower.includes("кені") || lower.includes("kenya")) return "ke";
  if (lower.includes("гана") || lower.includes("ghana") || lower.includes("золот берег") || lower.includes("gold coast")) return "gh";
  if (lower.includes("ямайк") || lower.includes("jamaica")) return "jm";
  if (lower.includes("тринідад") || lower.includes("trinidad")) return "tt";
  if (lower.includes("барбадос") || lower.includes("barbados")) return "bb";
  if (lower.includes("беліз") || lower.includes("belize") || lower.includes("brit. honduras") || lower.includes("брит. гондур")) return "bz";
  if (lower.includes("гайан") || lower.includes("guyan")) return "gy";
  if (lower.includes("замбі") || lower.includes("zambia") || lower.includes("пн. родез") || lower.includes("north. rhod")) return "zm";
  if (lower.includes("танзан") || lower.includes("tanzania") || lower.includes("танганьїк") || lower.includes("tanganyik")) return "tz";
  if (lower.includes("уганд") || lower.includes("uganda")) return "ug";
  if (lower.includes("малаві") || lower.includes("malawi") || lower.includes("ньясаленд") || lower.includes("nyasaland")) return "mw";
  if (lower.includes("ботсван") || lower.includes("botswana") || lower.includes("бечуаналенд") || lower.includes("bechuanaland")) return "bw";
  if (lower.includes("есватін") || lower.includes("eswatini") || lower.includes("свазіленд") || lower.includes("swaziland")) return "sz";
  if (lower.includes("лесото") || lower.includes("lesotho") || lower.includes("басутоленд") || lower.includes("basutoland")) return "ls";
  if (lower.includes("бангладеш") || lower.includes("bangladesh")) return "bd";
  if (lower.includes("сьєрра-леоне") || lower.includes("sierra leone")) return "sl";
  if (lower.includes("гамбі") || lower.includes("gambia")) return "gm";
  if (lower.includes("малайз") || lower.includes("malaysia") || lower.includes("малай") || lower.includes("malay")) return "my";
  if (lower.includes("маврик") || lower.includes("maurit")) return "mu";

  // Fix: Paraguay must come BEFORE the South Africa "африк" match
  if (lower.includes("парагв") || lower.includes("paragua")) return "py";
  if (lower.includes("африк") || lower.includes("south africa") || lower.includes("пд. африк")) return "za";
  if (lower.includes("єгип") || lower.includes("egypt")) return "eg";
  if (lower.includes("сінга") || lower.includes("singap")) return "sg";
  if (lower.includes("таїл") || lower.includes("thail")) return "th";
  if (lower.includes("філіп") || lower.includes("philip")) return "ph";
  if (lower.includes("в'єт") || lower.includes("viet")) return "vn";
  if (lower.includes("коре") || lower.includes("korea")) return "kr";
  if (lower.includes("ізраїл") || lower.includes("israel")) return "il";

  if (lower.includes("іран") || lower.includes("iran")) return "ir";
  if (lower.includes("сауд") || lower.includes("saudi")) return "sa";
  if (lower.includes("оае") || lower.includes("uae") || lower.includes("емірат") || lower.includes("emirates")) return "ae";
  if (lower.includes("монак") || lower.includes("monaco")) return "mc";
  if (lower.includes("ватик") || lower.includes("vatican")) return "va";
  if (lower.includes("марин") || lower.includes("marino")) return "sm";
  if (lower.includes("андор") || lower.includes("andor")) return "ad";
  if (lower.includes("ліхтен") || lower.includes("liechten")) return "li";

  if (lower.includes("слов") || lower.includes("sloven")) return "si";
  if (lower.includes("хорв") || lower.includes("croat")) return "hr";
  if (lower.includes("серб") || lower.includes("serbi")) return "rs";
  if (lower.includes("босн") || lower.includes("bosnia")) return "ba";
  if (lower.includes("черног") || lower.includes("monteneg") || lower.includes("чорног")) return "me";
  if (lower.includes("макед") || lower.includes("macedon")) return "mk";

  return null;
};

/**
 * Maps country names (in Ukrainian or English) to their respective flag emojis.
 * Supports historical regions, multi-lingual variants, and broad matching.
 */
export const getCountryFlag = (country: string): string => {
  const lower = (country || "").toLowerCase().trim();
  if (!lower) return "🌐";

  // Check Ukrainian & English names with flexible substring inclusions
  if (lower.includes("укра") || lower.includes("ukra")) return "🇺🇦";
  if (lower.includes("фін") || lower.includes("fin")) return "🇫🇮";
  if (lower.includes("сша") || lower.includes("usa") || lower.includes("united states") || lower.includes("america")) return "🇺🇸";
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
  
  // USSR & historical regimes
  if (lower.includes("срср") || lower.includes("ussr") || lower.includes("радян") || lower.includes("ссср") || lower.includes("soviet")) return "🚩";
  if (lower.includes("югос") || lower.includes("yugos")) return "🚩";

  if (lower.includes("євро") || lower.includes("euro")) return "🇪🇺";
  if (lower.includes("австрал") || lower.includes("australia")) return "🇦🇺";
  if (lower.includes("австрі") || lower.includes("austria")) return "🇦🇹";
  if (lower.includes("швейц") || lower.includes("switzerland") || lower.includes("helvetia")) return "🇨🇭";
  if (lower.includes("кита") || lower.includes("china")) return "🇨🇳";
  if (lower.includes("япон") || lower.includes("japan")) return "🇯🇵";
  
  // Classical civilisations & ancient designations
  if (lower.includes("рим") || lower.includes("roman") || lower.includes("антич") || lower.includes("ancient") || lower.includes("візант") || lower.includes("byzant") || lower.includes("визант")) return "🏛️";

  // European and other prominent numismatic countries
  if (lower.includes("чех") || lower.includes("czech")) return "🇨🇿";
  if (lower.includes("словач") || lower.includes("slovak")) return "🇸🇰";
  if (lower.includes("угор") || lower.includes("hungar") || lower.includes("magyar")) return "🇭🇺";
  if (lower.includes("румун") || lower.includes("romania")) return "🇷🇴";
  if (lower.includes("болг") || lower.includes("bulgar")) return "🇧🇬";
  if (lower.includes("тур") || lower.includes("turkey") || lower.includes("turkish")) return "🇹🇷";
  if (lower.includes("нідер") || lower.includes("nether") || lower.includes("holland") || lower.includes("голланд")) return "🇳🇱";
  if (lower.includes("кюрасао") || lower.includes("curacao") || lower.includes("curaçao")) return "🇨🇼";
  if (lower.includes("бельг") || lower.includes("belg")) return "🇧🇪";
  if (lower.includes("швец") || lower.includes("swed") || lower.includes("швед")) return "🇸🇪";
  if (lower.includes("норв") || lower.includes("norw")) return "🇳🇴";
  if (lower.includes("йордан") || lower.includes("jordan")) return "🇯🇴";
  if (lower.includes("данія") || lower.includes("denm") || lower.includes("denmark")) return "🇩🇰";
  if (lower.includes("литв") || lower.includes("lithu")) return "🇱🇹";
  if (lower.includes("латв") || lower.includes("latv")) return "🇱🇻";
  if (lower.includes("естон") || lower.includes("eston")) return "🇪🇪";
  
  if (lower.includes("португ") || lower.includes("portug")) return "🇵🇹";
  if (lower.includes("ірлан") || lower.includes("irelan")) return "🇮🇪";
  if (lower.includes("іслан") || lower.includes("icelan")) return "🇮🇸";
  if (lower.includes("люксем") || lower.includes("luxem")) return "🇱🇺";
  if (lower.includes("мальт") || lower.includes("malta")) return "🇲🇹";
  if (lower.includes("кіпр") || lower.includes("cyprus")) return "🇨🇾";
  if (lower.includes("грец") || lower.includes("greec")) return "🇬🇷";
  if (lower.includes("грек") || lower.includes("greek")) return "🇬🇷";
  
  if (lower.includes("білорус") || lower.includes("belarus")) return "🇧🇾";
  if (lower.includes("казах") || lower.includes("kazakh")) return "🇰🇿";
  if (lower.includes("груз") || lower.includes("georgia")) return "🇬🇪";
  if (lower.includes("вірмен") || lower.includes("armenia")) return "🇦🇲";
  if (lower.includes("азерб") || lower.includes("azerb")) return "🇦🇿";
  if (lower.includes("молд") || lower.includes("moldov")) return "🇲🇩";
  
  if (lower.includes("зеланд") || lower.includes("zealand")) return "🇳🇿";
  if (lower.includes("фіджі") || lower.includes("fiji")) return "🇫🇯";
  if (lower.includes("індонез") || lower.includes("indonesia")) return "🇮🇩";
  if (lower.includes("індія") || lower.includes("india")) return "🇮🇳";
  if (lower.includes("мекс") || lower.includes("mexic")) return "🇲🇽";
  if (lower.includes("браз") || lower.includes("brazil")) return "🇧🇷";
  if (lower.includes("аргент") || lower.includes("argent")) return "🇦🇷";
  if (lower.includes("чилі") || lower.includes("chile")) return "🇨🇱";
  if (lower.includes("колумб") || lower.includes("colomb")) return "🇨🇴";
  if (lower.includes("перу") || lower.includes("peru")) return "🇵🇪";
  if (lower.includes("венес") || lower.includes("venez")) return "🇻🇪";
  if (lower.includes("куба") || lower.includes("cuba")) return "🇨🇺";
  if (lower.includes("домінікан") || lower.includes("dominican")) return "🇩🇴";
  
  // British Crown Dependencies & Overseas Territories
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

  // Former British dominions & colonies
  if (lower.includes("пакист") || lower.includes("pakist")) return "🇵🇰";
  if (lower.includes("шрі-ланк") || lower.includes("sri lanka") || lower.includes("цейлон") || lower.includes("ceylon")) return "🇱🇰";
  if (lower.includes("зімбабв") || lower.includes("zimbabw") || lower.includes("родез") || lower.includes("rhodesia")) return "🇿🇼";
  if (lower.includes("мьянм") || lower.includes("myanmar") || lower.includes("бірм") || lower.includes("burma")) return "🇲🇲";
  if (lower.includes("нігер") || lower.includes("nigeria")) return "🇳🇬";
  if (lower.includes("ефіоп") || lower.includes("ethiop")) return "🇪🇹";
  if (lower.includes("кені") || lower.includes("kenya")) return "🇰🇪";
  if (lower.includes("гана") || lower.includes("ghana") || lower.includes("золот берег") || lower.includes("gold coast")) return "🇬🇭";
  if (lower.includes("ямайк") || lower.includes("jamaica")) return "🇯🇲";
  if (lower.includes("тринідад") || lower.includes("trinidad")) return "🇹🇹";
  if (lower.includes("барбадос") || lower.includes("barbados")) return "🇧🇧";
  if (lower.includes("беліз") || lower.includes("belize") || lower.includes("brit. honduras") || lower.includes("брит. гондур")) return "🇧🇿";
  if (lower.includes("гайан") || lower.includes("guyan")) return "🇬🇾";
  if (lower.includes("замбі") || lower.includes("zambia") || lower.includes("пн. родез") || lower.includes("north. rhod")) return "🇿🇲";
  if (lower.includes("танзан") || lower.includes("tanzania") || lower.includes("танганьїк") || lower.includes("tanganyik")) return "🇹🇿";
  if (lower.includes("уганд") || lower.includes("uganda")) return "🇺🇬";
  if (lower.includes("малаві") || lower.includes("malawi") || lower.includes("ньясаленд") || lower.includes("nyasaland")) return "🇲🇼";
  if (lower.includes("ботсван") || lower.includes("botswana") || lower.includes("бечуаналенд") || lower.includes("bechuanaland")) return "🇧🇼";
  if (lower.includes("есватін") || lower.includes("eswatini") || lower.includes("свазіленд") || lower.includes("swaziland")) return "🇸🇿";
  if (lower.includes("лесото") || lower.includes("lesotho") || lower.includes("басутоленд") || lower.includes("basutoland")) return "🇱🇸";
  if (lower.includes("бангладеш") || lower.includes("bangladesh")) return "🇧🇩";
  if (lower.includes("сьєрра-леоне") || lower.includes("sierra leone")) return "🇸🇱";
  if (lower.includes("гамбі") || lower.includes("gambia")) return "🇬🇲";
  if (lower.includes("малайз") || lower.includes("malaysia") || lower.includes("малай") || lower.includes("malay")) return "🇲🇾";
  if (lower.includes("маврик") || lower.includes("maurit")) return "🇲🇺";

  // Fix: Paraguay must come BEFORE the South Africa "африк" match
  if (lower.includes("парагв") || lower.includes("paragua")) return "🇵🇾";
  if (lower.includes("африк") || lower.includes("south africa") || lower.includes("пд. африк")) return "🇿🇦";
  if (lower.includes("єгип") || lower.includes("egypt")) return "🇪🇬";
  if (lower.includes("сінга") || lower.includes("singap")) return "🇸🇬";
  if (lower.includes("таїл") || lower.includes("thail")) return "🇹🇭";
  if (lower.includes("філіп") || lower.includes("philip")) return "🇵🇭";
  if (lower.includes("в'єт") || lower.includes("viet")) return "🇻🇳";
  if (lower.includes("коре") || lower.includes("korea")) return "🇰🇷";
  if (lower.includes("ізраїл") || lower.includes("israel")) return "🇮🇱";

  if (lower.includes("іран") || lower.includes("iran")) return "🇮🇷";
  if (lower.includes("сауд") || lower.includes("saudi")) return "🇸🇦";
  if (lower.includes("оае") || lower.includes("uae") || lower.includes("емірат") || lower.includes("emirates")) return "🇦🇪";
  if (lower.includes("монак") || lower.includes("monaco")) return "🇲🇨";
  if (lower.includes("ватик") || lower.includes("vatican")) return "🇻🇦";
  if (lower.includes("марин") || lower.includes("marino")) return "🇸🇲";
  if (lower.includes("андор") || lower.includes("andor")) return "🇦🇩";
  if (lower.includes("ліхтен") || lower.includes("liechten")) return "🇱🇮";

  if (lower.includes("слов") || lower.includes("sloven")) return "🇸🇮";
  if (lower.includes("хорв") || lower.includes("croat")) return "🇭🇷";
  if (lower.includes("серб") || lower.includes("serbi")) return "🇷🇸";
  if (lower.includes("босн") || lower.includes("bosnia")) return "🇧🇦";
  if (lower.includes("черног") || lower.includes("monteneg") || lower.includes("чорног")) return "🇲🇪";
  if (lower.includes("макед") || lower.includes("macedon")) return "🇲🇰";

  return "🌐";
};
