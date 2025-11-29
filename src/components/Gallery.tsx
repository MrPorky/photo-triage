import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePhotos } from '../contexts/PhotoContext';
import type { Photo } from '../types/photo';
import { Card, CardContent } from './ui/card';

function throttle<Args extends unknown[]>(
  func: (...args: Args) => void,
  limit: number,
): (...args: Args) => void {
  let inThrottle: boolean;
  return function (this: unknown, ...args: Args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export default function Gallery() {
  const { photos, loading, error, loadPhotos } = usePhotos();

  if (loading && photos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">
                Error Loading Photos
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                type="button"
                onClick={loadPhotos}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
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

  return <PhotoGrid />;
}

function PhotoGrid() {
  const { photos } = usePhotos();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16),
    [],
  );

  const handlePhotoClick = (photo: Photo) => {
    navigate({ to: '/photo/$photoId', params: { photoId: photo.id } });
  };

  const { visibleItems, totalHeight } = useMemo(() => {
    if (!containerSize.width || photos.length === 0) {
      return { visibleItems: [], totalHeight: 0 };
    }

    const width = containerSize.width;
    // 3 columns on small screens, 4 on large (lg is 1024px usually)
    const numColumns = width >= 1000 ? 4 : 3;

    const gap = 2; // 2px gap
    const itemWidth = (width - (numColumns - 1) * gap) / numColumns;
    const rowHeight = itemWidth;

    const totalRows = Math.ceil(photos.length / numColumns);
    const totalHeight = totalRows * rowHeight + (totalRows - 1) * gap;

    const buffer = 10; // Increased buffer to keep more images in DOM
    const startRow = Math.max(
      0,
      Math.floor(scrollTop / (rowHeight + gap)) - buffer,
    );
    const visibleRowsCount =
      Math.ceil(containerSize.height / (rowHeight + gap)) + 2 * buffer;
    const endRow = Math.min(totalRows, startRow + visibleRowsCount);

    const visibleItems = [];
    for (let r = startRow; r < endRow; r++) {
      for (let c = 0; c < numColumns; c++) {
        const index = r * numColumns + c;
        if (index < photos.length) {
          visibleItems.push({
            photo: photos[index],
            top: r * (rowHeight + gap),
            left: c * (itemWidth + gap),
            width: itemWidth,
            height: rowHeight,
          });
        }
      }
    }

    return { visibleItems, totalHeight };
  }, [photos, containerSize, scrollTop]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto transition-all duration-300 relative bg-black"
    >
      <div style={{ height: totalHeight, width: '100%' }}>
        {visibleItems.map(({ photo, top, left, width, height }) => (
          <div
            key={photo.id}
            style={{
              position: 'absolute',
              top,
              left,
              width,
              height,
            }}
          >
            <PhotoThumbnail
              photo={photo}
              onClick={() => handlePhotoClick(photo)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
}

function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {photo.isVideo ? (
        <video
          src={photo.uri}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="none"
        />
      ) : (
        <img
          src={photo.uri}
          alt={photo.originalName}
          className="w-full h-full object-cover"
          decoding="async"
          part="image"
        />
      )}

      {/* Status overlay */}
      <div className="absolute top-2 right-2">
        {photo.status === 'pending' && (
          <div className="bg-yellow-500 rounded-full p-1.5 shadow-lg">
            <Clock className="w-4 h-4 text-white" />
          </div>
        )}
        {photo.status === 'completed' && (
          <div className="bg-green-500 rounded-full p-1.5 shadow-lg">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Video indicator */}
      {photo.isVideo && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          VIDEO
        </div>
      )}
    </button>
  );
}
