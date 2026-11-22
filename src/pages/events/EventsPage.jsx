import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  MapPin,
  Calendar,
  Plane,
  ChevronRight,
  Compass,
  Sun,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import CreateCollectionModal from '../../components/events/CreateCollectionModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const EventsPage = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const list = await localCollectionRepository.getAllCollections();
      setCollections(list || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
    const unsubscribe = localCollectionRepository.subscribe(() => {
      fetchCollections();
    });
    return unsubscribe;
  }, [fetchCollections]);

  return (
    <div className="min-h-screen pb-28 bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
      {/* Top Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-pinpic-surface-light/85 dark:bg-pinpic-surface-container-dark/85 border-b border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pinpic-coral/15 text-pinpic-coral dark:text-pinpic-coral-dark flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Collections & Events
              </h1>
              <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
                Your trips and story timelines
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-full font-bold text-xs bg-pinpic-coral dark:bg-pinpic-coral-dark text-white hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Collection</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner text="Loading your collections..." />
          </div>
        ) : collections.length === 0 ? (
          /* Empty State Required by Prompt */
          <div className="max-w-md mx-auto my-12 text-center border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8 sm:p-10 bg-pinpic-surface-light/50 dark:bg-pinpic-surface-container-dark/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-pinpic-coral/10 dark:bg-pinpic-coral-dark/10 text-pinpic-coral dark:text-pinpic-coral-dark flex items-center justify-center shadow-sm">
              <Compass className="w-8 h-8 stroke-[1.8]" />
            </div>

            <h2 className="text-lg font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Group your photos into trip, visits, and more.
            </h2>

            <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-2 leading-relaxed">
              Organize your uploaded memories into day-by-day narratives, see your route connected on the map, and replay your adventures in time order.
            </p>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 px-6 py-2.5 rounded-full font-bold text-sm bg-pinpic-coral dark:bg-pinpic-coral-dark text-white hover:opacity-95 transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Your First Trip</span>
            </button>
          </div>
        ) : (
          /* Collections Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((item) => {
              const coverUrl = item.coverPhoto?.photoUrl || item.coverPhoto?.downloadUrl;
              const dateText =
                item.startDate && item.endDate
                  ? format(new Date(item.startDate), 'MMM d, yyyy') ===
                    format(new Date(item.endDate), 'MMM d, yyyy')
                    ? format(new Date(item.startDate), 'MMM d, yyyy')
                    : `${format(new Date(item.startDate), 'MMM d')} – ${format(
                        new Date(item.endDate),
                        'MMM d, yyyy'
                      )}`
                  : null;

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/events/${item.id}`)}
                  className="group relative rounded-3xl overflow-hidden bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                >
                  {/* Cover Photo */}
                  <div className="relative w-full h-48 bg-black/10 overflow-hidden">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pinpic-coral to-pinpic-teal flex items-center justify-center text-3xl text-white">
                        {item.type === 'visit'
                          ? '📍'
                          : item.type === 'event'
                          ? '🎉'
                          : item.type === 'day_out'
                          ? '☀️'
                          : item.type === 'custom'
                          ? '✨'
                          : '✈️'}
                      </div>
                    )}

                    {/* Gradient Overlay & Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm flex items-center gap-1 backdrop-blur-sm ${
                            item.type === 'visit'
                              ? 'bg-pinpic-teal'
                              : item.type === 'event'
                              ? 'bg-purple-600'
                              : item.type === 'day_out'
                              ? 'bg-amber-500'
                              : item.type === 'custom'
                              ? 'bg-blue-600'
                              : 'bg-pinpic-coral'
                          }`}
                        >
                          {item.type === 'visit' ? (
                            <MapPin className="w-3 h-3" />
                          ) : item.type === 'event' ? (
                            <Calendar className="w-3 h-3" />
                          ) : item.type === 'day_out' ? (
                            <Sun className="w-3 h-3" />
                          ) : item.type === 'custom' ? (
                            <Sparkles className="w-3 h-3" />
                          ) : (
                            <Plane className="w-3 h-3" />
                          )}
                          <span className="capitalize">
                            {item.type === 'day_out' ? 'Day Out' : item.type || 'Trip'}
                          </span>
                        </span>

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                          {item.photoCount} photos
                        </span>
                      </div>

                      <div className="text-white">
                        <h3 className="font-extrabold text-base line-clamp-1 group-hover:text-pinpic-coral-dark transition-colors">
                          {item.title}
                        </h3>
                        {dateText && (
                          <div className="flex items-center gap-1 text-[11px] text-white/80 font-medium mt-0.5">
                            <Calendar className="w-3 h-3 text-pinpic-coral-dark" />
                            <span>{dateText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body & Actions */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark line-clamp-2 leading-relaxed">
                      {item.description || 'Open this trip story to view photos organized by day.'}
                    </p>

                    <div className="pt-3 mt-3 border-t border-pinpic-border-light dark:border-pinpic-outline-dark flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/map?collectionId=${item.id}`);
                        }}
                        className="text-xs font-bold text-pinpic-teal dark:text-pinpic-teal-dark hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>

                      <span className="text-xs font-bold text-pinpic-coral dark:text-pinpic-coral-dark flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        <span>View Story</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => fetchCollections()}
      />
    </div>
  );
};

export default EventsPage;
