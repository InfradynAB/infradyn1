"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"

export function ModeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme()

  const handleThemeChange = React.useCallback((theme: "light" | "dark" | "system") => {
    const scrollSnapshot = new Map<HTMLElement, { top: number; left: number }>()

    // Capture page scroll first.
    const scrollingElement = document.scrollingElement as HTMLElement | null
    if (scrollingElement) {
      scrollSnapshot.set(scrollingElement, {
        top: scrollingElement.scrollTop,
        left: scrollingElement.scrollLeft,
      })
    }

    // Capture all active scroll containers so nested/sibling layouts keep position.
    const elements = Array.from(document.querySelectorAll<HTMLElement>("*"))
    for (const el of elements) {
      if ((el.scrollTop === 0 && el.scrollLeft === 0) || (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)) {
        continue
      }
      scrollSnapshot.set(el, { top: el.scrollTop, left: el.scrollLeft })
    }

    setTheme(theme)

    const restoreScroll = () => {
      for (const [element, pos] of scrollSnapshot.entries()) {
        element.scrollTop = pos.top
        element.scrollLeft = pos.left
      }
    }

    requestAnimationFrame(restoreScroll)
    setTimeout(restoreScroll, 0)
    setTimeout(restoreScroll, 50)
  }, [setTheme])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" className={cn(className)}>
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleThemeChange("light"); }}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleThemeChange("dark"); }}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleThemeChange("system"); }}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
