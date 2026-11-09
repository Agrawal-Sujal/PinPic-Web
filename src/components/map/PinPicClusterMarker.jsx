import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

/**
 * Creates custom HTML divIcon for Leaflet matching PinPic Android (MarkerIconFactory / PhotoMapMarker).
 *
 * Renders:
 * - When count > 1 (Aggregate Cluster): Teal outline with photo count badge.
 * - When count == 1 (Leaf Cluster): Coral pointer pin with photo thumbnail.
 */
function createClusterDivIcon(node, isSelected = false) {
  const count = node.count || 1;
  const isCluster = count > 1;
  const thumbUrl = node.thumbnailUrl;

  if (isCluster) {
    const badgeText = count > 99 ? '99+' : count;
    const bgImage = thumbUrl
      ? `background-image: url('${thumbUrl}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #f56a41, #F0997B);`;

    return L.divIcon({
      className: 'pinpic-cluster-marker-wrapper',
      html: `
        <div class="custom-cluster-marker" style="
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          border: 3px solid #1D9E75;
          ${bgImage}
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background-color: #f56a41;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            min-width: 20px;
            height: 20px;
            padding: 0 4px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          ">${badgeText}</div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }

  // Single Leaf Cluster Pin
  const borderColor = isSelected ? '#1D9E75' : '#f56a41';
  const bgImage = thumbUrl
    ? `background-image: url('${thumbUrl}'); background-size: cover; background-position: center;`
    : `background-color: #f56a41;`;

  return L.divIcon({
    className: 'pinpic-pin-marker-wrapper',
    html: `
      <div class="custom-pin-marker" style="
        position: relative;
        width: 44px;
        height: 44px;
        border-radius: 9999px;
        border: 3px solid ${borderColor};
        ${bgImage}
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${borderColor};
        "></div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 48],
  });
}

export const PinPicClusterMarker = ({ node, isSelected = false, onClick }) => {
  const icon = useMemo(() => createClusterDivIcon(node, isSelected), [node, isSelected]);

  if (!node || node.lat == null || node.lon == null) return null;

  return (
    <Marker
      position={[node.lat, node.lon]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onClick(node);
        },
      }}
    />
  );
};

export default PinPicClusterMarker;

