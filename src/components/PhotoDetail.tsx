import { ArrowLeft, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { type ReactEventHandler, useCallback } from 'react';
import { photoCollection } from '@/collections/photos';
import { fileSystemService } from '@/services/filesystem';
import type { Photo, PhotoStatus } from '@/types/photo';
import styles from './PhotoDetail.module.css';
import { Button } from './ui/button';

interface PhotoDetailProps {
  currentPhoto: Photo;
  previousPhoto: Photo | null;
  nextPhoto: Photo | null;
  onBack: () => void;
  onNavigate: (direction: 'previous' | 'next') => void;
}

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

export default function PhotoDetail({
  currentPhoto,
  previousPhoto,
  nextPhoto,
  onBack,
  onNavigate,
}: PhotoDetailProps) {
  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  const handleAction = async (confirmAction: PhotoStatus) => {
    if (!currentPhoto || !confirmAction) return;

    try {
      updatePhotoStatus([currentPhoto, confirmAction]);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleScrollEnd: ReactEventHandler = (e) => {
    const target = e.target as HTMLElement;

    if (target.scrollLeft < 50) {
      onNavigate('previous');
    } else if (target.scrollLeft > target.offsetWidth * 2 - 50) {
      onNavigate('next');
    }
  };

  return (
    <div className="grid grid-rows-[1fr_auto] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 p-4 bg-linear-to-b from-background/80 to-transparent">
        <Button variant="link" size="sm" onClick={handleBack}>
          <ArrowLeft />
        </Button>
      </div>

      {/* Main Image Area - Immersive */}
      <div className={styles.swipe} onScrollEnd={handleScrollEnd}>
        <div>
          <MediaViewer photo={previousPhoto} />
        </div>
        <div ref={(e) => e?.scrollIntoView({ behavior: 'instant' })}>
          <MediaViewer photo={currentPhoto} />
        </div>
        <div>
          <MediaViewer photo={nextPhoto} />
        </div>
      </div>

      {/* Bottom Triage Bar */}
      <div className="p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </p>
            <div className="flex items-center gap-2 mt-1">
              {currentPhoto.status === 'camera' && (
                <span className="text-sm font-medium">In Camera Roll</span>
              )}
              {currentPhoto.status === 'pending' && (
                <>
                  <Clock className="w-4 h-4 text-chart-3" />
                  <span className="text-sm font-medium text-chart-3">
                    Pending Review
                  </span>
                </>
              )}
              {currentPhoto.status === 'completed' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span className="text-sm font-medium text-chart-2">
                    Completed
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium mt-1">
              {new Date(currentPhoto.modifiedTime).toISOString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {currentPhoto.status === 'camera' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('pending')}
              >
                <Clock className="w-4 h-4" />
                Mark Pending
              </Button>
              <Button size="sm" onClick={() => handleAction('completed')}>
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </Button>
            </>
          )}

          {currentPhoto.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('camera')}
              >
                <RotateCcw className="w-4 h-4" />
                Revert
              </Button>
              <Button size="sm" onClick={() => handleAction('completed')}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}

          {/* {currentPhoto.status === 'completed' && (
            <Button
              variant="secondary"
              size="sm"
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

function MediaViewer({ photo }: { photo: Photo | null }) {
  if (!photo) return null;

  return (
    <>
      {photo.isVideo ? (
        <video
          src={photo.uri}
          controls
          playsInline
          className="w-full h-full object-contain"
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
          className="w-full h-full object-contain"
          src={photo.uri}
          alt={photo.originalName}
        />
      )}
    </>
  );
}
