import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar.js';
import { TopHeader, TopHeaderProps } from './TopHeader.js';

export interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (route: string) => void;
  headerProps?: Partial<TopHeaderProps>;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  activeTab = 'kanban',
  onTabChange,
  onNavigate,
  headerProps = {},
}) => {
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#07070C] text-slate-100 font-sans">
      {/* TOPBAR: Fixed, full viewport width, above everything */}
      <TopHeader onNavigate={onNavigate} {...headerProps} />

      {/* BELOW TOPBAR: Sidebar + Main Content */}
      <div className="flex pt-16">
        {/* Hover-Expandable Sidebar (starts below topbar) */}
        <AppSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onNavigate={onNavigate}
          isHovered={isSidebarHovered}
          onHoverChange={setIsSidebarHovered}
        />

        {/* Main Content Area — margin syncs with sidebar width */}
        <main
          className={`flex-1 min-w-0 p-6 relative overflow-y-auto min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out ${
            isSidebarHovered ? 'pl-[calc(16rem+1.5rem)]' : 'pl-[calc(72px+1.5rem)]'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
