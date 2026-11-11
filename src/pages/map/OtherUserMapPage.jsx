import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../api/userApi';
import PinPicMapContainer from '../../components/map/PinPicMapContainer';
import PinPicClusterMarker from '../../components/map/PinPicClusterMarker';
import SelectedPhotoCard from '../../components/map/SelectedPhotoCard';
import SelectedClusterSheet from '../../components/map/SelectedClusterSheet';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import MapClusteringSystem from '../../domain/map/MapClusteringSystem';

export const OtherUserMapPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const clusteringSystem = useRef(new MapClusteringSystem());
  const [profile, setProfile] = useState(null);
  const [clustersData, setClustersData] = useState([]);
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);
  const lastCameraRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedClusterDetail, setSelectedClusterDetail] = useState(null);

  const [fullScreenPhotos, setFullScreenPhotos] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, clustersRes] = await Promise.all([
        userApi.getUserProfile(userId).catch(() => null),
        userApi.getUserClusters(userId).catch(() => []),
      ]);

      if (profileRes) setProfile(profileRes);
      const clusters = clustersRes || [];
      setClustersData(clusters);

      // Build KD-Tree spatial index over other user's clusters
      clusteringSystem.current.build(clusters, 40.0);

      if (clusters.length > 0 && clusters[0].location?.latitude != null && clusters[0].location?.longitude != null) {
        const first = clusters[0].location;
        setMapCenter({ lat: first.latitude, lng: first.longitude });
        setMapZoom(13);
      }

      if (lastCameraRef.current) {
        const { bbox, zoom } = lastCameraRef.current;
        const nodes = clusteringSystem.current.getClusters(bbox, zoom);
        setVisibleNodes(nodes);
      }
    } catch (err) {
      console.error('Error fetching other user map data:', err);
      showToast('Failed to load user map', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    if (userId) fetchMapData();
  }, [userId, fetchMapData]);

  const handleCameraChange = useCallback(({ bbox, zoom, center }) => {
    lastCameraRef.current = { bbox, zoom, center };
    const nodes = clusteringSystem.current.getClusters(bbox, zoom);
    setVisibleNodes(nodes);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);

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
        name: 'Shared Moment',
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

  const selectedPhotoForCard = selectedNode && !selectedNode.isCluster && selectedNode.count === 1
    ? {
        photoId: selectedNode.pointId || String(selectedNode.id),
        name: selectedNode.originalCluster?.photos?.[0]?.name || 'Shared Moment',
        downloadUrl: selectedNode.thumbnailUrl,
        location: { latitude: selectedNode.lat, longitude: selectedNode.lon },
        takenAt: selectedNode.originalCluster?.photos?.[0]?.takenAt || null,
        visibility: selectedNode.originalCluster?.visibility || 'PUBLIC',
      }
    : null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Top Header Floating */}
      <div className="absolute top-4 left-4 z-30 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-full backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md hover:bg-black/5"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark" />
        </button>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md bg-pinpic-surface-light/90 dark:bg-pinpic-surface-container-dark/90 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-md">
          <span className="text-xs font-bold truncate max-w-[150px]">
            {profile ? `@${profile.username}'s Map` : 'User Map'}
          </span>
          <span className="text-[11px] font-semibold text-pinpic-teal dark:text-pinpic-teal-dark border-l border-pinpic-border-light pl-2">
            {clustersData.length} clusters
          </span>
        </div>
      </div>

      {/* Refresh Map Button */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <button
          onClick={fetchMapData}
          title="Refresh Map"
          className="p-3 rounded-full bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-lg hover:bg-black/5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark transition-transform active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <PinPicMapContainer
        center={mapCenter}
        zoom={mapZoom}
        onCameraChange={handleCameraChange}
      >
        {visibleNodes.map((node) => (
          <PinPicClusterMarker
            key={`cluster-${node.id}`}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={handleNodeClick}
          />
        ))}
      </PinPicMapContainer>

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

      <FullScreenImageViewer
        photos={fullScreenPhotos}
        initialIndex={fullScreenIndex}
        isOpen={fullScreenPhotos.length > 0}
        onClose={() => setFullScreenPhotos([])}
      />
    </div>
  );
};

export default OtherUserMapPage;
