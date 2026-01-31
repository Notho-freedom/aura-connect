import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopLayout } from "./DesktopLayout";
import { MobileLayout } from "./MobileLayout";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showSidebar?: boolean;
  hideNav?: boolean;
}

export function AppLayout({ children, sidebar, showSidebar = true, hideNav = false }: AppLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout hideNav={hideNav}>{children}</MobileLayout>;
  }

  return (
    <DesktopLayout sidebar={sidebar} showSidebar={showSidebar}>
      {children}
    </DesktopLayout>
  );
}
