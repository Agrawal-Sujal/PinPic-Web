import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import CollectionTypeStep from './CollectionTypeStep';
import PhotoSelectionStep from './PhotoSelectionStep';
import CollectionDetailsStep from './CollectionDetailsStep';

export const CreateCollectionModal = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1); // 1: Type, 2: Photos, 3: Details
  const [selectedType, setSelectedType] = useState('trip');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSelectedPhotoIds(new Set());
    setSelectedType('trip');
    onClose();
  };

  const handleTogglePhoto = (photoId) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleSelectAll = (allIds) => {
    setSelectedPhotoIds(new Set(allIds));
  };

  const handleClearAll = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleCreate = async (collectionData) => {
    try {
      setIsSubmitting(true);
      const created = await localCollectionRepository.createCollection(collectionData);
      showToast(`Trip "${created.title}" created successfully!`, 'success');
      handleClose();
      if (onCreated) onCreated(created);
      navigate(`/events/${created.id}`);
    } catch (err) {
      console.error('Failed to create collection:', err);
      showToast('Failed to create trip collection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-pinpic-coral/15 text-pinpic-coral dark:text-pinpic-coral-dark text-xs font-bold">
              {step}/3
            </span>
            <span className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              {step === 1 ? 'Choose Collection Type' : step === 2 ? 'Select Uploaded Photos' : 'Trip Story Info'}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <CollectionTypeStep
              selectedType={selectedType}
              onSelectType={setSelectedType}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <PhotoSelectionStep
              selectedPhotoIds={selectedPhotoIds}
              onTogglePhoto={handleTogglePhoto}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <CollectionDetailsStep
              selectedPhotoIds={selectedPhotoIds}
              selectedType={selectedType}
              onBack={() => setStep(2)}
              onCreate={handleCreate}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCollectionModal;
