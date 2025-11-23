import { createFileRoute } from '@tanstack/react-router';
import PhotoDetail from '../../components/PhotoDetail';

export const Route = createFileRoute('/photo/$photoId')({
  component: PhotoDetail,
});
