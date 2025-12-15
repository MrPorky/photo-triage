import {
  createFileRoute,
  useElementScrollRestoration,
  useNavigate,
} from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { Card, CardContent } from '@/components/ui/card';
import { usePhotos } from '@/hooks/usePhotos';
import type { Photo } from '@/types/photo';

export const Route = createFileRoute('/')({
  component: Gallery,
});

function Gallery() {
  const { photos, isLoading } = usePhotos();

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

  return <PhotoGrid />;
}

function PhotoGrid() {
  const { photos } = usePhotos();
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(document.body.clientWidth);

  const scrollRestorationId = 'photo-gallery';
  const scrollEntry = useElementScrollRestoration({
    id: scrollRestorationId,
  });

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
    initialOffset: scrollEntry?.scrollY,
  });

  const handlePhotoClick = async (photo: Photo) => {
    navigate({ to: '/$photoId', params: { photoId: photo.id } });
  };

  return (
    <div
      ref={parentRef}
      data-scroll-restoration-id={scrollRestorationId}
      className="overflow-auto"
    >
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
