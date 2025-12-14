import { eq, useLiveQuery } from '@tanstack/react-db';
import { Camera, CheckCheck, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';
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
  const [isCompleting, setIsCompleting] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: photos, isLoading } = useLiveQuery((q) =>
    q
      .from({ photos: photoCollection })
      .where(({ photos }) => eq(photos.status, 'pending')),
  );
  const pendingCount = photos.filter((p) => p.status === 'pending').length;

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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Camera</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-chart-3" />
            <span className="hidden sm:inline">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" />
            <span className="hidden sm:inline">Completed</span>
          </div>
        </div>
      </div>
    </header>
  );
}
