import { count, eq, useLiveQuery } from '@tanstack/react-db';
import { CheckCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { photoCollection } from '@/collections/photos';
import { fileSystemService } from '@/services/filesystem';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

export default function Header() {
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load photos when the app mounts
    setIsLoadingPhotos(true);
    fileSystemService
      .loadPhotos()
      .catch((error) => {
        console.error('Error loading photos on app start:', error);
      })
      .finally(() => {
        setIsLoadingPhotos(false);
      });
  }, []);

  const { data: photosCount, isLoading } = useLiveQuery((q) =>
    q
      .from({ photos: photoCollection })
      .groupBy(({ photos }) => photos.status)
      .select(({ photos }) => ({
        status: photos.status,
        count: count(photos.status),
      }))
      .where(({ photos }) => eq(photos.status, 'pending'))
      .findOne(),
  );
  const pendingCount = photosCount?.count ?? 0;

  const handleCompleteAll = async () => {
    setIsCompleting(true);
    try {
      await fileSystemService.completeAllPending();
      setOpen(false);
    } catch (error) {
      console.error('Failed to complete all photos:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <header className="px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight">Gallery</h1>
          {pendingCount > 0 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isCompleting}
                >
                  <CheckCheck className="w-4 h-4" />
                  Complete All ({pendingCount})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete All Pending Photos?</DialogTitle>
                  <DialogDescription>
                    This will move {pendingCount} photos to the completed
                    folder. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    disabled={isCompleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCompleteAll}
                    disabled={isCompleting}
                  >
                    {isCompleting ? 'Completing...' : 'Complete All'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {isLoadingPhotos && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading photos...</span>
          </div>
        )}
      </div>
    </header>
  );
}
