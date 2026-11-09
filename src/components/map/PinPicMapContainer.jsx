import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useTheme } from '../../context/ThemeContext';
import { BBox } from '../../domain/map/GeoClusterIndex';

// Controller to smoothly fly to updated center coordinates
function MapCenterController({ center, zoom }) {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    if (center && (!prevCenterRef.current || prevCenterRef.current.lat !== center.lat || prevCenterRef.current.lng !== center.lng)) {
      prevCenterRef.current = center;
      map.flyTo([center.lat, center.lng], zoom || map.getZoom(), { duration: 1.0 });
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
  onCameraChange,
  onMapClick,
  children,
}) => {
  const { isDark } = useTheme();

  // 100% Free, high-resolution tiles with ZERO watermark and ZERO API key required:
  // Using ESRI Canvas (Light & Dark) with city labels & reference layers
  const baseTileUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  const refTileUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Base Map Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url={baseTileUrl}
          maxZoom={19}
        />

        {/* Reference / Labels Overlay Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url={refTileUrl}
          maxZoom={19}
          pane="overlayPane"
        />

        <MapCenterController center={center} zoom={zoom} />
        <MapEventsHandler onCameraChange={onCameraChange} onMapClick={onMapClick} />
        {children}
      </MapContainer>
    </div>
  );
};

export default PinPicMapContainer;
