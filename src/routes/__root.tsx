import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import Header from '../components/Header';
import { PhotoProvider } from '../contexts/PhotoContext';

export const Route = createRootRoute({
  component: () => (
    <PhotoProvider>
      <main className="flex flex-col h-screen bg-black text-white overflow-hidden py-8">
        <Header />
        <div className="flex flex-1 overflow-hidden relative">
          <Outlet />
        </div>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </main>
    </PhotoProvider>
  ),
});
