import { Camera, CheckCircle2, Clock } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Gallery
        </h1>

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
