import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { usePhotos } from '../contexts/PhotoContext';
import type { Photo } from '../types/photo';
import { Card, CardContent } from './ui/card';

export default function Gallery() {
  const { photos, loading, error, loadPhotos } = usePhotos();
  const navigate = useNavigate();

  const handlePhotoClick = (photo: Photo) => {
    navigate({ to: '/photo/$photoId', params: { photoId: photo.id } });
  };

  if (loading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
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
      <div className="flex items-center justify-center min-h-screen p-4">
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
    <div className="flex-1 overflow-y-auto transition-all duration-300">
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-0.5 bg-black">
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            onClick={() => handlePhotoClick(photo)}
          />
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
          loading="lazy"
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
