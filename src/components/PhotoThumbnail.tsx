import { CheckCircle, Clock } from 'lucide-react';
import type { Photo } from '@/types/photo';

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  return (
    <button
      className="h-[inherit] border-2 relative"
      type="button"
      onClick={onClick}
    >
      {photo.isVideo ? (
        <video
          src={photo.uri}
          poster={photo.thumbnail}
          muted
          playsInline
          preload="none"
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={photo.thumbnail || photo.uri}
          alt={photo.originalName}
          decoding="async"
          loading="lazy"
          part="image"
          className="w-full h-full object-cover"
        />
      )}

      {/* Status overlay */}
      <div className="absolute top-2 right-2">
        {photo.status === 'pending' && (
          <div className="bg-chart-3 rounded-full p-1.5 shadow-lg">
            <Clock className="w-4 h-4" />
          </div>
        )}
        {photo.status === 'completed' && (
          <div className="bg-chart-2 rounded-full p-1.5 shadow-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Video indicator */}
      {photo.isVideo && (
        <div className="absolute bottom-2 left-2 bg-background text-xs px-2 py-1 rounded">
          VIDEO
        </div>
      )}
    </button>
  );
}
