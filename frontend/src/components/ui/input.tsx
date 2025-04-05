import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-gray-700 placeholder:text-[rgba(255,255,255,0.5)] selection:bg-primary selection:text-gray-700 border-[rgba(255,255,255,0.2)] flex h-9 w-full min-w-0 rounded-md border bg-[rgba(255,255,255,0.1)] backdrop-blur-xl px-3 py-1 text-base shadow-lg transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-gray-700",
        "focus-visible:border-white focus-visible:ring-white/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
