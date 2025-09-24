import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        warning:
          "border-transparent bg-skill-intermediate text-white hover:bg-skill-intermediate/80",
        info:
          "border-transparent bg-skill-beginner text-white hover:bg-skill-beginner/80",
        purple:
          "border-transparent bg-skill-expert text-white hover:bg-skill-expert/80",
        elite:
          "border-transparent bg-skill-elite text-white hover:bg-skill-elite/80",
        advanced:
          "border-transparent bg-skill-advanced text-white hover:bg-skill-advanced/80",
        recreational:
          "border-transparent bg-skill-recreational text-white hover:bg-skill-recreational/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
