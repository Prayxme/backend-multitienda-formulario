const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = require('./credentials.json');
require('dotenv').config();



const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
});

async function createUserFolder(primerNombre, primerApellido, cedula, parentFolderId) {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
  
    const folderMetadata = {
      name: `${primerNombre}_${primerApellido}_${cedula}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId] // la carpeta principal donde se guardarán todas las subcarpetas
    };
  
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });
  
    return folder.data.id;
  }
  

  async function uploadFileToDrive(file, folderId) {
    if (!file) return '';
  
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
  
    const fileMetadata = {
      name: file.originalname,
      parents: [folderId]
    };
  
    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };
  
    try {
      const response = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id',
      });
  
      const fileId = response.data.id;
  
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
  
      // Borrar el archivo temporal local si existe
      fs.access(file.path, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Error borrando archivo: ${file.path}`, unlinkErr);
            }
          });
        } else {
          console.warn(`Archivo no encontrado al intentar borrar: ${file.path}`);
        }
      });
  
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  
    } catch (err) {
      console.error('Error subiendo archivo a Drive:', err);
      return '';
    }
  }
  

  async function appendToSheet(data, files) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
  
    const sheetId = process.env.SHEET_ID;
    const sheetName = 'Registro Vendedores - Multitienda Occidente'; // nombre exacto de la hoja

     // ID de la carpeta principal en Drive donde se guardarán todos los envíos
    const masterFolderId = process.env.DRIVE_FOLDER_ID;

    // Crear carpeta personalizada para este envío
    const folderId = await createUserFolder(
        data.primerNombre,
        data.primerApellido,
        data.cedula,
        masterFolderId
    );
  
    // Subir archivos y obtener enlaces
    const cedulaLink = await uploadFileToDrive(files?.cedulaFile?.[0],folderId);
    const selfieLink = await uploadFileToDrive(files?.selfieFile?.[0], folderId);
    const rifLink = await uploadFileToDrive(files?.rifFile?.[0], folderId);
    const servicioLink = await uploadFileToDrive(files?.servicioFile?.[0], folderId);
  
    const values = [[
      data.primerNombre || '',
      data.segundoNombre || '',
      data.primerApellido || '',
      data.segundoApellido || '',
      data.cedula || '',
      data.email || '',
      cedulaLink,
      selfieLink,
      rifLink,
      data.estado || '',
      data.ciudad || '',
      data.sector || '',
      data.direccion || '',
      data.codigo1 || '',
      data.telefono1 || '',
      data.codigo2 || '',
      data.telefono2 || '',
      servicioLink,
      data.vendedor || '',
      data.estadoCivil || '',
      data.rolHogar || '',
      data.personas || '',
      data.vivienda || '',
      data.nivel || '',
      data.ingreso || '',
      data.ventas || '',
      data.recomendadoPor || '',
      data.plataforma || '',
      new Date().toLocaleString()
    ]];
    console.log('Datos a escribir en el sheet:', values);
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });
  
      console.log('✅ Datos escritos correctamente en el sheet.');
    } catch (error) {
      console.error('❌ Error escribiendo en el sheet:', error);
    }
  }
  

module.exports = { appendToSheet };
