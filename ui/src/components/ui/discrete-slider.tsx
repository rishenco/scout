import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface DiscreteSliderProps extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value' | 'onValueChange' | 'min' | 'max' | 'step'> {
  options: Array<{ value: number; label: string }>
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
}

const DiscreteSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  DiscreteSliderProps
>(({ className, options, value, onValueChange, disabled, ...props }, ref) => {
  if (!options || options.length === 0) {
    return (
      <div className="space-y-3">
        <div className="relative flex w-full touch-none select-none items-center opacity-50">
          <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <div className="absolute h-full bg-primary/30 w-0" />
          </div>
        </div>
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground">No options available</span>
        </div>
      </div>
    )
  }

  if (options.length === 1) {
    const singleOption = options[0]
    return (
      <div className="space-y-3">
        <div className="relative flex w-full touch-none select-none items-center">
          <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <div className="absolute h-full bg-primary w-full" />
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-colors" />
        </div>
        <div className="flex justify-center">
          <span className="text-xs font-medium text-primary">
            {singleOption.label}
          </span>
        </div>
      </div>
    )
  }

  const currentIndex = Math.max(0, options.findIndex(option => option.value === value))

  const handleSliderChange = (values: number[]) => {
    const index = values[0]
    if (index >= 0 && index < options.length) {
      onValueChange(options[index].value)
    }
  }

  return (
    <div className="space-y-3">
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        value={[currentIndex]}
        onValueChange={handleSliderChange}
        min={0}
        max={options.length - 1}
        step={1}
        disabled={disabled}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
      
      <div className="flex justify-between">
        {options.map((option, index) => (
          <span
            key={option.value}
            className={cn(
              "text-xs transition-colors",
              index === currentIndex 
                ? "font-medium text-primary" 
                : "text-muted-foreground",
              disabled && "opacity-50"
            )}
          >
            {option.label}
          </span>
        ))}
      </div>
    </div>
  )
})

DiscreteSlider.displayName = "DiscreteSlider"

export { DiscreteSlider }