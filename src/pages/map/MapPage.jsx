import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Navigation, RefreshCw, X, Cloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { localPhotoRepository } from '../../data/localPhotoRepository';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import PinPicMapContainer from '../../components/map/PinPicMapContainer';
import PinPicClusterMarker from '../../components/map/PinPicClusterMarker';
import DroppedPinMarker from '../../components/map/DroppedPinMarker';
import SelectedPhotoCard from '../../components/map/SelectedPhotoCard';
import SelectedClusterSheet from '../../components/map/SelectedClusterSheet';
import AddPhotoBottomSheet from '../../components/map/AddPhotoBottomSheet';
import DatePickerModal from '../../components/map/DatePickerModal';
import TimePickerModal from '../../components/map/TimePickerModal';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import LogoHeader from '../../components/common/LogoHeader';
import MapClusteringSystem from '../../domain/map/MapClusteringSystem';

export const MapPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const clusteringSystem = useRef(new MapClusteringSystem());
  const [clustersData, setClustersData] = useState([]);
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);
  const lastCameraRef = useRef(null);
  const hasAutoCenteredRef = useRef(false);

  // Selection state
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedClusterDetail, setSelectedClusterDetail] = useState(null);

  // Add Photo 3-Step Flow state matching Android AddPhotoMode
  const [addPhotoMode, setAddPhotoMode] = useState('NONE'); // 'NONE' | 'SELECT_LOCATION' | 'LOCATION_SELECTED' | 'PHOTOS_SELECTED'
  const [selectedAddPhotoLocation, setSelectedAddPhotoLocation] = useState(null); // { lat, lng }
  const [pendingPhotos, setPendingPhotos] = useState([]); // [{ file, previewUrl, name }]
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Fullscreen viewer
  const [fullScreenPhotos, setFullScreenPhotos] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  const { isSyncing, triggerSync } = useSyncStatus();

  // Fetch clusters from local database and build hierarchical KD-Tree spatial index
  const fetchAndIndexClusters = useCallback(async () => {
    try {
      setLoading(true);
      const clusters = await localPhotoRepository.getUnMergedClusters();
      setClustersData(clusters);

      // Build GeoClusterIndex with KD-Tree
      clusteringSystem.current.build(clusters, 40.0);

      // Center once on the latest cluster with valid coordinates if camera hasn't been auto-centered yet
      if (!hasAutoCenteredRef.current) {
        const targetCluster = [...clusters]
          .reverse()
          .find((c) => c.location?.latitude != null && c.location?.longitude != null);
        if (targetCluster) {
          hasAutoCenteredRef.current = true;
          const { latitude, longitude } = targetCluster.location;
          setMapCenter({ lat: latitude, lng: longitude });
          setMapZoom(13);
        }
      }

      // Re-query current camera if already loaded
      if (lastCameraRef.current) {
        const { bbox, zoom } = lastCameraRef.current;
        const nodes = clusteringSystem.current.getClusters(bbox, zoom);
        setVisibleNodes(nodes);
      }
    } catch (err) {
      console.error('Error loading local clusters:', err);
      showToast('Failed to load clusters', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAndIndexClusters();
    // Subscribe to local repository changes
    const unsubscribe = localPhotoRepository.subscribe(() => {
      fetchAndIndexClusters();
    });
    return unsubscribe;
  }, [fetchAndIndexClusters]);

  // Fast O(log N) camera-idle query over KD-Tree
  const handleCameraChange = useCallback(({ bbox, zoom, center }) => {
    lastCameraRef.current = { bbox, zoom, center };
    const nodes = clusteringSystem.current.getClusters(bbox, zoom);
    setVisibleNodes(nodes);
  }, []);

  const handleNodeClick = useCallback((node) => {
    // If user is currently in add photo flow, do not intercept with node details
    if (addPhotoMode !== 'NONE') return;

    setSelectedNode(node);

    // Expand leaf clusters from KD-tree hierarchy
    const leaves = clusteringSystem.current.getLeaves(node.id);
    let photos = [];

    leaves.forEach((leaf) => {
      if (leaf.originalCluster?.photos) {
        photos.push(...leaf.originalCluster.photos);
      } else if (leaf.originalCluster?.downloadUrl) {
        photos.push(leaf.originalCluster);
      }
    });

    if (photos.length === 0 && node.thumbnailUrl) {
      photos.push({
        photoId: node.pointId || String(node.id),
        name: 'Pinned Memory',
        downloadUrl: node.thumbnailUrl,
        location: { latitude: node.lat, longitude: node.lon },
      });
    }

    if (node.isCluster || photos.length > 1) {
      setSelectedClusterDetail({
        clusterId: node.id,
        photoCount: node.count,
        location: { latitude: node.lat, longitude: node.lon },
        photos,
      });
    }
  }, [addPhotoMode]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setMapZoom(15);

        // If in add photo mode, set location to current GPS coords
        if (addPhotoMode === 'SELECT_LOCATION' || addPhotoMode === 'LOCATION_SELECTED') {
          setSelectedAddPhotoLocation({ lat: latitude, lng: longitude });
          setAddPhotoMode('LOCATION_SELECTED');
          showToast('Dropped pin at your current location', 'info');
        } else {
          showToast('Moved to your location', 'info');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showToast('Could not get your location', 'error');
      }
    );
  };

  const handleMapClick = (latlng) => {
    if (addPhotoMode === 'SELECT_LOCATION' || addPhotoMode === 'LOCATION_SELECTED') {
      setSelectedAddPhotoLocation(latlng);
      setAddPhotoMode('LOCATION_SELECTED');
    } else if (addPhotoMode === 'PHOTOS_SELECTED') {
      // Allow moving the pin even after photos are picked
      setSelectedAddPhotoLocation(latlng);
    } else {
      setSelectedNode(null);
      setSelectedClusterDetail(null);
    }
  };

  // Step 2 & Step 3: Handle photos selected from file picker
  const handleSelectPhotos = (files) => {
    if (!files || files.length === 0) return;

    const newItems = files.map((file) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingPhotos((prev) => {
      const isFirstSelection = prev.length === 0;

      // Default Date (DD/MM/YYYY) and Time (hh:mm a) on first selection
      if (isFirstSelection) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        setDateText(`${dd}/${mm}/${yyyy}`);

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const formattedHours = String(hours).padStart(2, '0');
        setTimeText(`${formattedHours}:${minutes} ${period}`);
      }

      // Add distinct files
      const combined = [...prev];
      newItems.forEach((item) => {
        if (!combined.some((p) => p.file.name === item.file.name && p.file.size === item.file.size)) {
          combined.push(item);
        }
      });
      return combined;
    });

    setAddPhotoMode('PHOTOS_SELECTED');
  };

  const handleRemovePhoto = (index) => {
    setPendingPhotos((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setAddPhotoMode('LOCATION_SELECTED');
      }
      return updated;
    });
  };

  const handleCancelAddPhoto = () => {
    setAddPhotoMode('NONE');
    setSelectedAddPhotoLocation(null);
    pendingPhotos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPendingPhotos([]);
    setDateText('');
    setTimeText('');
  };

  // Step 3: Submit and upload all selected photos
  const handleSubmitAddPhotos = async () => {
    if (!selectedAddPhotoLocation) {
      showToast('Please select a location first', 'error');
      return;
    }
    if (pendingPhotos.length === 0) {
      showToast('Please select at least one photo', 'error');
      return;
    }

    // Parse dateText (DD/MM/YYYY) and timeText (hh:mm a) into LocalDateTime ISO format
    let isoDateStr = new Date().toISOString();
    try {
      let year, month, day;
      const ddmmyyyy = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        day = parseInt(ddmmyyyy[1], 10);
        month = parseInt(ddmmyyyy[2], 10) - 1;
        year = parseInt(ddmmyyyy[3], 10);
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
        day = now.getDate();
      }

      let hours = 12;
      let minutes = 0;
      const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const p = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        hours = h;
        minutes = m;
      }

      const constructedDate = new Date(year, month, day, hours, minutes, 0);
      const yyyy = constructedDate.getFullYear();
      const mm = String(constructedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(constructedDate.getDate()).padStart(2, '0');
      const hh = String(constructedDate.getHours()).padStart(2, '0');
      const min = String(constructedDate.getMinutes()).padStart(2, '0');
      const ss = String(constructedDate.getSeconds()).padStart(2, '0');
      isoDateStr = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
    } catch (err) {
      console.warn('Error parsing date/time:', err);
    }

    try {
      setIsUploading(true);

      await localPhotoRepository.savePhotosWithCluster({
        photos: pendingPhotos,
        location: {
          latitude: selectedAddPhotoLocation.lat,
          longitude: selectedAddPhotoLocation.lng,
          locationName: null,
        },
        dateStr: isoDateStr,
        userId: user?.userId,
        visibility: 'PUBLIC',
      });

      const count = pendingPhotos.length;
      showToast(`Pinned ${count} photo${count > 1 ? 's' : ''}! Syncing in background...`, 'success');

      // Refresh clusters locally & pan camera immediately
      hasAutoCenteredRef.current = true;
      await fetchAndIndexClusters();
      setMapCenter({ lat: selectedAddPhotoLocation.lat, lng: selectedAddPhotoLocation.lng });
      setMapZoom(15);

      // Clean up and reset
      handleCancelAddPhoto();
    } catch (err) {
      console.error('Photo save error:', err);
      showToast('Failed to save photos', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const selectedPhotoForCard = selectedNode && !selectedNode.isCluster && selectedNode.count === 1
    ? {
        photoId: selectedNode.pointId || String(selectedNode.id),
        name: selectedNode.originalCluster?.photos?.[0]?.name || 'Pinned Memory',
        downloadUrl: selectedNode.thumbnailUrl,
        location: { latitude: selectedNode.lat, longitude: selectedNode.lon },
        takenAt: selectedNode.originalCluster?.photos?.[0]?.takenAt || null,
        visibility: selectedNode.originalCluster?.visibility || 'PUBLIC',
      }
    : null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Floating Top Header */}
      <div className="absolute top-4 left-4 z-30 pointer-events-auto">
        {addPhotoMode === 'NONE' ? (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md">
            <LogoHeader size="sm" />
            <span className="text-xs font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark border-l border-pinpic-border-light dark:border-pinpic-outline-dark pl-2">
              {clustersData.length} Clusters
            </span>
          </div>
        ) : (
          <button
            onClick={handleCancelAddPhoto}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md bg-pinpic-surface-light/95 dark:bg-pinpic-surface-container-dark/95 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md text-pinpic-coral hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
            title="Cancel Add Photo"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Cancel
            </span>
          </button>
        )}
      </div>

      {/* Floating Action Controls on Map (Top Right) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleLocateMe}
          title="Current Location"
          className="p-3 rounded-full bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-lg hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-coral transition-transform active:scale-95"
        >
          <Navigation className="w-5 h-5 stroke-[2.2]" />
        </button>

        <button
          onClick={() => {
            fetchAndIndexClusters();
            triggerSync(user?.userId);
          }}
          title={isSyncing ? 'Syncing with cloud...' : 'Refresh & Sync'}
          className="p-3 rounded-full bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-lg hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark transition-transform active:scale-95"
        >
          <RefreshCw
            className={`w-5 h-5 stroke-[2] ${loading || isSyncing ? 'animate-spin text-pinpic-coral' : ''}`}
          />
        </button>
      </div>

      {/* Add Photo Floating Action Button (FAB) at Bottom Right - only when addPhotoMode is NONE */}
      {addPhotoMode === 'NONE' && (
        <div className="absolute bottom-24 right-5 sm:bottom-8 sm:right-8 z-30 pointer-events-auto animate-in fade-in zoom-in-90">
          <button
            onClick={() => {
              setSelectedNode(null);
              setSelectedClusterDetail(null);
              setAddPhotoMode('SELECT_LOCATION');
            }}
            className="flex items-center gap-2 py-3.5 px-5 rounded-full bg-pinpic-coral hover:bg-pinpic-coral/95 text-white font-bold shadow-xl shadow-pinpic-coral/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="text-sm">Pin Photo</span>
          </button>
        </div>
      )}

      {/* OpenStreetMap with Android App Map Theme Palette */}
      <PinPicMapContainer
        center={mapCenter}
        zoom={mapZoom}
        isSelectingLocation={addPhotoMode === 'SELECT_LOCATION' || addPhotoMode === 'LOCATION_SELECTED'}
        onCameraChange={handleCameraChange}
        onMapClick={handleMapClick}
      >
        {visibleNodes.map((node) => (
          <PinPicClusterMarker
            key={`cluster-${node.id}`}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={handleNodeClick}
          />
        ))}

        {selectedAddPhotoLocation && (
          <DroppedPinMarker
            position={selectedAddPhotoLocation}
            onDragEnd={(newPos) => setSelectedAddPhotoLocation(newPos)}
          />
        )}
      </PinPicMapContainer>

      {/* Add Photo 3-Step Bottom Sheet */}
      <AddPhotoBottomSheet
        addPhotoMode={addPhotoMode}
        selectedLocation={selectedAddPhotoLocation}
        pendingPhotos={pendingPhotos}
        onSelectPhotos={handleSelectPhotos}
        onRemovePhoto={handleRemovePhoto}
        dateText={dateText}
        onDateTextChange={setDateText}
        onOpenDatePicker={() => setIsDatePickerOpen(true)}
        timeText={timeText}
        onTimeTextChange={setTimeText}
        onOpenTimePicker={() => setIsTimePickerOpen(true)}
        onSubmit={handleSubmitAddPhotos}
        onCancel={handleCancelAddPhoto}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        initialDate={dateText}
        onSelectDate={(newDate) => setDateText(newDate)}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        initialTime={timeText}
        onSelectTime={(newTime) => setTimeText(newTime)}
      />

      {/* Selected Single Photo Card */}
      {addPhotoMode === 'NONE' && selectedPhotoForCard && (
        <SelectedPhotoCard
          photo={selectedPhotoForCard}
          onClose={() => setSelectedNode(null)}
          onViewFull={() => {
            setFullScreenPhotos([selectedPhotoForCard]);
            setFullScreenIndex(0);
          }}
        />
      )}

      {/* Selected Aggregate Cluster Bottom Sheet */}
      {addPhotoMode === 'NONE' && (
        <SelectedClusterSheet
          cluster={selectedClusterDetail}
          onClose={() => setSelectedClusterDetail(null)}
          onSelectPhoto={(photo) => {
            setFullScreenPhotos(selectedClusterDetail.photos);
            const idx = selectedClusterDetail.photos.findIndex(
              (p) => (p.photoId || p.id) === (photo.photoId || photo.id)
            );
            setFullScreenIndex(Math.max(0, idx));
          }}
        />
      )}

      {/* Full-Screen Image Viewer */}
      <FullScreenImageViewer
        photos={fullScreenPhotos}
        initialIndex={fullScreenIndex}
        isOpen={fullScreenPhotos.length > 0}
        onClose={() => setFullScreenPhotos([])}
      />
    </div>
  );
};

export default MapPage;
