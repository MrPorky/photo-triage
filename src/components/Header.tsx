import { Camera, CheckCheck, CheckCircle2, Clock } from 'lucide-react';
import { usePhotos } from '../contexts/PhotoContext';
import { Button } from './ui/button';

export default function Header() {
  const { photos, completeAllPending, loading } = usePhotos();
  const pendingCount = photos.filter((p) => p.status === 'pending').length;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Gallery
          </h1>
          {pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={completeAllPending}
              disabled={loading}
              className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            >
              <CheckCheck className="w-4 h-4" />
              Complete All ({pendingCount})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Camera</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Completed</span>
          </div>
        </div>
      </div>
    </header>
  );
}
