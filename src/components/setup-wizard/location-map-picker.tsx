'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Locate, Loader2 } from 'lucide-react';

interface LocationMapPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
}

// Default center — Kuala Lumpur
const DEFAULT_CENTER = { lat: 3.139, lng: 101.6869 };
const DEFAULT_ZOOM = 13;
const PLACED_ZOOM = 17;
const RADIUS_PRESETS = [50, 100, 200, 500] as const;
const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: '300px' };

const CIRCLE_OPTIONS: google.maps.CircleOptions = {
  strokeColor: 'hsl(262, 83%, 58%)',
  strokeWeight: 2,
  strokeOpacity: 0.8,
  fillColor: 'hsl(262, 83%, 58%)',
  fillOpacity: 0.12,
};

function roundCoord(n: number) {
  return parseFloat(n.toFixed(6));
}

export function LocationMapPicker({
  lat,
  lng,
  radius,
  onLocationChange,
  onRadiusChange,
}: LocationMapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [locating, setLocating] = useState(false);

  const hasCoords = lat !== null && lng !== null;
  const center = hasCoords ? { lat, lng } : DEFAULT_CENTER;

  const placeMarker = useCallback(
    (newLat: number, newLng: number) => {
      const rounded = { lat: roundCoord(newLat), lng: roundCoord(newLng) };
      onLocationChange(rounded.lat, rounded.lng);
      mapRef.current?.panTo(rounded);
      mapRef.current?.setZoom(PLACED_ZOOM);
    },
    [onLocationChange]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        placeMarker(e.latLng.lat(), e.latLng.lng());
      }
    },
    [placeMarker]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onLocationChange(roundCoord(e.latLng.lat()), roundCoord(e.latLng.lng()));
      }
    },
    [onLocationChange]
  );

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Stable ref so the Autocomplete listener always calls the latest placeMarker
  const placeMarkerRef = useRef(placeMarker);
  useEffect(() => { placeMarkerRef.current = placeMarker; }, [placeMarker]);

  // Initialize Places Autocomplete (legacy API — stable and reliable)
  useEffect(() => {
    if (!isLoaded || !searchInputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(
      searchInputRef.current,
      { fields: ['geometry'] }
    );

    if (mapRef.current) {
      autocomplete.bindTo('bounds', mapRef.current);
    }

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        placeMarkerRef.current(
          place.geometry.location.lat(),
          place.geometry.location.lng()
        );
      }
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placeMarker(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[300px] rounded-xl border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar + locate button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            placeholder="Search address or place name..."
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLocateMe}
          disabled={locating}
          title="Use my location"
          type="button"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
        </Button>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border shadow-sm">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={hasCoords ? PLACED_ZOOM : DEFAULT_ZOOM}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
          }}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
        >
          {hasCoords && (
            <>
              <Marker
                position={{ lat, lng }}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
              <Circle
                center={{ lat, lng }}
                radius={radius}
                options={CIRCLE_OPTIONS}
              />
            </>
          )}
        </GoogleMap>
        {!hasCoords && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-lg border text-sm text-muted-foreground font-medium">
              Click on the map to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Radius selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Check-in radius</span>
          <span className="text-sm text-muted-foreground font-mono">{radius}m</span>
        </div>
        <div className="flex gap-2">
          {RADIUS_PRESETS.map((r) => (
            <Button
              key={r}
              variant={radius === r ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => onRadiusChange(r)}
              type="button"
            >
              {r}m
            </Button>
          ))}
          <Input
            type="number"
            min={10}
            max={5000}
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value) || 100)}
            className="w-20 text-center"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Employees must be within this distance to check in. 100m is typical for an office.
        </p>
      </div>

      {/* Coordinates display */}
      {hasCoords && (
        <div className="flex gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>Lat: <span className="font-mono font-medium text-foreground">{lat}</span></span>
          <span>Lng: <span className="font-mono font-medium text-foreground">{lng}</span></span>
        </div>
      )}
    </div>
  );
}
