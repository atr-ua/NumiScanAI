/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState } from "react";
import { getCountryIsoCode, getCountryFlag } from "../utils/countryUtils";

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
  const lower = (country || "").toLowerCase().trim();
  const code = getCountryIsoCode(country);
  const emoji = getCountryFlag(country);

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
