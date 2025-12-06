import { eq, useLiveQuery } from '@tanstack/react-db';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { photoCollection } from '@/collections/photos';
import { fileSystemService } from '@/services/filesystem';
import type { Photo, PhotoStatus } from '@/types/photo';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const updatePhotoStatus = async ([photo, action]: [
  Photo,
  PhotoStatus,
]): Promise<void> => {
  let status = photo.status;

  const performAction = async () => {
    let resultPromise: ReturnType<typeof fileSystemService.setStatusToPending>;
    switch (action) {
      case 'pending':
        status = 'pending';
        resultPromise = fileSystemService.setStatusToPending(photo);
        break;
      case 'camera':
        status = 'camera';
        resultPromise = fileSystemService.setStatusToCamera(photo);
        break;
      case 'completed':
        status = 'completed';
        resultPromise = fileSystemService.setStatusToCompleted(photo);
        break;
    }

    console.log('Updating photo status:', photo.id, 'to', status);
    photoCollection.update(photo.id, (draft) => {
      draft.status = status;
    });

    return resultPromise;
  };

  console.log('Performing file operation for action:', action);
  const result = await performAction();
  console.log('File operation result:', JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error('File operation failed:', result.error);
    photoCollection.update(photo.id, (draft) => {
      draft.status = photo.status;
    });
    throw new Error(result.error || 'File operation failed');
  }

  console.log('Photo status updated successfully:', photo.id, status);
};

export default function PhotoDetail() {
  const { photoId } = useParams({ from: '/photo/$photoId' });
  const navigate = useNavigate();
  const { data: photos, isLoading } = useLiveQuery((q) =>
    q
      .from({ photos: photoCollection })
      .where(({ photos }) => eq(photos.id, photoId)),
  );
  const selectedPhoto = photos?.[0] || null;

  // Find current photo index and adjacent photos
  const currentIndex = photos.findIndex((p) => p.id === photoId);

  const handleBack = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  const navigateToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const previousPhoto = photos[currentIndex - 1];
      navigate({
        to: '/photo/$photoId',
        params: { photoId: previousPhoto.id },
      });
    }
  }, [currentIndex, photos, navigate]);

  const navigateToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      const nextPhoto = photos[currentIndex + 1];
      navigate({ to: '/photo/$photoId', params: { photoId: nextPhoto.id } });
    }
  }, [currentIndex, photos, navigate]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key === 'ArrowLeft') {
        navigateToPrevious();
      } else if (e.key === 'ArrowRight') {
        navigateToNext();
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, navigateToPrevious, navigateToNext, handleBack]);

  const handleAction = async (confirmAction: PhotoStatus) => {
    if (!selectedPhoto || !confirmAction) return;

    try {
      updatePhotoStatus([selectedPhoto, confirmAction]);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  if (!selectedPhoto) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Photo Not Found</h2>
              <Button onClick={handleBack} className="mt-4">
                Back to Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-linear-to-b from-black/80 to-transparent md:hidden">
        <button
          type="button"
          data-slot="button"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 size-9 text-white hover:bg-white/10 rounded-full"
          onClick={handleBack}
        >
          <ArrowLeft />
        </button>
      </div>

      {/* Main Image Area - Immersive */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-zinc-950/50">
        {selectedPhoto.isVideo ? (
          <video
            src={selectedPhoto.uri}
            className="w-full h-auto max-h-[70vh] object-contain"
            controls
            playsInline
          >
            <track
              kind="captions"
              src=""
              srcLang="en"
              label="English captions"
              default
            />
          </video>
        ) : (
          <img
            src={selectedPhoto.uri}
            alt={selectedPhoto.originalName}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
        )}
      </div>

      {/* Bottom Triage Bar */}
      <div className="shrink-0 border-t border-white/10 bg-zinc-950 p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Status
            </p>
            <div className="flex items-center gap-2 mt-1">
              {selectedPhoto.status === 'camera' && (
                <span className="text-sm font-medium text-white">
                  In Camera Roll
                </span>
              )}
              {selectedPhoto.status === 'pending' && (
                <>
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">
                    Pending Review
                  </span>
                </>
              )}
              {selectedPhoto.status === 'completed' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500">
                    Completed
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-white mt-1">
              {new Date(selectedPhoto.modifiedTime).toISOString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {selectedPhoto.status === 'camera' && (
            <>
              <Button
                variant="secondary"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-0"
                onClick={() => handleAction('pending')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Mark Pending
              </Button>
              <Button
                className="w-full bg-white hover:bg-zinc-200 text-black border-0"
                onClick={() => handleAction('completed')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}

          {selectedPhoto.status === 'pending' && (
            <>
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => handleAction('camera')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Revert
              </Button>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={() => handleAction('completed')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}

          {/* {selectedPhoto.status === 'completed' && (
            <Button
              variant="secondary"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-0 col-span-2"
              onClick={() => handleAction('pending')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Move back to Pending
            </Button>
          )} */}
        </div>
      </div>
    </div>
  );
}
