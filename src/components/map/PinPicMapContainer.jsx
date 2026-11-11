import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useTheme } from '../../context/ThemeContext';
import { BBox } from '../../domain/map/GeoClusterIndex';

// Controller to smoothly fly to updated center coordinates
function MapCenterController({ center, zoom }) {
  const map = useMap();
  const prevCenterRef = useRef(center);
  const prevZoomRef = useRef(zoom);

  useEffect(() => {
    if (!center) return;
    const centerChanged =
      !prevCenterRef.current ||
      prevCenterRef.current.lat !== center.lat ||
      prevCenterRef.current.lng !== center.lng;
    const zoomChanged = zoom !== undefined && zoom !== prevZoomRef.current;

    if (centerChanged || zoomChanged) {
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;
      map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 1.0 });
    }
  }, [center, zoom, map]);

  return null;
}

// Event handler reporting camera bounds and clicks
function MapEventsHandler({ onCameraChange, onMapClick }) {
  const map = useMap();

  const reportCamera = () => {
    if (!onCameraChange) return;
    const bounds = map.getBounds();
    const currentZoom = Math.floor(map.getZoom());
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const bbox = new BBox(
      sw.lng,
      sw.lat,
      ne.lng,
      ne.lat
    );

    onCameraChange({
      bbox,
      zoom: currentZoom,
      center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
    });
  };

  useMapEvents({
    load() {
      reportCamera();
    },
    moveend() {
      reportCamera();
    },
    zoomend() {
      reportCamera();
    },
    click(e) {
      if (onMapClick && e.latlng) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  // Initial report on mount
  useEffect(() => {
    reportCamera();
  }, []);

  return null;
}

export const PinPicMapContainer = ({
  center = { lat: 20.5937, lng: 78.9629 },
  zoom = 5,
  isSelectingLocation = false,
  onCameraChange,
  onMapClick,
  children,
}) => {
  const { isDark } = useTheme();

  // Pure OpenStreetMap (100% free, no API keys, no watermarks, full global coverage)
  const osmTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
  const tileClassName = isDark ? 'dark-osm-tiles' : 'light-osm-tiles';

  return (
    <div className={`relative w-full h-full ${isSelectingLocation ? 'cursor-crosshair' : ''}`}>
      {/* Hidden SVG Color Matrix Filters: Color-grades OpenStreetMap raster tiles to match Android app's Google Map theme (light.json & dark.json) */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      >
        <defs>
          {/* Light Mode: Maps OSM tiles to warm cream land (#f8f4f0), pastel blue water (#b6d2ec), sage green parks (#d8e8c8), amber highways (#ffcc88) */}
          <filter id="osm-light-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.863  0.178 -0.004 0 -0.007
               -0.028  0.933  0.105 0 -0.006
               -0.573  0.665  0.911 0 -0.009
                0      0      0     1  0"
            />
          </filter>

          {/* Dark Mode: Maps OSM tiles to dark slate land (#0f0f0f), slate navy water (#2d343b), dark olive parks (#1b1d19), dark amber highways (#3f3322) */}
          <filter id="osm-dark-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.141 -0.908 -0.151 0  0.943
               -0.046 -0.784 -0.089 0  0.942
               -0.222 -0.768  0.070 0  0.940
                0      0      0     1  0"
            />
          </filter>
        </defs>
      </svg>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className={`w-full h-full ${isSelectingLocation ? 'cursor-crosshair' : ''}`}
      >
        {/* OpenStreetMap Tile Layer: tileSize=128 + zoomOffset=1 renders high-DPI tiles, making road lines 50% thinner and crisp */}
        <TileLayer
          attribution={attribution}
          url={osmTileUrl}
          subdomains="abc"
          className={tileClassName}
          tileSize={128}
          zoomOffset={1}
          maxNativeZoom={18}
          maxZoom={20}
        />

        <MapCenterController center={center} zoom={zoom} />
        <MapEventsHandler onCameraChange={onCameraChange} onMapClick={onMapClick} />
        {children}
      </MapContainer>
    </div>
  );
};

export default PinPicMapContainer;
