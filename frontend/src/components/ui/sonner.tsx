"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "rgb(59 130 246)",
          "--normal-text": "white",
          "--normal-border": "rgb(59 130 246)",
          "--success-bg": "rgb(34 197 94)",
          "--success-text": "white",
          "--success-border": "rgb(34 197 94)",
          "--error-bg": "rgb(239 68 68)",
          "--error-text": "white",
          "--error-border": "rgb(239 68 68)",
          "--info-bg": "rgb(14 165 233)",
          "--info-text": "white",
          "--info-border": "rgb(14 165 233)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
