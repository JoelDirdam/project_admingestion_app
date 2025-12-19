"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ProductionSummaryItem } from "@/lib/types"
import { Calendar } from "lucide-react"

interface ProductionListViewProps {
  summary: ProductionSummaryItem[]
  selectedDate: string | null
  onDateSelect: (date: string) => void
}

export function ProductionListView({
  summary,
  selectedDate,
  onDateSelect,
}: ProductionListViewProps) {
  const formatDate = (dateString: string): string => {
    // Parsear la fecha como fecha local para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return date.toLocaleDateString("es-ES", options)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lista de Producción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {summary.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay producción registrada en el período seleccionado
            </div>
          ) : (
            <div className="space-y-2">
              {summary.map((item) => {
                const isSelected = selectedDate === item.date
                return (
                  <Button
                    key={item.date}
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full justify-between h-auto py-4 px-4 ${
                      isSelected ? "bg-primary text-primary-foreground" : ""
                    }`}
                    onClick={() => onDateSelect(item.date)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{formatDate(item.date)}</span>
                      <span className="text-xs opacity-80">
                        {item.batchCount} {item.batchCount === 1 ? "lote" : "lotes"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-lg">{item.totalUnits}</span>
                      <span className="text-xs opacity-80">unidades</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

