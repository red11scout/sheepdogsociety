"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";

export type LocationPin = {
  id: string;
  name: string;
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

export function LocationMap({
  locations,
  onSelectLocation,
  className = "",
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [-84.39, 33.75], // Default: Atlanta area
      zoom: 5,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add markers when locations or map load state changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll(".sheepdog-marker");
    existingMarkers.forEach((el) => el.remove());

    locations.forEach((loc) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "sheepdog-marker";
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: #D4A574;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.15s;
      `;
      el.innerHTML = "🛡️";
      el.onmouseenter = () => (el.style.transform = "scale(1.2)");
      el.onmouseleave = () => (el.style.transform = "scale(1)");

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        maxWidth: "280px",
      }).setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <h3 style="font-weight: 700; font-size: 14px; margin: 0 0 6px;">${loc.name}</h3>
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">
            ${loc.city}, ${loc.state}
          </p>
          ${
            loc.meetingDay
              ? `<p style="font-size: 12px; margin: 0 0 2px;">
                  <strong>${loc.meetingDay}</strong>${loc.meetingTime ? ` at ${loc.meetingTime}` : ""}
                </p>`
              : ""
          }
          ${
            loc.meetingPlace
              ? `<p style="font-size: 12px; color: #888; margin: 0 0 4px;">${loc.meetingPlace}</p>`
              : ""
          }
          ${
            loc.groupSize != null
              ? `<p style="font-size: 11px; color: #999; margin: 0 0 6px;">${loc.groupSize} of ${loc.maxSize} members</p>`
              : ""
          }
          <a href="/locations/${loc.id}" style="font-size: 12px; color: #D4A574; text-decoration: none; font-weight: 600;">
            View Details →
          </a>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", () => {
        onSelectLocation?.(loc.id);
      });
    });

    // Fit bounds if we have locations
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
      () => {
        // Silently fail
      }
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      <Button
        variant="secondary"
        size="sm"
        className="absolute bottom-4 left-4 z-10 shadow-lg"
        onClick={handleLocateMe}
      >
        <LocateFixed className="mr-2 h-4 w-4" />
        Near Me
      </Button>
    </div>
  );
}
