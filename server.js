// server.js
// Servidor Express que expone una API REST y habla con MongoDB Atlas.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());                          // permite peticiones desde el navegador
app.use(express.json());                  // permite leer JSON en el body de las peticiones
app.use(express.static('public'));        // sirve index.html, css, js desde /public

let db;
let coleccion;

// ---------------------------------------------------
// Conexión a MongoDB (se hace una sola vez al arrancar)
// ---------------------------------------------------
async function conectarDB() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    db = client.db(process.env.DB_NAME);
    coleccion = db.collection(process.env.COLLECTION_NAME);

    console.log(`✅ Conectado a MongoDB → ${process.env.DB_NAME}/${process.env.COLLECTION_NAME}`);
}

// ---------------------------------------------------
// RUTAS - Postulaciones (CRUD)
// ---------------------------------------------------

// Obtener todas las postulaciones
app.get('/api/postulaciones', async (req, res) => {
    try {
        const lista = await coleccion.find().toArray();
        res.json(lista);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las postulaciones' });
    }
});

// Crear una nueva postulación
app.post('/api/postulaciones', async (req, res) => {
    try {
        const nueva = req.body;
        const resultado = await coleccion.insertOne(nueva);
        res.status(201).json({ ...nueva, _id: resultado.insertedId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la postulación' });
    }
});

// Editar una postulación existente
app.put('/api/postulaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datos = req.body;

        delete datos._id; // nunca se debe intentar sobreescribir el _id

        await coleccion.updateOne(
            { _id: new ObjectId(id) },
            { $set: datos }
        );

        res.json({ mensaje: 'Postulación actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la postulación' });
    }
});

// Eliminar una postulación
app.delete('/api/postulaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await coleccion.deleteOne({ _id: new ObjectId(id) });
        res.json({ mensaje: 'Postulación eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la postulación' });
    }
});

// ---------------------------------------------------
// RUTA - Catálogos dinámicos (Portal, Estado, CV)
// En vez de guardarlos aparte (como en LocalStorage),
// Mongo nos permite pedir directamente los valores
// únicos que YA existen en la colección con .distinct()
// ---------------------------------------------------
app.get('/api/catalogos', async (req, res) => {
    try {
        const [portales, estados, cvs] = await Promise.all([
            coleccion.distinct('portal'),
            coleccion.distinct('estado'),
            coleccion.distinct('cv')
        ]);

        res.json({
            portales: portales.filter(Boolean),
            estados: estados.filter(Boolean),
            cvs: cvs.filter(Boolean)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener catálogos' });
    }
});

// ---------------------------------------------------
// Arranque del servidor
// ---------------------------------------------------
conectarDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}).catch(error => {
    console.error('❌ No se pudo conectar a MongoDB:', error.message);
});