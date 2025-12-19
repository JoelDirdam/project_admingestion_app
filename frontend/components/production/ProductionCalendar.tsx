"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ProductionSummaryItem } from "@/lib/types"

interface ProductionCalendarProps {
  summary: ProductionSummaryItem[]
  selectedDate: string | null
  onDateSelect: (date: string) => void
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

export function ProductionCalendar({
  summary,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}: ProductionCalendarProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Obtener el primer día del mes y el último día
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay() // 0 = Domingo, 1 = Lunes, etc.

  // Crear un mapa de fechas con producción para acceso rápido
  const productionMap = new Map<string, ProductionSummaryItem>()
  summary.forEach((item) => {
    productionMap.set(item.date, item)
  })

  // Nombres de los días de la semana
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const handlePreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    onMonthChange(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    onMonthChange(newDate)
  }

  const formatDateKey = (day: number): string => {
    const date = new Date(year, month, day)
    return date.toISOString().split("T")[0]
  }

  const isSelected = (day: number): boolean => {
    const dateKey = formatDateKey(day)
    return selectedDate === dateKey
  }

  const hasProduction = (day: number): boolean => {
    const dateKey = formatDateKey(day)
    return productionMap.has(dateKey)
  }

  const getProductionTotal = (day: number): number => {
    const dateKey = formatDateKey(day)
    const production = productionMap.get(dateKey)
    return production?.totalUnits || 0
  }

  // Crear array de días del mes
  const days: (number | null)[] = []
  // Agregar espacios vacíos para los días antes del primer día del mes
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  // Agregar todos los días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header del calendario */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {monthNames[month]} {year}
            </h3>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Nombres de los días */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Días del calendario */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-2" />
              }

              const hasProd = hasProduction(day)
              const total = getProductionTotal(day)
              const selected = isSelected(day)

              return (
                <Button
                  key={day}
                  variant={selected ? "default" : "outline"}
                  className={`h-16 flex flex-col items-center justify-center p-1 ${
                    hasProd
                      ? selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-green-50 border-green-300 hover:bg-green-100"
                      : ""
                  }`}
                  onClick={() => onDateSelect(formatDateKey(day))}
                >
                  <span className="text-sm font-medium">{day}</span>
                  {hasProd && (
                    <span className="text-xs font-semibold">{total}</span>
                  )}
                </Button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-300 rounded" />
              <span>Con producción</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border rounded" />
              <span>Sin producción</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}




