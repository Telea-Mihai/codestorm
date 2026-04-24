import { AppSidebar } from '@/src/components/ui/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/src/components/ui/sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex w-full bg-zinc-950 text-zinc-100">
        <AppSidebar />
        <SidebarInset className="bg-zinc-950">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
