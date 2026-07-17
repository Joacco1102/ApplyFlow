/* ApplyFlow - app.js
Lógica de negocio, eventos, renderizado y control de la aplicación.
Habla con server.js vía fetch(). Estado y Portal ahora son selects
con opción "Otro..." para agregar valores nuevos.
*/

const API_URL = '/api/postulaciones';

// Valores por defecto: siempre existen, aunque Mongo no tenga documentos todavía.
const ESTADOS_DEFAULT = ['Postulado', 'En proceso', 'Entrevista', 'Oferta', 'Rechazado', 'Retirado'];
const PORTALES_DEFAULT = ['LinkedIn', 'Indeed'];

let filtroTexto = '';
let filtroEstado = '';
let filtroPortal = '';
let postulacionesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    registrarEventos();
    await render();
});

/* ---------------------------------------------------
RENDERIZADO PRINCIPAL
--------------------------------------------------- */

async function render() {
    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) throw new Error('No se pudo obtener la lista de postulaciones');

        postulacionesCache = await respuesta.json();

        const filtradas = aplicarFiltros(postulacionesCache);
        renderTabla(filtradas);
        renderDashboard(postulacionesCache);

        await cargarSelects();
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor. ¿Está corriendo "npm start"?');
    }
}

function renderDashboard(lista) {
    const total = lista.length;

    const rechazadas = lista.filter(p => (p.estado || '').toLowerCase().trim() === 'rechazado').length;

    const pendientes = lista.filter(p => {
        const estado = (p.estado || '').toLowerCase().trim();
        return estado !== 'rechazado' && estado !== 'retirado';
    }).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPendientes').textContent = pendientes;
    document.getElementById('statRechazadas').textContent = rechazadas;
}

function renderTabla(lista) {
    const tbody = document.getElementById('tbodyPostulaciones');
    const empty = document.getElementById('emptyState');

    const ordenadas = [...lista].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    if (ordenadas.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    tbody.innerHTML = ordenadas.map(p => `
    <tr>
        <td>${escapeHtml(p.empresa)}</td>
        <td>${escapeHtml(p.cargo)}</td>
        <td><span class="badge-estado ${claseEstado(p.estado)}">${escapeHtml(p.estado || '-')}</span></td>
        <td>${escapeHtml(p.portal || '-')}</td>
        <td>${formatearFecha(p.fecha)}</td>
        <td class="text-end">
        <button class="btn-accion" onclick="abrirEdicion('${p._id}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-accion eliminar" onclick="confirmarEliminar('${p._id}')" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
        </button>
        </td>
    </tr>
    `).join('');
}

function claseEstado(estado) {
    if (!estado) return '';
    const mapa = {
        'postulado': 'postulado',
        'en proceso': 'proceso',
        'entrevista': 'entrevista',
        'oferta': 'oferta',
        'rechazado': 'rechazado',
        'retirado': 'retirado'
    };
    const key = estado.toLowerCase().trim();
    return mapa[key] || 'proceso';
}

/* ---------------------------------------------------
FILTROS
--------------------------------------------------- */

function aplicarFiltros(lista) {
    return lista.filter(p => {
        const texto = filtroTexto.toLowerCase();
        const coincideTexto = !texto ||
            (p.empresa || '').toLowerCase().includes(texto) ||
            (p.cargo || '').toLowerCase().includes(texto);

        const coincideEstado = !filtroEstado ||
            (p.estado || '').toLowerCase() === filtroEstado.toLowerCase();

        const coincidePortal = !filtroPortal ||
            (p.portal || '').toLowerCase() === filtroPortal.toLowerCase();

        return coincideTexto && coincideEstado && coincidePortal;
    });
}

function limpiarFiltros() {
    filtroTexto = '';
    filtroEstado = '';
    filtroPortal = '';

    document.getElementById('fBuscar').value = '';
    document.getElementById('fEstado').value = '';
    document.getElementById('fPortal').value = '';

    renderTabla(aplicarFiltros(postulacionesCache));
}

/* ---------------------------------------------------
SELECTS: combina valores por defecto + los que ya
existan en Mongo (vía /api/catalogos), sin duplicar.
--------------------------------------------------- */

function combinarSinDuplicar(defaults, desdeDB) {
    const combinado = [...defaults];
    desdeDB.forEach(valor => {
        const yaExiste = combinado.some(v => v.toLowerCase() === valor.toLowerCase());
        if (!yaExiste) combinado.push(valor);
    });
    return combinado;
}

async function cargarSelects() {
    try {
        const respuesta = await fetch('/api/catalogos');
        if (!respuesta.ok) throw new Error('No se pudo obtener catálogos');

        const catalogos = await respuesta.json();

        const estados = combinarSinDuplicar(ESTADOS_DEFAULT, catalogos.estados);
        const portales = combinarSinDuplicar(PORTALES_DEFAULT, catalogos.portales);

        // Selects del modal (con opción "Otro...")
        llenarSelect('mEstado', estados, true);
        llenarSelect('mPortal', portales, true);

        // Selects de filtros (con opción "Todos", sin "Otro...")
        llenarSelectFiltro('fEstado', estados);
        llenarSelectFiltro('fPortal', portales);

        // CV sigue siendo datalist libre
        llenarDatalist('dlCV', catalogos.cvs);

    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

function llenarSelect(idSelect, valores, conOtro) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    let opciones = valores.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (conOtro) {
        opciones += `<option value="__otro__">Otro...</option>`;
    }
    select.innerHTML = opciones;
}

function llenarSelectFiltro(idSelect, valores) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    const opciones = valores.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.innerHTML = `<option value="">Todos</option>` + opciones;
}

function llenarDatalist(idDatalist, valores) {
    const dl = document.getElementById(idDatalist);
    if (!dl) return;
    dl.innerHTML = valores.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

/* ---------------------------------------------------
Mostrar/ocultar el campo "Otro..." según el select
--------------------------------------------------- */

function manejarSelectConOtro(idSelect, idInputOtro) {
    const select = document.getElementById(idSelect);
    const inputOtro = document.getElementById(idInputOtro);

    if (select.value === '__otro__') {
        inputOtro.style.display = 'block';
        inputOtro.value = '';
        inputOtro.focus();
    } else {
        inputOtro.style.display = 'none';
        inputOtro.value = '';
    }
}

// Devuelve el valor final a guardar: el del input "Otro" si está visible, si no, el del select
function valorFinalDeSelect(idSelect, idInputOtro) {
    const select = document.getElementById(idSelect);
    const inputOtro = document.getElementById(idInputOtro);

    if (select.value === '__otro__') {
        return inputOtro.value.trim();
    }
    return select.value;
}

/* ---------------------------------------------------
MODAL: NUEVO / EDITAR
--------------------------------------------------- */

function abrirNuevo() {
    document.getElementById('formPostulacion').reset();
    document.getElementById('mId').value = '';
    document.getElementById('modalTitulo').textContent = 'Registrar Postulación';
    document.getElementById('mFecha').value = new Date().toISOString().slice(0, 10);

    document.getElementById('mEstadoOtro').style.display = 'none';
    document.getElementById('mPortalOtro').style.display = 'none';
}

function abrirEdicion(id) {
    const item = postulacionesCache.find(p => p._id === id);
    if (!item) return;

    document.getElementById('mId').value = item._id;
    document.getElementById('mEmpresa').value = item.empresa || '';
    document.getElementById('mCargo').value = item.cargo || '';
    document.getElementById('mCV').value = item.cv || '';
    document.getElementById('mModalidad').value = item.modalidad || 'Presencial';
    document.getElementById('mFecha').value = item.fecha || '';
    document.getElementById('mEnlace').value = item.enlace || '';
    document.getElementById('mDescripcion').value = item.descripcion || '';
    document.getElementById('mNotas').value = item.notas || '';

    seleccionarOValorNuevo('mEstado', 'mEstadoOtro', item.estado);
    seleccionarOValorNuevo('mPortal', 'mPortalOtro', item.portal);

    document.getElementById('modalTitulo').textContent = 'Editar Postulación';

    new bootstrap.Modal(document.getElementById('modalPostulacion')).show();
}

// Si el valor guardado existe como <option>, lo selecciona.
// Si no existe (por ejemplo, se agregó como "Otro" y luego se recargaron los selects), cae en "Otro..." y lo muestra en el input.
function seleccionarOValorNuevo(idSelect, idInputOtro, valor) {
    const select = document.getElementById(idSelect);
    const inputOtro = document.getElementById(idInputOtro);

    const opcionExiste = Array.from(select.options).some(o => o.value.toLowerCase() === (valor || '').toLowerCase());

    if (opcionExiste) {
        select.value = Array.from(select.options).find(o => o.value.toLowerCase() === (valor || '').toLowerCase()).value;
        inputOtro.style.display = 'none';
        inputOtro.value = '';
    } else {
        select.value = '__otro__';
        inputOtro.style.display = 'block';
        inputOtro.value = valor || '';
    }
}

async function guardarDesdeFormulario() {
    const form = document.getElementById('formPostulacion');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const estadoFinal = valorFinalDeSelect('mEstado', 'mEstadoOtro');
    const portalFinal = valorFinalDeSelect('mPortal', 'mPortalOtro');

    if (!estadoFinal) {
        alert('Escribe el nuevo estado en el campo que apareció debajo del select.');
        return;
    }
    if (!portalFinal) {
        alert('Escribe el nuevo portal en el campo que apareció debajo del select.');
        return;
    }

    const id = document.getElementById('mId').value;

    const item = {
        empresa: document.getElementById('mEmpresa').value.trim(),
        cargo: document.getElementById('mCargo').value.trim(),
        portal: portalFinal,
        estado: estadoFinal,
        cv: document.getElementById('mCV').value.trim(),
        modalidad: document.getElementById('mModalidad').value,
        fecha: document.getElementById('mFecha').value,
        enlace: document.getElementById('mEnlace').value.trim(),
        descripcion: document.getElementById('mDescripcion').value.trim(),
        notas: document.getElementById('mNotas').value.trim()
    };

    try {
        let respuesta;

        if (id) {
            respuesta = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } else {
            respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }

        if (!respuesta.ok) throw new Error('El servidor rechazó la operación');

        bootstrap.Modal.getInstance(document.getElementById('modalPostulacion')).hide();
        await render();

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al guardar. Revisa la consola y que el servidor esté corriendo.');
    }
}

async function confirmarEliminar(id) {
    const item = postulacionesCache.find(p => p._id === id);
    if (!item) return;

    const ok = confirm(`¿Eliminar la postulación a "${item.empresa}" (${item.cargo})?\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    try {
        const respuesta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!respuesta.ok) throw new Error('El servidor no pudo eliminar el registro');

        await render();
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al eliminar. Revisa la consola.');
    }
}

/* ---------------------------------------------------
EVENTOS
--------------------------------------------------- */

function registrarEventos() {
    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('btnGuardar').addEventListener('click', guardarDesdeFormulario);

    document.getElementById('mEstado').addEventListener('change', () => manejarSelectConOtro('mEstado', 'mEstadoOtro'));
    document.getElementById('mPortal').addEventListener('change', () => manejarSelectConOtro('mPortal', 'mPortalOtro'));

    document.getElementById('fBuscar').addEventListener('input', (e) => {
        filtroTexto = e.target.value;
        renderTabla(aplicarFiltros(postulacionesCache));
    });

    document.getElementById('fEstado').addEventListener('change', (e) => {
        filtroEstado = e.target.value;
        renderTabla(aplicarFiltros(postulacionesCache));
    });

    document.getElementById('fPortal').addEventListener('change', (e) => {
        filtroPortal = e.target.value;
        renderTabla(aplicarFiltros(postulacionesCache));
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
}

/* ---------------------------------------------------
UTILIDADES
--------------------------------------------------- */

function escapeHtml(texto) {
    if (!texto) return '';
    return String(texto).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function formatearFecha(iso) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}