import { CheckCircle, Clock } from 'lucide-react';
import type { Photo } from '@/types/photo';

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {photo.isVideo ? (
        <video
          src={photo.uri}
          poster={photo.thumbnail}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="none"
        />
      ) : (
        <img
          src={photo.thumbnail || photo.uri}
          alt={photo.originalName}
          className="w-full h-full object-cover"
          decoding="async"
          loading="lazy"
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
