export function parseColombianDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let str = String(dateInput).trim();
  if (!str) return null;

  // Si es un formato de solo hora como "13:00" o "13:00:00"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const today = new Date().toISOString().split('T')[0];
    str = `${today}T${str.length === 5 ? str + ':00' : str}-05:00`;
  } else {
    // Verificar si la cadena ya tiene un indicador de zona horaria (Z u offset +HH:MM / -HH:MM)
    const hasTimezone = /[Zz]|\d{2}:\d{2}[+-]\d{2}:?\d{2}$|[+-]\d{2}:?\d{2}$/.test(str);

    if (!hasTimezone) {
      // Si no tiene zona horaria, como Supabase siempre guarda en UTC, le agregamos 'Z'
      str = str.includes('T') ? `${str}Z` : `${str.replace(' ', 'T')}Z`;
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatColombianTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  const date = parseColombianDate(dateInput);
  if (!date) return '';

  // En Electron en Windows, toLocaleTimeString con { timeZone: 'America/Bogota' }
  // suele fallar o ignorar la zona horaria devolviendo la hora UTC pura (ej. 18:00 en lugar de 13:00).
  // Para solucionar esto de forma 100% garantizada en cualquier sistema operativo,
  // restamos manualmente 5 horas (UTC-5 Colombia, sin horario de verano)
  // y leemos la hora UTC resultante.
  const colombiaMs = date.getTime() - (5 * 60 * 60 * 1000);
  const colDate = new Date(colombiaMs);

  let hours = colDate.getUTCHours();
  const minutes = colDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;
  const hourStr = hours < 10 ? '0' + hours : hours;
  const minStr = minutes < 10 ? '0' + minutes : minutes;

  return `${hourStr}:${minStr} ${ampm}`;
}


