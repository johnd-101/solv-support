'use client'
import { ReactNode } from 'react'
import { Theme } from '@/lib/types'

export function Modal({
  children, onClose, theme, maxWidth = 'max-w-lg',
}: {
  children: ReactNode
  onClose: () => void
  theme: Theme
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
      <div
        className={`w-full ${maxWidth} rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({
  title, onClose, theme,
}: { title: string; onClose: () => void; theme: Theme }) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="font-bold text-sm truncate pr-3">{title}</h2>
      <button
        onClick={onClose}
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
        }`}
      >
        ✕
      </button>
    </div>
  )
}