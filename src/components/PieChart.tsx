import { useMemo } from "react"

type PieChartData = {
  label: string
  value: number
  color: string
}

type PieChartProps = {
  data: PieChartData[]
  size?: number
  innerRadius?: number
}

export function PieChart({ data, size = 200, innerRadius = 60 }: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])
  
  const segments = useMemo(() => {
    if (total === 0) return []
    
    let currentAngle = -90 // Start at top
    const segmentsArray: Array<{
      path: string
      color: string
      label: string
      value: number
      percentage: number
      startAngle: number
      endAngle: number
    }> = []
    
    const radius = size / 2
    const center = size / 2
    
    data.forEach((item) => {
      const percentage = (item.value / total) * 100
      const angle = (item.value / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      
      const startRadians = (startAngle * Math.PI) / 180
      const endRadians = (endAngle * Math.PI) / 180
      
      const x1 = center + radius * Math.cos(startRadians)
      const y1 = center + radius * Math.sin(startRadians)
      const x2 = center + radius * Math.cos(endRadians)
      const y2 = center + radius * Math.sin(endRadians)
      
      const largeArcFlag = angle > 180 ? 1 : 0
      
      // Outer arc
      const path = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        innerRadius > 0 ? `L ${center + innerRadius * Math.cos(endRadians)} ${center + innerRadius * Math.sin(endRadians)}` : "",
        innerRadius > 0 ? `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${center + innerRadius * Math.cos(startRadians)} ${center + innerRadius * Math.sin(startRadians)}` : "",
        "Z",
      ].filter(Boolean).join(" ")
      
      segmentsArray.push({
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage,
        startAngle,
        endAngle,
      })
      
      currentAngle = endAngle
    })
    
    return segmentsArray
  }, [data, total, size, innerRadius])
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-muted-foreground">No data</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill={segment.color}
            stroke="white"
            strokeWidth="2"
            className="transition-opacity hover:opacity-80"
          />
        ))}
      </svg>
      <div className="space-y-2 w-full">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="font-medium text-foreground">{segment.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{segment.value}</span>
              <span className="font-semibold text-foreground w-12 text-right">
                {segment.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

