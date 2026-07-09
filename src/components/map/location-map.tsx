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

const BRASS = "#A6803A";
const IRON = "#1F2A2E";
const BONE = "#F2EBDD";

export function LocationMap({
  locations,
  onSelectLocation,
  className = "",
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { resolvedTheme } = useTheme();
  const styleForTheme = resolvedTheme === "light" ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;

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
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap basemap when the theme toggle flips. Mapbox preserves
  // the camera position; markers are re-added in the next effect below.
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(styleForTheme);
  }, [styleForTheme]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const existingMarkers = document.querySelectorAll(".sheepdog-marker");
    existingMarkers.forEach((el) => el.remove());

    locations.forEach((loc) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const el = document.createElement("div");
      el.className = "sheepdog-marker";
      el.style.cssText = `
        width: 16px;
        height: 16px;
        background: ${BRASS};
        border: 2px solid ${BONE};
        border-radius: 0;
        cursor: pointer;
        box-shadow: 0 0 0 4px rgba(166, 128, 58, 0.18);
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
      `;
      el.onmouseenter = () => {
        el.style.transform = "rotate(45deg) scale(1.15)";
        el.style.boxShadow = `0 0 0 6px rgba(166, 128, 58, 0.28)`;
      };
      el.onmouseleave = () => {
        el.style.transform = "rotate(45deg) scale(1)";
        el.style.boxShadow = `0 0 0 4px rgba(166, 128, 58, 0.18)`;
      };
      el.style.transform = "rotate(45deg)";

      const memberPart =
        loc.groupSize != null
          ? `${loc.groupSize} ${loc.groupSize === 1 ? "man" : "men"}`
          : null;
      const meta = [memberPart, loc.meetingDay, loc.meetingTime]
        .filter(Boolean)
        .join(" · ");

      const popup = new mapboxgl.Popup({
        offset: 18,
        closeButton: false,
        maxWidth: "300px",
        className: "sheepdog-popup",
      }).setHTML(`
        <div style="font-family: var(--font-inter), system-ui, sans-serif; padding: 14px 16px; background: ${IRON}; color: ${BONE}; min-width: 220px;">
          <div style="font-family: var(--font-jetbrains-mono), monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: ${BRASS};">${loc.city}, ${loc.state}</div>
          <h3 style="font-family: var(--font-fraunces), 'Helvetica Neue', Arial, sans-serif; font-weight: 800; font-size: 20px; line-height: 1; margin: 8px 0 0; letter-spacing: -0.01em;">${loc.name}</h3>
          ${meta ? `<div style="font-family: var(--font-jetbrains-mono), monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRASS}; margin-top: 12px;">${meta}</div>` : ""}
          ${loc.meetingPlace ? `<p style="font-size: 13px; opacity: 0.7; margin: 8px 0 0; line-height: 1.5;">${loc.meetingPlace}</p>` : ""}
          <a href="/groups/${loc.slug ?? loc.id}" style="display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-jetbrains-mono), monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${BRASS}; text-decoration: none; margin-top: 14px; border-top: 1px solid rgba(199, 183, 154, 0.15); padding-top: 14px;">
            View details →
          </a>
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
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }
  }, [locations, mapLoaded, onSelectLocation]);

  function handleLocateMe() {
    if (!navigator.geolocation || !map.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 10,
        });
      },
      () => {}
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full" />
      <button
        type="button"
        onClick={handleLocateMe}
        className="lift absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 border border-bone/30 bg-iron px-4 py-2 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:border-brass hover:text-brass"
      >
        <Icon name="locate" size={14} />
        Near me
      </button>
    </div>
  );
}
