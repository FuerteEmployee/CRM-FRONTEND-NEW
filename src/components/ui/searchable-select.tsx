import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchableSelectProps {
  options: { label: string; value: string }[]
  value?: string | string[]
  onValueChange?: (value: any) => void
  placeholder?: string
  disabled?: boolean
  multiple?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value: externalValue,
  onValueChange,
  placeholder = "Select option...",
  disabled,
  multiple = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<any>(multiple ? [] : "")

  const value = externalValue !== undefined ? externalValue : internalValue
  const selected: string[] = multiple ? (Array.isArray(value) ? value.map(String) : []) : []

  const emit = (next: any) => {
    if (externalValue === undefined) setInternalValue(next)
    onValueChange?.(next)
  }

  const handleValueChange = (newValue: string) => {
    if (multiple) {
      emit(selected.includes(newValue) ? selected.filter((v) => v !== newValue) : [...selected, newValue])
    } else {
      emit(newValue)
      setOpen(false)
    }
  }

  // Ensure content width matches trigger width
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = React.useState(0)

  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const displayLabel = React.useMemo(() => {
    if (multiple) {
      const selectedOptions = options.filter((opt) => selected.includes(String(opt.value)))
      return selectedOptions.length > 0
        ? selectedOptions.map((opt) => opt.label).join(", ")
        : placeholder
    }
    return value
      ? options.find((option) => option.value === value)?.label || placeholder
      : placeholder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, multiple, placeholder])

  return (
    // modal: the list gets its own scroll lock, so the mouse wheel / touch
    // scroll works even when this picker sits inside a Dialog (e.g. New Task),
    // whose scroll lock otherwise blocks the portaled list.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal hover:bg-background", className)}
        >
          <span className="truncate">{displayLabel}</span>
          <span className="ml-2 flex items-center gap-1 shrink-0">
            {multiple && selected.length > 0 && (
              <span className="rounded-full bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5">{selected.length}</span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: triggerWidth ? `${Math.max(triggerWidth, 220)}px` : "auto" }}
        className="p-0"
        align="start"
        collisionPadding={8}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={`Search...`} />
          {multiple && options.length > 1 && (
            <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] font-bold">
              <span className="text-muted-foreground">{selected.length} of {options.length} selected</span>
              <span className="flex gap-3">
                <button type="button" className="text-primary hover:underline" onClick={() => emit(options.map((o) => o.value))}>Select all</button>
                <button type="button" className="text-rose-500 hover:underline" onClick={() => emit([])}>Clear</button>
              </span>
            </div>
          )}
          {/* Height never exceeds the room left on screen, so the last rows stay reachable. */}
          <CommandList className="max-h-[min(300px,calc(var(--radix-popover-content-available-height,300px)-90px))] overscroll-contain">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // label + id: two people with the same name stay two separate rows.
                  value={`${option.label} ${option.value}`}
                  keywords={[option.label]}
                  onSelect={() => {
                    handleValueChange(option.value)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      multiple
                        ? (selected.includes(String(option.value)) ? "opacity-100" : "opacity-0")
                        : (value === option.value ? "opacity-100" : "opacity-0")
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
