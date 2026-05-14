import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/voicers/Sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background bg-grid">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
