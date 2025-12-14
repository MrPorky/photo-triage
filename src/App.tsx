import Gallery from './components/Gallery';
import Header from './components/Header';

interface AppProps {
  isLoadingPhotos?: boolean;
}

export default function App({ isLoadingPhotos = false }: AppProps) {
  return (
    <main className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
      <Header isLoadingPhotos={isLoadingPhotos} />
      <Gallery />
    </main>
  );
}
