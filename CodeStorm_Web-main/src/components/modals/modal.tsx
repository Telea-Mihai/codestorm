'use client';
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  children: ReactNode;
}

export default function Modal({ isOpen, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      
      <div className="
        relative w-full max-w-lg
        rounded-2xl border border-zinc-800
        bg-zinc-900 p-6 shadow-xl
      ">
        {children}
      </div>

    </div>
  );
}