export function Badge({
  children, bg, color, border,
}: { children: React.ReactNode; bg: string; color: string; border: string }) {
  return (
    <span
      style={{ background: bg, color, borderColor: border }}
      className="text-xs font-bold px-3 py-1 rounded-full border"
    >
      {children}
    </span>
  )
}

export function PracticeNumberBadge({ number }: { number: string }) {
  if (!number) return null
  return (
    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
      #{number}
    </span>
  )
}