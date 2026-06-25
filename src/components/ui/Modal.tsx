import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content Container */}
      <div
        className={cn(
          "relative w-full sm:max-w-lg bg-white dark:bg-dark-card rounded-t-2xl sm:rounded-2xl border border-light-border dark:border-dark-border shadow-2xl z-10 flex flex-col max-h-[90vh] transition-all duration-300 transform scale-100",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-border dark:border-dark-border">
          <h3 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-light-text-muted hover:bg-gray-100 dark:hover:bg-dark-border transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 text-sm text-light-text-main dark:text-dark-text-main">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-bg/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
