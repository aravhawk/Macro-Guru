interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-muted text-foreground font-sans font-bold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      M
    </div>
  );
}
