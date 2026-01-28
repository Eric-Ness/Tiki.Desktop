import * as React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.PanelGroup>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.PanelGroup>
>(({ className, ...props }, ref) => (
  <ResizablePrimitive.PanelGroup
    ref={ref}
    className={`flex h-full w-full ${className || ''}`}
    {...props}
  />
))
ResizablePanelGroup.displayName = 'ResizablePanelGroup'

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel>
>(({ className, ...props }, ref) => (
  <ResizablePrimitive.Panel
    ref={ref}
    className={`${className || ''}`}
    {...props}
  />
))
ResizablePanel.displayName = 'ResizablePanel'

interface ResizableHandleProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.PanelResizeHandle> {
  className?: string
}

function ResizableHandle({ className, ...props }: ResizableHandleProps) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={`
        relative w-1 bg-transparent
        after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2
        after:bg-border hover:after:bg-border-hover
        after:transition-colors after:duration-150
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500
        ${className || ''}
      `}
      {...props}
    />
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
