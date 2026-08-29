import { cn } from "@/lib/utils";

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

export function AnimatedSection({
  children,
  className,
  id,
}: AnimatedSectionProps) {
  return (
    <section id={id} className={cn(className)}>
      {children}
    </section>
  );
}

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function AnimatedCard({ children, className }: AnimatedCardProps) {
  return <div className={cn(className)}>{children}</div>;
}
