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
      // Si no tiene zona horaria, asumimos que representa la hora local de Colombia (-05:00)
      str = str.includes('T') ? `${str}-05:00` : `${str.replace(' ', 'T')}-05:00`;
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatColombianTime(dateInput: string | Date | null | undefined): string {
  const date = parseColombianDate(dateInput);
  if (!date) return '';

  const dateOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'America/Bogota', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  };

  return date.toLocaleTimeString('es-CO', dateOptions).replace(/[\u00A0\u202F]/g, ' ');
}

