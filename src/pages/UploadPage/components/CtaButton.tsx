interface CtaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
  wrapperClassName?: string
}

export default function CtaButton({
  fullWidth = false,
  wrapperClassName = "",
  className = "",
  children,
  ...props
}: CtaButtonProps) {
  return (
    <div className={`cta-aurora ${fullWidth ? "w-full" : "w-fit"} ${wrapperClassName}`}>
      <button type="button" className={`cta-button ${className}`} {...props}>
        {children}
      </button>
    </div>
  )
}
