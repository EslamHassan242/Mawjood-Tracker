import React from "react";
import Header from "@/components/navigation/Header";
import BottomNav from "@/components/navigation/BottomNav";

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {/* Brand Header */}
      <Header />

      {/* Main Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Bar Nav */}
      <BottomNav />
    </div>
  );
}
