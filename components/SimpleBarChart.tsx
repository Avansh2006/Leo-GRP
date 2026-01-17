'use client'

interface BarChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
}

export default function SimpleBarChart({ data, title }: BarChartProps) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
