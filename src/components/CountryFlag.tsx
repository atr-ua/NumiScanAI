/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState } from "react";
import { getCountryIsoCode, getCountryFlag } from "../utils/countryUtils";
import { getHistoricalFlagAsset } from "../utils/historicalFlags";

interface CountryFlagProps {
  country: string;
  year?: number | null;
  className?: string;
  fallbackSizeClass?: string;
}

export default function CountryFlag({
  country,
  year,
  className = "w-5 h-3.5 object-cover rounded shadow-[0_1px_2px_rgba(0,0,0,0.4)] inline-block shrink-0",
  fallbackSizeClass = "text-xs",
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const [historicalError, setHistoricalError] = useState(false);
  const lower = (country || "").toLowerCase().trim();
  const code = getCountryIsoCode(country);
  const emoji = getCountryFlag(country);

  // Defunct states (СРСР, Третій Рейх, Родезія, Малайя, …): dedicated bundled SVG,
  // takes priority over the modern-country ISO/emoji lookup below.
  const historical = getHistoricalFlagAsset(country);
  if (historical && !historicalError) {
    return (
      <img
        src={historical.src}
        alt={country}
        title={historical.label}
        className={`${className} border border-white/10`}
        onError={() => setHistoricalError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Libya: Gaddafi-era all-green flag (1969–2011)
  const isLibya = lower.includes("лівій") || lower.includes("libya");
  if (isLibya && year != null && year >= 1969 && year < 2011) {
    return (
      <span
        className="inline-block rounded shadow-[0_1px_2px_rgba(0,0,0,0.4)] shrink-0 border border-white/10"
        style={{ width: "1.25rem", height: "0.875rem", backgroundColor: "#009a44", display: "inline-block" }}
        title={`Лівія — Джамагірія (${year})`}
      />
    );
  }

  // Italy/Germany: the AI/user often write just the modern country name without the
  // historical qualifier ("Італія" for a 1938 coin instead of "Італія (Королівство)").
  // getHistoricalFlagAsset() above only fires on the explicit qualifier, so as a fallback
  // for those unqualified rows, use the mint year to pick the flag that was actually flying —
  // same idea as the Libya case above, just generalized by ISO code + year range.
  if (code === "it" && year != null && year >= 1861 && year < 1946 && !historicalError) {
    return (
      <img
        src="/flags/historical/kingdom-italy.svg"
        alt={country}
        title={`Королівство Італія (${year})`}
        className={`${className} border border-white/10`}
        onError={() => setHistoricalError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }
  if (code === "de" && year != null && !historicalError) {
    if (year >= 1933 && year <= 1945) {
      return (
        <img
          src="/flags/historical/third-reich.svg"
          alt={country}
          title={`Третій Рейх (${year})`}
          className={`${className} border border-white/10`}
          onError={() => setHistoricalError(true)}
          referrerPolicy="no-referrer"
        />
      );
    }
    if (year >= 1871 && year <= 1918) {
      return (
        <img
          src="/flags/historical/german-empire.svg"
          alt={country}
          title={`Німецька імперія (${year})`}
          className={`${className} border border-white/10`}
          onError={() => setHistoricalError(true)}
          referrerPolicy="no-referrer"
        />
      );
    }
  }

  if (code === "ancient") {
    return (
      <span className={`${fallbackSizeClass} leading-none shrink-0 inline-block font-sans`} title={country}>
        🏛️
      </span>
    );
  }

  if (code && !hasError) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt={country}
        title={country}
        className={`${className} border border-white/10`}
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className={`${fallbackSizeClass} leading-none shrink-0 inline-flex items-center justify-center font-sans`} title={country}>
      {emoji}
    </span>
  );
}
