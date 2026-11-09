import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

/**
 * Creates custom HTML divIcon for the dropped pin marker matching
 * Android's BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED).
 */
function createDroppedPinIcon() {
  return L.divIcon({
    className: 'pinpic-dropped-pin-wrapper',
    html: `
      <div class="dropped-pin-marker" style="
        position: relative;
        width: 32px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
        animation: pinDrop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      ">
        <svg viewBox="0 0 32 42" width="32" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin body -->
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 13.5 24.5 15.1 26.1.5.5 1.3.5 1.8 0C18.5 40.5 32 26.5 32 16 32 7.163 24.837 0 16 0z" fill="#EA4335"/>
          <path d="M16 2C8.268 2 2 8.268 2 16c0 8.8 11.2 21.3 14 24.4 2.8-3.1 14-15.6 14-24.4 0-7.732-6.268-14-14-14z" fill="#D93025"/>
          <!-- Inner circle -->
          <circle cx="16" cy="15" r="6" fill="#FFFFFF"/>
          <circle cx="16" cy="15" r="3.5" fill="#B3261E"/>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

export const DroppedPinMarker = ({ position, onDragEnd }) => {
  const icon = useMemo(() => createDroppedPinIcon(), []);

  if (!position || position.lat == null || position.lng == null) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={icon}
      draggable={!!onDragEnd}
      eventHandlers={
        onDragEnd
          ? {
              dragend: (e) => {
                const marker = e.target;
                const newPos = marker.getLatLng();
                onDragEnd({ lat: newPos.lat, lng: newPos.lng });
              },
            }
          : undefined
      }
    />
  );
};

export default DroppedPinMarker;
