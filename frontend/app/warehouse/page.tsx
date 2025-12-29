"use client"

import { auth } from "@/lib/auth"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, History, ClipboardCheck } from "lucide-react"
import Link from "next/link"

export default function WarehousePage() {
  const user = auth.getUser()
  const isAdmin = auth.isAdmin()

  return (
    <div className="container max-w-5xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Almacén</h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenido, <span className="font-medium">{user?.username}</span> ({user?.role})
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/warehouse/receive" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    Registrar Recepción
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Registrar las cantidades de roscas recibidas en el almacén
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/warehouse/history" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    Historial de Recepciones
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Ver el historial de recepciones confirmadas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {isAdmin && (
          <Link href="/admin/warehouse/edit-requests" className="group">
            <Card className="transition-all hover:shadow-lg hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="group-hover:text-primary transition-colors">
                      Solicitudes de Edición
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Revisar y aprobar solicitudes de edición de recepciones
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}

