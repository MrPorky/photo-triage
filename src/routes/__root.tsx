import { createRootRoute, Outlet } from '@tanstack/react-router';
import Header from '@/components/Header';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <main className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
      <Header />
      <Outlet />
    </main>
  );
}
