/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState, memo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Coin } from "../types";
import { getCountryIsoCode } from "../utils/countryUtils";
import CountryFlag from "./CountryFlag";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  coins: Coin[];
}

const getCountryFill = (count: number, maxCount: number): string => {
  if (count === 0) return "#1c1c1f";
  // Log scale so small counts still show up
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  const r = Math.round(0x28 + ratio * (0xD4 - 0x28));
  const g = Math.round(0x20 + ratio * (0xAF - 0x20));
  const b = Math.round(0x10 + ratio * (0x37 - 0x10));
  return `rgb(${r},${g},${b})`;
};

export default memo(function WorldMap({ coins }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 10]);

  // Build { alpha2 → count } map
  const countByCode: Record<string, number> = {};
  coins.forEach((coin) => {
    const code = getCountryIsoCode(coin.country);
    if (code && code !== "ancient") {
      countByCode[code] = (countByCode[code] || 0) + 1;
    }
  });

  const maxCount = Math.max(1, ...Object.values(countByCode));

  // Find top countries for legend
  const topCountries = Object.entries(countByCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="relative w-full select-none">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z * 1.5, 8))}
          className="w-7 h-7 bg-black/70 border border-white/10 text-white/60 hover:text-white rounded-lg text-sm font-mono flex items-center justify-center transition-all cursor-pointer"
        >+</button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z / 1.5, 1))}
          className="w-7 h-7 bg-black/70 border border-white/10 text-white/60 hover:text-white rounded-lg text-sm font-mono flex items-center justify-center transition-all cursor-pointer"
        >−</button>
        <button
          type="button"
          onClick={() => { setZoom(1); setCenter([10, 10]); }}
          className="w-7 h-7 bg-black/70 border border-white/10 text-white/40 hover:text-white rounded-lg text-[9px] font-mono flex items-center justify-center transition-all cursor-pointer"
          title="Скинути"
        >↺</button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-[#1a1a1c] border border-[#D4AF37]/30 rounded-xl px-3 py-2 shadow-xl text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <CountryFlag country={tooltip.name} fallbackSizeClass="text-sm" />
            {tooltip.name}
          </div>
          <div className="text-[#D4AF37] font-mono mt-0.5">
            {tooltip.count > 0 ? `${tooltip.count} монет` : "Немає монет"}
          </div>
        </div>
      )}

      <ComposableMap
        projectionConfig={{ scale: 147, center: center as [number, number] }}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={({ zoom: z, coordinates }) => {
            setZoom(z);
            setCenter(coordinates as [number, number]);
          }}
          filterZoomEvent={(evt: Event) => evt.type !== "wheel"}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name: string = geo.properties?.name || "";
                const code = getCountryIsoCode(name);
                const count = code && code !== "ancient" ? (countByCode[code] || 0) : 0;
                const fill = getCountryFill(count, maxCount);
                const isActive = count > 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#2a2a2d"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none", cursor: isActive ? "pointer" : "default" },
                      hover: { outline: "none", fill: isActive ? "#F2D06B" : "#28282c" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
                      const svgParent = (e.target as SVGElement).closest(".rsm-map-container")?.getBoundingClientRect()
                        || rect;
                      setTooltip({
                        name,
                        count,
                        x: e.clientX - (e.target as SVGElement).closest("div")!.getBoundingClientRect().left,
                        y: e.clientY - (e.target as SVGElement).closest("div")!.getBoundingClientRect().top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 font-mono">0</span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, #1c1c1f, #6b5010, #D4AF37)`,
            }}
          />
          <span className="text-[10px] text-white/30 font-mono">{maxCount} шт</span>
        </div>
        {topCountries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {topCountries.map(([code, count]) => (
              <span key={code} className="flex items-center gap-1 text-[10px] font-mono text-white/50">
                <CountryFlag country={coins.find(c => getCountryIsoCode(c.country) === code)?.country || ""} fallbackSizeClass="text-xs" />
                {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
