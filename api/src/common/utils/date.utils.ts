/**
 * Convierte un string de fecha (YYYY-MM-DD) a un objeto Date en la zona horaria local
 * Evita problemas de zona horaria que pueden mostrar un día anterior
 */
export function parseLocalDate(dateString: string): Date {
  // Si la fecha viene como "YYYY-MM-DD", parsearla como fecha local
  const [year, month, day] = dateString.split('-').map(Number);
  // Los meses en JavaScript son 0-indexed, por eso month - 1
  return new Date(year, month - 1, day);
}

/**
 * Crea un rango de fechas para un día específico (inicio y fin del día en zona horaria local)
 */
export function getDateRange(dateString: string): { start: Date; end: Date } {
  const date = parseLocalDate(dateString);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

