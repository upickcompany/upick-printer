export function parseColombianDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  let str = dateStr;
  
  // Si la cadena termina en Z (UTC) pero en la base de datos se guardó la hora local de Colombia
  // ignorando la zona horaria, reemplazamos la Z por -05:00 para forzarla a hora colombiana.
  if (str.endsWith('Z')) {
    str = str.substring(0, str.length - 1) + '-05:00';
  } 
  else if (str.endsWith('+00:00')) {
    str = str.substring(0, str.length - 6) + '-05:00';
  }
  // Si no tiene ningún indicador de zona horaria, asumimos que es -05:00 (Colombia)
  else if (!str.match(/[+-]\d\d:\d\d$/)) {
    str += '-05:00';
  }

  return new Date(str);
}
