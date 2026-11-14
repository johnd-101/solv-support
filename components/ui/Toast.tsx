'use client'
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null
  return (
    <div
      onClick={onClose}
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow z-[200] max-w-[90vw] truncate dark:bg-white dark:text-black cursor-pointer"
    >
      {message}
    </div>
  )
}