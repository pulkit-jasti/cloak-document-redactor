interface SectionHeaderProps {
  id: string
  eyebrow: string
  title: string
  intro?: React.ReactNode
}

export default function SectionHeader({ id, eyebrow, title, intro }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {title}
      </h2>
      {intro && <p className="max-w-xl text-base text-muted-foreground text-pretty">{intro}</p>}
    </div>
  )
}
