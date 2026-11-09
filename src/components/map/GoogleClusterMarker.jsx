import React from 'react';
import { OverlayViewF } from '@react-google-maps/api';

/**
 * Custom Cluster Marker on Google Maps matching PinPic Android (MarkerIconFactory / PhotoMapMarker).
 *
 * Renders:
 * - When count > 1 (Aggregate Cluster): Teal outline with photo count badge.
 * - When count == 1 (Leaf Cluster): Coral pointer pin with photo thumbnail.
 */
export const GoogleClusterMarker = ({ node, isSelected = false, onClick }) => {
  if (!node || node.lat == null || node.lon == null) return null;

  const position = { lat: node.lat, lng: node.lon };
  const count = node.count || 1;
  const isCluster = count > 1;
  const thumbUrl = node.thumbnailUrl;

  return (
    <OverlayViewF
      position={position}
      mapPaneName="overlayMouseTarget"
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: isCluster ? -(height / 2) : -height,
      })}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        className="cursor-pointer select-none transition-transform hover:scale-110 active:scale-95 group"
        style={{ zIndex: isSelected ? 9999 : 100 }}
      >
        {isCluster ? (
          /* Aggregate Cluster Pin */
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-pinpic-teal bg-pinpic-coral shadow-lg overflow-visible">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt="Cluster"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-pinpic-coral to-amber-500 rounded-full" />
            )}

            {/* Badge Counter */}
            <div className="absolute -top-1.5 -right-1.5 bg-pinpic-coral border-2 border-white dark:border-pinpic-surface-dark text-white text-[11px] font-extrabold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center shadow-md">
              {count > 99 ? '99+' : count}
            </div>
          </div>
        ) : (
          /* Single Cluster Pin with Pointer */
          <div className="relative flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-full border-[3px] bg-white overflow-hidden shadow-xl transition-all ${
                isSelected ? 'border-pinpic-teal ring-4 ring-pinpic-teal/30 scale-105' : 'border-pinpic-coral'
              }`}
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt="Pin"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-pinpic-coral/20 flex items-center justify-center text-pinpic-coral font-bold text-xs">
                  Pin
                </div>
              )}
            </div>

            {/* Drop Pin Pointer */}
            <div
              className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent -mt-0.5 ${
                isSelected ? 'border-t-[8px] border-t-pinpic-teal' : 'border-t-[8px] border-t-pinpic-coral'
              }`}
            />
          </div>
        )}
      </div>
    </OverlayViewF>
  );
};

export default GoogleClusterMarker;
