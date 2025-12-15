import { useLiveQuery } from '@tanstack/react-db';
import { photoCollection } from '@/collections/photos';

export function usePhotos() {
  // Get all photos ordered by modified time
  const { data: photos, isLoading } = useLiveQuery((q) =>
    q
      .from({ photos: photoCollection })
      .orderBy(({ photos }) => photos.modifiedTime, 'desc'),
  );

  return { photos, isLoading };
}
