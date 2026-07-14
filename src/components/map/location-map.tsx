"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons/Icon";

const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";

export type LocationPin = {
  id: string;
  name: string;
  slug: string | null;
  latitude: string;
  longitude: string;
  city: string;
  state: string;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  groupSize: number | null;
  maxSize: number;
  contactName: string | null;
};

type LocationMapProps = {
  locations: LocationPin[];
  onSelectLocation?: (id: string) => void;
  className?: string;
};

/**
 * Night Watch basemap palettes. The default Mapbox dark/light styles are
 * generic; we re-tone every layer at runtime into a bespoke monochrome
 * iron map (night) / warm parchment map (first light), so the groups read
 * as lamps burning on the land rather than pins on a stock street map.
 */
const NIGHT = {
  land: "#111a28",
  water: "#0a101c",
  road: "#37425a",
  roadMajor: "#55648a",
  label: "#d2cbba",
  labelHalo: "#0a101c",
  building: "#16202f",
  boundary: "#3a4864",
};
const DAY = {
  land: "#efe9db",
  water: "#dcd6c5",
  road: "#d0c8b5",
  roadMajor: "#bcb298",
  label: "#5f5540",
  labelHalo: "#f6f2e7",
  building: "#e6dfce",
  boundary: "#cfc7b3",
};

/**
 * Re-tone the active Mapbox style into the Night Watch palette. Runs on
 * every `style.load` (initial + theme swap). Per-layer set calls are
 * wrapped so a layer that doesn't accept a given paint prop is skipped,
 * not thrown — keeps us resilient to Mapbox style-version churn.
 */
function tuneBasemap(m: mapboxgl.Map, isDark: boolean) {
  const p = isDark ? NIGHT : DAY;
  const style = m.getStyle();
  if (!style?.layers) return;

  // LIGHT touch: the default Mapbox dark/light styles already read well
  // (legible roads + labels). We only deepen water to a Night Watch navy,
  // warm the major-road network a touch, and declutter POI/transit/airport
  // labels so the groups' lamps are the only points of interest. The
  // basemap's own legibility is preserved — the identity comes from the
  // glowing markers, the vignette, and the controls.
  for (const layer of style.layers) {
    const id = layer.id;
    const set = (prop: string, val: unknown) => {
      try {
        (m.setPaintProperty as (i: string, p: string, v: unknown) => void)(
          id,
          prop,
          val
        );
      } catch {
        /* layer doesn't support this paint prop */
      }
    };
    try {
      switch (layer.type) {
        case "fill":
          if (/water/i.test(id)) set("fill-color", p.water);
          break;
        case "line":
          if (/water|river|canal/i.test(id)) set("line-color", p.water);
          else if (/motorway|trunk/i.test(id)) set("line-color", p.roadMajor);
          break;
        case "symbol":
          if (/poi|transit|airport|natural[-_]?label|water[-_]?point/i.test(id)) {
            try {
              m.setLayoutProperty(id, "visibility", "none");
            } catch {
              /* noop */
            }
          }
          break;
      }
    } catch {
      /* skip unstylable layer */
    }
  }

  // Subtle atmospheric depth toward the horizon.
  try {
    m.setFog({
      color: p.water,
      "high-color": p.land,
      "horizon-blend": 0.02,
      "space-color": isDark ? "#05070c" : "#e8e2d2",
      "star-intensity": 0,
    });
  } catch {
    /* fog unsupported */
  }
}

export function LocationMap({
  locations,
  onSelectLocation,
  className = "",
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const styleForTheme = isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("Mapbox token not set");
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: styleForTheme,
      center: [-84.39, 33.75],
      zoom: 5,
      attributionControl: false,
      // No cooperativeGestures: it demanded Ctrl+scroll / two fingers,
      // which read as "the map won't zoom." Plain scroll + pinch zoom is
      // what people expect on a locator map.
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    // style.load fires on first load AND after every setStyle (theme swap),
    // so the palette re-tunes with the current theme each time.
    map.current.on("style.load", () => {
      if (map.current) tuneBasemap(map.current, isDarkRef.current);
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap the basemap when the theme toggle flips. Skip the first run:
  // the constructor already set this style, and a redundant setStyle on
  // mount can race with the initial fitBounds and leave the map unzoomed.
  const didInitStyle = useRef(false);
  useEffect(() => {
    if (!map.current) return;
    if (!didInitStyle.current) {
      didInitStyle.current = true;
      return;
    }
    map.current.setStyle(styleForTheme);
  }, [styleForTheme]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    document.querySelectorAll(".sheepdog-lamp").forEach((el) => el.remove());

    locations.forEach((loc) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      // A lamp: a warm core inside a breathing halo (see globals.css).
      const el = document.createElement("div");
      el.className = "sheepdog-lamp";
      el.innerHTML =
        '<span class="sheepdog-lamp__glow"></span><span class="sheepdog-lamp__core"></span>';

      const memberPart =
        loc.groupSize != null
          ? `${loc.groupSize} ${loc.groupSize === 1 ? "man" : "men"}`
          : null;
      const meta = [memberPart, loc.meetingDay, loc.meetingTime]
        .filter(Boolean)
        .join(" · ");

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: false,
        maxWidth: "300px",
        className: "sheepdog-popup",
      }).setHTML(`
        <div class="nw-pop">
          <div class="nw-pop__loc">${loc.city}, ${loc.state}</div>
          <h3 class="nw-pop__name">${loc.name}</h3>
          ${meta ? `<div class="nw-pop__meta">${meta}</div>` : ""}
          ${loc.meetingPlace ? `<p class="nw-pop__place">${loc.meetingPlace}</p>` : ""}
          <a class="nw-pop__link" href="/groups/${loc.slug ?? loc.id}">View details →</a>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", () => {
        onSelectLocation?.(loc.id);
      });
    });

    if (locations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        const lat = parseFloat(loc.latitude);
        const lng = parseFloat(loc.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.extend([lng, lat]);
        }
      });
      map.current.fitBounds(bounds, { padding: 72, maxZoom: 11 });
    }
  }, [locations, mapLoaded, onSelectLocation]);

  function handleLocateMe() {
    if (!navigator.geolocation || !map.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 10,
          duration: 2200,
          essential: true,
        });
      },
      () => {}
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainer} className="h-full w-full" />
      <div className="nw-map-vignette" aria-hidden="true" />
      <button
        type="button"
        onClick={handleLocateMe}
        className="nw-cta absolute left-4 top-4 z-10 inline-flex items-center gap-2 border border-border bg-card/85 px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground/80 backdrop-blur-sm transition-colors hover:border-brass hover:text-brass"
      >
        <Icon name="locate" size={14} />
        Near me
      </button>
    </div>
  );
}
