/* ApplyFlow - storage.js
Responsabilidad única: acceso a LocalStorage.
No contiene lógica de renderizado ni eventos de UI.
*/

const DB_KEY = 'applyflow_postulaciones';
const CATALOGOS_KEY = 'applyflow_catalogos';

/* ---------------------------------------------------
POSTULACIONES - CRUD
--------------------------------------------------- */

function getPostulaciones() {
    try {
        const raw = localStorage.getItem(DB_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Error leyendo postulaciones:', e);
        return [];
    }
}

function savePostulaciones(lista) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(lista));
        return true;
    } catch (e) {
        console.error('Error guardando postulaciones:', e);
        return false;
    }
}

function getPostulacionPorId(id) {
    return getPostulaciones().find(p => p.id === id) || null;
}

function guardarPostulacion(item) {
    const lista = getPostulaciones();

    if (!item.id) {
        item.id = generarId();
        lista.push(item);
    } else {
        const idx = lista.findIndex(p => p.id === item.id);
        if (idx >= 0) {
            lista[idx] = item;
        } else {
            lista.push(item);
        }
    }

    savePostulaciones(lista);

    // Actualiza catálogos dinámicos con los valores nuevos que haya escrito el usuario
    actualizarCatalogo('portales', item.portal);
    actualizarCatalogo('estados', item.estado);
    actualizarCatalogo('cvs', item.cv);

    return item;
}

function eliminarPostulacion(id) {
    const lista = getPostulaciones().filter(p => p.id !== id);
    savePostulaciones(lista);
}

function generarId() {
    return 'app_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/* ---------------------------------------------------
CATÁLOGOS DINÁMICOS (Portal, Estado, CV)
Se guardan aparte para alimentar los <datalist>
--------------------------------------------------- */

function getCatalogos() {
    try {
        const raw = localStorage.getItem(CATALOGOS_KEY);
        return raw ? JSON.parse(raw) : {
            portales: ['LinkedIn', 'Indeed'],
            estados: ['Postulado', 'En proceso', 'Entrevista', 'Oferta', 'Rechazado', 'Retirado'],
            cvs: []
        };
    } catch (e) {
        console.error('Error leyendo catálogos:', e);
        return { portales: [], estados: [], cvs: [] };
    }
}

function saveCatalogos(catalogos) {
    localStorage.setItem(CATALOGOS_KEY, JSON.stringify(catalogos));
}

// Agrega un valor nuevo al catálogo correspondiente si no existe (sin distinguir mayúsculas)
function actualizarCatalogo(tipo, valor) {
    if (!valor || !valor.trim()) return;

    const catalogos = getCatalogos();
    const valorLimpio = valor.trim();
    const yaExiste = catalogos[tipo].some(v => v.toLowerCase() === valorLimpio.toLowerCase());

    if (!yaExiste) {
        catalogos[tipo].push(valorLimpio);
        saveCatalogos(catalogos);
    }
}

/* ---------------------------------------------------
EXPORTAR / IMPORTAR (respaldo manual)
--------------------------------------------------- */

function exportarDatos() {
    const data = {
        postulaciones: getPostulaciones(),
        catalogos: getCatalogos(),
        exportadoEl: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `applyflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// Recibe el contenido ya leído de un archivo (texto plano) e intenta reemplazar/fusionar los datos
function importarDatos(jsonTexto, modo = 'reemplazar') {
    let data;

    try {
        data = JSON.parse(jsonTexto);
    } catch (e) {
        throw new Error('El archivo no tiene un formato JSON válido.');
    }

    if (!data.postulaciones || !Array.isArray(data.postulaciones)) {
        throw new Error('El archivo no contiene un respaldo de ApplyFlow válido.');
    }

    if (modo === 'reemplazar') {
        savePostulaciones(data.postulaciones);
        if (data.catalogos) saveCatalogos(data.catalogos);
    } else {
        // modo 'fusionar': combina sin duplicar por id
        const actuales = getPostulaciones();
        data.postulaciones.forEach(item => {
            const idx = actuales.findIndex(p => p.id === item.id);
            if (idx >= 0) actuales[idx] = item;
            else actuales.push(item);
        });
        savePostulaciones(actuales);

        if (data.catalogos) {
            Object.keys(data.catalogos).forEach(tipo => {
                data.catalogos[tipo].forEach(valor => actualizarCatalogo(tipo, valor));
            });
        }
    }

    return data.postulaciones.length;
}