import dotenv from 'dotenv';
import fs from 'fs';
import { GaxiosResponse } from 'gaxios';
import { google, sheets_v4 } from 'googleapis';
import path from 'path';
dotenv.config();

const googleCredentials = JSON.parse(process.env.GEMINI_API_KEY);

if (!googleCredentials) {
    throw new Error('GOOGLE_JSON environment variable is not defined');
}

// Ruta al archivo google.json
const googleJsonPath = path.join(process.cwd(), 'google.json');

// Verifica si el archivo google.json existe, si no, lo crea
if (!fs.existsSync(googleJsonPath)) {
    try {
        fs.writeFileSync(googleJsonPath, JSON.stringify(googleCredentials, null, 2));
        console.log('google.json file created successfully.');
    } catch (error) {
        throw new Error(`Failed to write google.json file: ${error.message}`);
    }
} else {
    console.log('google.json file already exists.');
}


// Inicializa la librería cliente de Google y configura la autenticación con credenciales de la cuenta de servicio.
const auth = new google.auth.GoogleAuth({
    keyFile: 'google.json',  // Ruta al archivo de clave de tu cuenta de servicio.
    scopes: ['https://www.googleapis.com/auth/spreadsheets']  // Alcance para la API de Google Sheets.
});


const spreadsheetId = process.env.SPREADSHEETID

// Función asíncrona para escribir datos en una hoja de cálculo de Google.
async function writeToSheet(values: any[][], range: string): Promise<GaxiosResponse<sheets_v4.Schema$UpdateValuesResponse> | void> {
    const sheets = google.sheets({ version: 'v4', auth }); // Crea una instancia cliente de la API de Sheets.
    const valueInputOption = 'USER_ENTERED'; // Cómo se deben interpretar los datos de entrada.

    const resource = {
        values
    }; // Los datos que se escribirán.

    try {
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            requestBody: resource
        });
        return res; // Devuelve la respuesta de la API de Sheets.
    } catch (error) {
        console.error('Error', error); // Registra errores.
    }
}

// Función asíncrona para leer datos de una hoja de cálculo de Google.
async function readSheet(): Promise<any[][] | void> {
    const sheets = google.sheets({ version: 'v4', auth });
    const range = "Sheet1!A1:J35"

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range
        });
        const rows = response.data.values; // Extrae las filas de la respuesta.
        return rows; // Devuelve las filas.
    } catch (error) {
        console.error('Error', error); // Registra errores.
    }
}

export { readSheet, writeToSheet };
