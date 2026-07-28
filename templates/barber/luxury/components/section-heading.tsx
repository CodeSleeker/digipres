import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gold hairline + uppercase eyebrow label (mockup `.section-label`). */
export function SectionLabel({
  children,
  centered,
  className,
}: {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-4 before:h-px before:w-10 before:bg-gold before:content-['']",
        centered && "justify-center",
        className,
      )}
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-[4px] text-gold">
        {children}
      </span>
    </div>
  );
}

/** Large Bebas display heading (mockup `.section-title`). */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-heading text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] tracking-[3px] text-white max-[480px]:text-[clamp(2rem,7vw,3rem)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Playfair italic subtitle (mockup `.section-subtitle`). */
export function SectionSubtitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-4 font-display text-[clamp(1rem,2vw,1.25rem)] font-light italic text-gray",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Centered section header block used by Services/Barbers/Products/Testimonials. */
export function SectionHeading({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-16 text-center max-[768px]:mb-10">
      <SectionLabel centered className="reveal">
        {label}
      </SectionLabel>
      <SectionTitle className="reveal reveal-delay-1">{title}</SectionTitle>
      {subtitle && (
        <SectionSubtitle className="reveal reveal-delay-2">
          {subtitle}
        </SectionSubtitle>
      )}
    </div>
  );
}
