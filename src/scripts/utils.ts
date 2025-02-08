import { readSheet, writeToSheet } from './sheets';

interface Slot {
    dia: string;
    inicio: string;
    final: string;
    mesas: { [key: string]: string | null }; // Ejemplo: { 'Mesa 1': 'Ricardo', 'Mesa 2': null }
    completo: boolean; // Indica si todas las mesas están ocupadas
}

// Función para obtener y parsear los datos desde Google Sheets
async function getParsedData(): Promise<Slot[]> {
    const data = await readSheet();
    if (!data) {
        throw new Error('No se pudieron leer los datos de Google Sheets.');
    }

    // Encuentra la fila de encabezado dinámicamente
    const headerRow = data.find(row => row.includes('Día'));
    if (!headerRow) {
        throw new Error('No se encontró la fila de encabezado.');
    }

    const headerIndex = data.indexOf(headerRow);
    const headers = headerRow.slice(1); // Ignora el primer elemento vacío

    // Extrae los datos a partir de la fila de encabezado
    const rows = data.slice(headerIndex + 1);

    return rows.map(row => {
        const slot: Slot = {
            dia: row[headers.indexOf('Día') + 1] || '',
            inicio: row[headers.indexOf('Slot Inicio') + 1] || '',
            final: row[headers.indexOf('Slot Final') + 1] || '',
            mesas: {},
            completo: false,
        };

        // Rellenar las mesas dinámicamente
        headers.forEach((header, index) => {
            if (header.startsWith('Mesa')) {
                slot.mesas[header] = row[index + 1] || null;
            }
        });

        slot.completo = Object.values(slot.mesas).every(m => m !== null);

        return slot;
    });
}

// Función para verificar si hay mesas disponibles en una fecha y hora específicas
async function dateAvailable(startDate: Date): Promise<boolean> {
    try {
        const slots = await getParsedData();

        // Extraer día de la semana y hora de inicio de la fecha proporcionada en UTC
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = daysOfWeek[startDate.getUTCDay()];
        const startTime = startDate.toISOString().split('T')[1].slice(0, 5); // Formato 'HH:MM' en UTC
  
        // Encontrar el slot correspondiente
        const slot = slots.find(s => s.dia === dayOfWeek && s.inicio === startTime);

        if (slot) {
            // Verificar si hay alguna mesa disponible
            const algunaMesaDisponible = Object.values(slot.mesas).some(m => m === null);
            return algunaMesaDisponible;
        }

        return false; // No se encontró un slot disponible

    } catch (error) {
        console.error('Error en dateAvailable:', error);
        return false; // Manejar el error y retornar false indicando que hubo un problema
    }
}


// Función para agregar una reserva a la siguiente mesa disponible en una fecha y hora específicas
// Función para agregar una reserva a la siguiente mesa disponible en una fecha y hora específicas
async function addReservation(date: Date, name: string): Promise<boolean> {
    try {
        const slots = await getParsedData();

        // Configuración para formatear la hora en UTC
        const options: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        };

        // Extraer día de la semana y hora de la fecha proporcionada
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = daysOfWeek[date.getUTCDay()]; // Usar getUTCDay() para el día en UTC
        const time = date.toLocaleTimeString('en-US', options); // Hora en formato "HH:MM"

        // Convertir la hora actual a minutos desde la medianoche
        const [currentHour, currentMinute] = time.split(':').map(Number);
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        // Encontrar el slot correspondiente
        const slot = slots.find(s => {
            // Convertir las horas de inicio y final del slot a minutos desde la medianoche
            const [startHour, startMinute] = s.inicio.split(':').map(Number);
            const [endHour, endMinute] = s.final.split(':').map(Number);
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;

            // Comparar el día y la hora
            return s.dia === dayOfWeek && currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        });

        if (slot) {
            // Encontrar la primera mesa disponible
            for (const table in slot.mesas) {
                if (slot.mesas[table] === null) {
                    slot.mesas[table] = name; // Asignar la reserva a la mesa

                    // Actualizar la propiedad 'completo' si todas las mesas están ocupadas
                    slot.completo = Object.values(slot.mesas).every(m => m !== null);

                    // Encontrar el índice del slot en la hoja de cálculo
                    const rowIndex = slots.indexOf(slot) + 2; // Sumamos 2 porque los datos empiezan en la fila 2 (A1:J35)
                    const values = [
                        [slot.dia, slot.inicio, slot.final, ...Object.values(slot.mesas)]
                    ];
                    const range = `Sheet1!A${rowIndex}:J${rowIndex}`;

                    // Escribir los datos actualizados en la hoja de cálculo
                    await writeToSheet(values, range);

                    return true; // Indicar que la reserva fue exitosa
                }
            }
        }

        return false; // Indicar que no se encontró un slot disponible o no había mesas libres
    } catch (error) {
        console.error('Error en addReservation:', error);
        return false; // Manejar el error y retornar false indicando que hubo un problema
    }
}


export { dateAvailable, addReservation }