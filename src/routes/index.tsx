import { createFileRoute } from '@tanstack/react-router';
import Gallery from '../components/Gallery';

export const Route = createFileRoute('/')({
  component: Gallery,
});
