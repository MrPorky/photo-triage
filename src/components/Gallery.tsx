import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePhotos } from '@/hooks/usePhotos';
import type { Photo } from '../types/photo';
import PhotoDetail from './PhotoDetail';
import { PhotoThumbnail } from './PhotoThumbnail';
import { Card, CardContent } from './ui/card';

export default function Gallery() {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const { photos, isLoading } = usePhotos();

  const handlePhotoClick = (photoId: string, scrollPosition: number) => {
    setSavedScrollPosition(scrollPosition);
    setSelectedPhotoId(photoId);
  };

  const handleBack = () => {
    setSelectedPhotoId(null);
  };

  const handleNavigate = (direction: 'previous' | 'next') => {
    const currentIndex = photos.findIndex((p) => p.id === selectedPhotoId);
    if (currentIndex === -1) return;

    if (direction === 'previous' && currentIndex > 0) {
      setSelectedPhotoId(photos[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < photos.length - 1) {
      setSelectedPhotoId(photos[currentIndex + 1].id);
    }
  };

  // Show photo detail if a photo is selected
  if (selectedPhotoId) {
    const currentIndex = photos.findIndex((p) => p.id === selectedPhotoId);
    const currentPhoto = photos[currentIndex];
    const previousPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
    const nextPhoto =
      currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

    if (!currentPhoto) {
      // Photo not found, go back to gallery
      setSelectedPhotoId(null);
      return null;
    }

    return (
      <PhotoDetail
        currentPhoto={currentPhoto}
        previousPhoto={previousPhoto}
        nextPhoto={nextPhoto}
        onBack={handleBack}
        onNavigate={handleNavigate}
      />
    );
  }

  if (isLoading && photos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">No photos found</p>
                <p className="text-sm text-gray-500">
                  Add photos to get started
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PhotoGrid
      onPhotoClick={handlePhotoClick}
      savedScrollPosition={savedScrollPosition}
    />
  );
}

interface PhotoGridProps {
  onPhotoClick: (photoId: string, scrollPosition: number) => void;
  savedScrollPosition: number;
}

function PhotoGrid({ onPhotoClick, savedScrollPosition }: PhotoGridProps) {
  const { photos } = usePhotos();
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!parentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  // Minimum column width of 100px, default to 3 columns if width is 0 (initial)
  const columns = width ? Math.max(1, Math.floor(width / 100)) : 3;
  const rows = Math.ceil(photos.length / columns);
  const rowHeight = width ? width / columns : 100;

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
    initialOffset: savedScrollPosition,
  });

  const handlePhotoClick = (photo: Photo) => {
    const scrollPosition = parentRef.current?.scrollTop || 0;
    onPhotoClick(photo.id, scrollPosition);
  };

  return (
    <div ref={parentRef} className="overflow-auto">
      <div
        className="w-full relative"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowPhotos = photos.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                alignContent: 'center',
              }}
            >
              {rowPhotos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onClick={() => handlePhotoClick(photo)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
