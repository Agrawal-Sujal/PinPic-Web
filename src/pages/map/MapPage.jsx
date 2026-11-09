import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Navigation, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../api/userApi';
import PinPicMapContainer from '../../components/map/PinPicMapContainer';
import PinPicClusterMarker from '../../components/map/PinPicClusterMarker';
import SelectedPhotoCard from '../../components/map/SelectedPhotoCard';
import SelectedClusterSheet from '../../components/map/SelectedClusterSheet';
import AddPhotoModal from '../../components/map/AddPhotoModal';
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

  // Selection state
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedClusterDetail, setSelectedClusterDetail] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);

  // Fullscreen viewer
  const [fullScreenPhotos, setFullScreenPhotos] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  // Fetch clusters from backend and build hierarchical KD-Tree spatial index
  const fetchAndIndexClusters = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      const res = await userApi.getUserClusters(user.userId).catch(() => []);
      const clusters = res || [];
      setClustersData(clusters);

      // Build GeoClusterIndex with KD-Tree
      clusteringSystem.current.build(clusters, 40.0);

      // Center on first cluster if exists
      if (clusters.length > 0 && clusters[0].location?.latitude) {
        const first = clusters[0].location;
        setMapCenter({ lat: first.latitude, lng: first.longitude });
        setMapZoom(13);
      }

      // Re-query current camera if already loaded
      if (lastCameraRef.current) {
        const { bbox, zoom } = lastCameraRef.current;
        const nodes = clusteringSystem.current.getClusters(bbox, zoom);
        setVisibleNodes(nodes);
      }
    } catch (err) {
      console.error('Error fetching user clusters:', err);
      showToast('Failed to load clusters', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.userId, showToast]);

  useEffect(() => {
    fetchAndIndexClusters();
  }, [fetchAndIndexClusters]);

  // Fast O(log N) camera-idle query over KD-Tree
  const handleCameraChange = useCallback(({ bbox, zoom, center }) => {
    lastCameraRef.current = { bbox, zoom, center };
    const nodes = clusteringSystem.current.getClusters(bbox, zoom);
    setVisibleNodes(nodes);
  }, []);

  const handleNodeClick = useCallback((node) => {
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
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setMapZoom(14);
        showToast('Moved to your location', 'info');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showToast('Could not get your location', 'error');
      }
    );
  };

  const handleMapClick = (latlng) => {
    setClickedLocation(latlng);
  };

  const handlePhotoUploaded = (newPhoto) => {
    fetchAndIndexClusters();
    if (newPhoto.location?.latitude && newPhoto.location?.longitude) {
      setMapCenter({ lat: newPhoto.location.latitude, lng: newPhoto.location.longitude });
      setMapZoom(15);
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
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md">
          <LogoHeader size="sm" />
          <span className="text-xs font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark border-l border-pinpic-border-light dark:border-pinpic-outline-dark pl-2.5">
            {clustersData.length} Clusters
          </span>
        </div>
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
          onClick={fetchAndIndexClusters}
          title="Refresh Clusters"
          className="p-3 rounded-full bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-lg hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark transition-transform active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 stroke-[2] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Add Photo Floating Action Button (FAB) at Bottom Right */}
      <div className="absolute bottom-24 right-5 sm:bottom-8 sm:right-8 z-30 pointer-events-auto">
        <button
          onClick={() => {
            setClickedLocation(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 py-3.5 px-5 rounded-full bg-pinpic-coral hover:bg-pinpic-coral/95 text-white font-bold shadow-xl shadow-pinpic-coral/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="text-sm">Pin Photo</span>
        </button>
      </div>

      {/* PinPic Interactive Map Container (Zero API Key, No Auth Errors) */}
      <PinPicMapContainer
        center={mapCenter}
        zoom={mapZoom}
        onCameraChange={handleCameraChange}
        onMapClick={handleMapClick}
      >
        {/* Render ONLY spatial clusters computed by the KD-Tree GeoClusterIndex */}
        {visibleNodes.map((node) => (
          <PinPicClusterMarker
            key={`cluster-${node.id}`}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={handleNodeClick}
          />
        ))}
      </PinPicMapContainer>

      {/* Selected Single Photo Card */}
      {selectedPhotoForCard && (
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

      {/* Add Photo Modal */}
      <AddPhotoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialLocation={clickedLocation}
        onPhotoUploaded={handlePhotoUploaded}
      />

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
