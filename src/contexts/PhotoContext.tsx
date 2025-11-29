import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { fileSystemService } from '../services/filesystem';
import type { Photo, PhotoStatus } from '../types/photo';

interface PhotoContextType {
  photos: Photo[];
  loading: boolean;
  error: string | null;
  selectedPhoto: Photo | null;

  // Actions
  loadPhotos: () => Promise<void>;
  markAsPending: (photo: Photo) => Promise<void>;
  removeFromPending: (photo: Photo) => Promise<void>;
  completePhoto: (photo: Photo) => Promise<void>;
  completeAllPending: () => Promise<void>;
  selectPhoto: (photoId: string | null) => void;

  // Filters
  filterByStatus: (status: PhotoStatus | 'all') => Photo[];
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

interface PhotoProviderProps {
  children: React.ReactNode;
}

export function PhotoProvider({ children }: PhotoProviderProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  /**
   * Load all photos from the file system
   */
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loadedPhotos = await fileSystemService.loadPhotos();
      setPhotos(loadedPhotos);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark a photo as pending
   */
  const markAsPending = useCallback(
    async (photo: Photo) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.markAsPending(photo);

        if (result.success) {
          // Reload photos to reflect changes
          await loadPhotos();
        } else {
          setError(result.error || 'Failed to mark as pending');
        }
      } catch (err) {
        console.error('Error marking as pending:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to mark as pending',
        );
      } finally {
        setLoading(false);
      }
    },
    [loadPhotos],
  );

  /**
   * Remove a photo from pending (revert to camera)
   */
  const removeFromPending = useCallback(
    async (photo: Photo) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.removeFromPending(photo);

        if (result.success) {
          // Reload photos to reflect changes
          await loadPhotos();
        } else {
          setError(result.error || 'Failed to remove from pending');
        }
      } catch (err) {
        console.error('Error removing from pending:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to remove from pending',
        );
      } finally {
        setLoading(false);
      }
    },
    [loadPhotos],
  );

  /**
   * Complete a photo (move to completed folder)
   */
  const completePhoto = useCallback(
    async (photo: Photo) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.completePhoto(photo);

        if (result.success) {
          // Reload photos to reflect changes
          await loadPhotos();
        } else {
          setError(result.error || 'Failed to complete photo');
        }
      } catch (err) {
        console.error('Error completing photo:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to complete photo',
        );
      } finally {
        setLoading(false);
      }
    },
    [loadPhotos],
  );

  /**
   * Complete all pending photos
   */
  const completeAllPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fileSystemService.completeAllPending();

      if (result.success) {
        // Reload photos to reflect changes
        await loadPhotos();
      } else {
        setError(result.error || 'Failed to complete all pending photos');
      }
    } catch (err) {
      console.error('Error completing all pending:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to complete all pending',
      );
    } finally {
      setLoading(false);
    }
  }, [loadPhotos]);

  /**
   * Select a photo by ID
   */
  const selectPhoto = useCallback(
    (photoId: string | null) => {
      if (!photoId) {
        setSelectedPhoto(null);
        return;
      }

      const photo = photos.find((p) => p.id === photoId);
      setSelectedPhoto(photo || null);
    },
    [photos],
  );

  /**
   * Filter photos by status
   */
  const filterByStatus = useCallback(
    (status: PhotoStatus | 'all'): Photo[] => {
      if (status === 'all') {
        return photos;
      }
      return photos.filter((p) => p.status === status);
    },
    [photos],
  );

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Update selected photo when photos change
  useEffect(() => {
    if (selectedPhoto) {
      const updated = photos.find((p) => p.id === selectedPhoto.id);
      if (updated) {
        setSelectedPhoto(updated);
      }
    }
  }, [photos, selectedPhoto]);

  const value: PhotoContextType = {
    photos,
    loading,
    error,
    selectedPhoto,
    loadPhotos,
    markAsPending,
    removeFromPending,
    completePhoto,
    completeAllPending,
    selectPhoto,
    filterByStatus,
  };

  return (
    <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>
  );
}

/**
 * Hook to access the photo context
 */
export function usePhotos() {
  const context = useContext(PhotoContext);

  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }

  return context;
}
