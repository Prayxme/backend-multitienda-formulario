const express = require('express');
const { appendToSheet } = require('./google.js');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Almacenamiento personalizado para mantener la extensión original
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

  const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos JPEG, JPG, PNG o PDF'));
      }
    }
  });

app.post('/submit-form', upload.fields([
  { name: 'cedulaFile' },
  { name: 'selfieFile' },
  { name: 'rifFile' },
  { name: 'servicioFile' }
]), async (req, res) => {
  try {
    const filesToDelete = [];

    const data = {
      primerNombre: req.body.primerNombre,
      segundoNombre: req.body.segundoNombre,
      primerApellido: req.body.primerApellido,
      segundoApellido: req.body.segundoApellido,
      cedula: req.body.cedula,
      email: req.body.email,
      cedulaFile: req.files['cedulaFile'] ? req.files['cedulaFile'][0].path : null,
      selfieFile: req.files['selfieFile'] ? req.files['selfieFile'][0].path : null,
      rifFile: req.files['rifFile'] ? req.files['rifFile'][0].path : null,
      estado: req.body.estado,
      ciudad: req.body.ciudad,
      sector: req.body.sector,
      direccion: req.body.direccion,
      codigo1: req.body.codigo1,
      telefono1: req.body.telefono1,
      codigo2: req.body.codigo2,
      telefono2: req.body.telefono2,
      servicioFile: req.files['servicioFile'] ? req.files['servicioFile'][0].path : null,
      vendedor: req.body.vendedor,
      estadoCivil: req.body.estadoCivil,
      rolHogar: req.body.rolHogar,
      personas: req.body.personas,
      vivienda: req.body.vivienda,
      nivel: req.body.nivel,
      ingreso: req.body.ingreso,
      ventas: req.body.ventas,
      recomendadoPor: req.body.recomendadoPor,
      plataforma: req.body.plataforma
    };

    // Agrega archivos a lista de borrado
    for (let key in req.files) {
      if (req.files[key]) {
        filesToDelete.push(req.files[key][0].path);
      }
    }

    // Lógica de envío a Google Sheets y Google Drive
    await appendToSheet(data, req.files); // Aquí también puedes subir a Google Drive si quieres

    // Borrar archivos
    filesToDelete.forEach(filePath => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error borrando archivo:', filePath, err);
        else console.log('Archivo borrado:', filePath);
      });
    });


    console.log('Formulario enviado correctamente a Google Sheets', data);
    res.status(200).json({ message: 'Formulario enviado correctamente a Google Sheets' });
  } catch (error) {
    console.error('Error al procesar el formulario:', error);
    res.status(500).json({ error: 'Hubo un error al procesar el formulario' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
