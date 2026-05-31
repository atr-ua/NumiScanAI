/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState } from "react";
import { getCountryIsoCode, getCountryFlag } from "../utils/countryUtils";

interface CountryFlagProps {
  country: string;
  className?: string;
  fallbackSizeClass?: string;
}

export default function CountryFlag({
  country,
  className = "w-5 h-3.5 object-cover rounded shadow-[0_1px_2px_rgba(0,0,0,0.4)] inline-block shrink-0",
  fallbackSizeClass = "text-xs",
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const code = getCountryIsoCode(country);
  const emoji = getCountryFlag(country);

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
