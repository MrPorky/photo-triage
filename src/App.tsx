import Gallery from './components/Gallery';
import Header from './components/Header';

export default function App() {
  return (
    <main className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
      <Header />
      <Gallery />
    </main>
  );
}
