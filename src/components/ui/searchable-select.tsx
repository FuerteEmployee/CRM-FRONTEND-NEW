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

  const handleValueChange = (newValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      const updatedValues = currentValues.includes(newValue)
        ? currentValues.filter((v) => v !== newValue)
        : [...currentValues, newValue]
      
      if (externalValue === undefined) {
        setInternalValue(updatedValues)
      }
      if (onValueChange) {
        onValueChange(updatedValues)
      }
    } else {
      if (externalValue === undefined) {
        setInternalValue(newValue)
      }
      if (onValueChange) {
        onValueChange(newValue)
      }
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
      const selectedOptions = options.filter((opt) => Array.isArray(value) && value.includes(opt.value))
      return selectedOptions.length > 0
        ? selectedOptions.map((opt) => opt.label).join(", ")
        : placeholder
    }
    return value
      ? options.find((option) => option.value === value)?.label || placeholder
      : placeholder
  }, [value, options, multiple, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
        className="p-0"
      >
        <Command>
          <CommandInput placeholder={`Search...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    handleValueChange(option.value)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      multiple 
                        ? (Array.isArray(value) && value.includes(option.value) ? "opacity-100" : "opacity-0")
                        : (value === option.value ? "opacity-100" : "opacity-0")
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
