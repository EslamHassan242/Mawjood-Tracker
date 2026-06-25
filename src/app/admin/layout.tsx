"use client";

import React, { useState } from "react";
import Sidebar from "@/components/navigation/Sidebar";
import Header from "@/components/navigation/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Derive page title from active path or layout children if needed,
  // but we can pass it down or let subpages render their own title in Header
  // or simply display a standard title. We will let the pages define their title!
  return (
    <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {/* 1. Desktop Sidebar (hidden on mobile) */}
      <Sidebar isMobile={false} />

      {/* 2. Mobile Drawer Sidebar (toggleable) */}
      <Sidebar
        isMobile={true}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header with hamburger toggle button for mobile */}
        <Header
          showMenuButton={true}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
