import React, { useRef, useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { AlertTriangle, ExternalLink, Key } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { lightMapStyle, darkMapStyle } from './mapStyles';
import { BBox } from '../../domain/map/GeoClusterIndex';

// Google Maps API Key from environment variable or Android manifest
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCLowNkZjgzZLaGA-NdlUbMT1JxbbGW8aM';

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

export const GoogleMapWrapper = ({
  center = defaultCenter,
  zoom = 5,
  onCameraChange,
  onMapClick,
  children,
}) => {
  const { isDark } = useTheme();
  const mapRef = useRef(null);
  const [authFailed, setAuthFailed] = useState(false);

  // Catch Google Maps API Authentication/Activation Errors
  useEffect(() => {
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn('Google Maps Authentication/Activation Failure (ApiNotActivatedMapError)');
      setAuthFailed(true);
      if (typeof originalAuthFailure === 'function') {
        originalAuthFailure();
      }
    };

    return () => {
      window.gm_authFailure = originalAuthFailure;
    };
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const handleOnLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleIdle = useCallback(() => {
    if (!mapRef.current || !onCameraChange) return;

    const bounds = mapRef.current.getBounds();
    const currentZoom = mapRef.current.getZoom();
    if (!bounds || currentZoom == null) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const bbox = new BBox(
      sw.lng(),
      sw.lat(),
      ne.lng(),
      ne.lat()
    );

    onCameraChange({
      bbox,
      zoom: Math.floor(currentZoom),
      center: { lat: mapRef.current.getCenter().lat(), lng: mapRef.current.getCenter().lng() },
    });
  }, [onCameraChange]);

  const mapOptions = {
    styles: isDark ? darkMapStyle : lightMapStyle,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light">
        <p className="text-sm font-semibold text-red-500 mb-2">Error loading Google Maps</p>
        <p className="text-xs text-neutral-500">{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-pinpic-coral" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Banner if Google Maps JavaScript API is not enabled on this API key */}
      {authFailed && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 bg-amber-500/95 dark:bg-amber-600/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
            <div className="text-xs space-y-1.5">
              <p className="font-bold text-sm">Google Maps API Not Activated</p>
              <p className="leading-relaxed opacity-95">
                The current API key only has Android Maps enabled. You need to enable <strong>"Maps JavaScript API"</strong> for web in Google Cloud Console.
              </p>
              <div className="pt-1 flex flex-col gap-1 text-[11px]">
                <a
                  href="https://console.cloud.google.com/google/maps-apis/api-list"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                >
                  <span>1. Enable Maps JavaScript API in Google Cloud</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="opacity-90">
                  2. Update key in <code className="bg-black/20 px-1 py-0.5 rounded font-mono">PinPic-Web/.env</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={handleOnLoad}
        onIdle={handleIdle}
        onClick={(e) => {
          if (onMapClick && e.latLng) {
            onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        }}
      >
        {children}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapWrapper;
