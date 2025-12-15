import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import PhotoDetail from '@/components/PhotoDetail';
import { usePhotos } from '@/hooks/usePhotos';

export const Route = createFileRoute('/$photoId')({
  component: PhotoDetailRoute,
});

function PhotoDetailRoute() {
  const { photoId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { photos } = usePhotos();

  const currentIndex = photos.findIndex((p) => p.id === photoId);
  const currentPhoto = photos[currentIndex];
  const previousPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const nextPhoto =
    currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  if (!currentPhoto) {
    // Photo not found, go back to gallery
    navigate({ to: '/' });
    return null;
  }

  const handleBack = () => {
    router.history.back();
  };

  const handleNavigate = (direction: 'previous' | 'next') => {
    if (direction === 'previous' && previousPhoto) {
      navigate({
        to: '/$photoId',
        params: { photoId: previousPhoto.id },
        replace: true,
      });
    } else if (direction === 'next' && nextPhoto) {
      navigate({
        to: '/$photoId',
        params: { photoId: nextPhoto.id },
        replace: true,
      });
    }
  };

  return (
    <PhotoDetail
      currentPhoto={currentPhoto}
      previousPhoto={previousPhoto}
      nextPhoto={nextPhoto}
      onBack={handleBack}
      onNavigate={handleNavigate}
    />
  );
}
