import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import TripStoryLayout from './TripStoryLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const StoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await localCollectionRepository.getCollectionById(id);
      if (!data) {
        navigate('/events', { replace: true });
        return;
      }
      setCollection(data);
    } catch (err) {
      console.error('Error fetching collection story:', err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCollection();
    const unsubscribe = localCollectionRepository.subscribe(() => {
      fetchCollection();
    });
    return unsubscribe;
  }, [fetchCollection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark">
        <LoadingSpinner text="Opening your story..." />
      </div>
    );
  }

  if (!collection) return null;

  // Polymorphic dispatch based on type (currently Trip is primary)
  return <TripStoryLayout collection={collection} onReload={fetchCollection} />;
};

export default StoryPage;
