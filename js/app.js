/* ApplyFlow - app.js
Lógica de negocio, eventos, renderizado y control de la aplicación.
Depende de storage.js (debe cargarse antes en el HTML).
*/

// Estado de filtros en memoria
let filtroTexto = '';
let filtroEstado = '';
let filtroPortal = '';

document.addEventListener('DOMContentLoaded', () => {
    cargarDatalists();
    render();
    registrarEventos();
});

/* ---------------------------------------------------
RENDERIZADO PRINCIPAL
--------------------------------------------------- */

function render() {
    const todas = getPostulaciones();
    const filtradas = aplicarFiltros(todas);

    renderTabla(filtradas);
    renderDashboard(todas);
}

function renderDashboard(lista) {
    const total = lista.length;

    const rechazadas = lista.filter(p => (p.estado || '').toLowerCase() === 'rechazado').length;
    const retiradas = lista.filter(p => (p.estado || '').toLowerCase() === 'retirado').length;

    const pendientes = lista.filter(p => {
        const estado = (p.estado || '').toLowerCase();
        return estado !== 'rechazado' && estado !== 'retirado';
    }).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPendientes').textContent = pendientes;
    document.getElementById('statRechazadas').textContent = rechazadas;
}
function renderTabla(lista) {
    const tbody = document.getElementById('tbodyPostulaciones');
    const empty = document.getElementById('emptyState');

    // Orden: más recientes primero
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
        <button class="btn-accion" onclick="abrirEdicion('${p.id}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-accion eliminar" onclick="confirmarEliminar('${p.id}')" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
        </button>
        </td>
        </tr>
    `).join('');
}

// Mapea el texto del estado a una clase CSS (minúsculas, sin tildes ni espacios)
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
    return mapa[key] || 'proceso'; // estados nuevos que el usuario invente caen en "proceso" por defecto
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

    render();
}

/* ---------------------------------------------------
DATALISTS (catálogos dinámicos)
--------------------------------------------------- */

function cargarDatalists() {
    const catalogos = getCatalogos();

    llenarDatalist('dlPortales', catalogos.portales);
    llenarDatalist('dlEstados', catalogos.estados);
    llenarDatalist('dlCV', catalogos.cvs);

    // Los datalist de los filtros reutilizan los mismos catálogos
    llenarDatalist('dlPortalesFiltro', catalogos.portales);
    llenarDatalist('dlEstadosFiltro', catalogos.estados);
}

function llenarDatalist(idDatalist, valores) {
    const dl = document.getElementById(idDatalist);
    if (!dl) return;
    dl.innerHTML = valores.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

/* ---------------------------------------------------
MODAL: NUEVO / EDITAR
--------------------------------------------------- */

function abrirNuevo() {
    document.getElementById('formPostulacion').reset();
    document.getElementById('mId').value = '';
    document.getElementById('modalTitulo').textContent = 'Registrar Postulación';
    document.getElementById('mFecha').value = new Date().toISOString().slice(0, 10);
}

function abrirEdicion(id) {
    const item = getPostulacionPorId(id);
    if (!item) return;

    document.getElementById('mId').value = item.id;
    document.getElementById('mEmpresa').value = item.empresa || '';
    document.getElementById('mCargo').value = item.cargo || '';
    document.getElementById('mPortal').value = item.portal || '';
    document.getElementById('mEstado').value = item.estado || '';
    document.getElementById('mCV').value = item.cv || '';
    document.getElementById('mModalidad').value = item.modalidad || 'Presencial';
    document.getElementById('mFecha').value = item.fecha || '';
    document.getElementById('mEnlace').value = item.enlace || '';
    document.getElementById('mDescripcion').value = item.descripcion || '';
    document.getElementById('mNotas').value = item.notas || '';

    document.getElementById('modalTitulo').textContent = 'Editar Postulación';

    new bootstrap.Modal(document.getElementById('modalPostulacion')).show();
}

function guardarDesdeFormulario() {
    const form = document.getElementById('formPostulacion');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const item = {
        id: document.getElementById('mId').value || null,
        empresa: document.getElementById('mEmpresa').value.trim(),
        cargo: document.getElementById('mCargo').value.trim(),
        portal: document.getElementById('mPortal').value.trim(),
        estado: document.getElementById('mEstado').value.trim(),
        cv: document.getElementById('mCV').value.trim(),
        modalidad: document.getElementById('mModalidad').value,
        fecha: document.getElementById('mFecha').value,
        enlace: document.getElementById('mEnlace').value.trim(),
        descripcion: document.getElementById('mDescripcion').value.trim(),
        notas: document.getElementById('mNotas').value.trim()
    };

    guardarPostulacion(item);
    cargarDatalists(); // por si se agregó un valor nuevo a algún catálogo

    bootstrap.Modal.getInstance(document.getElementById('modalPostulacion')).hide();
    render();
}

function confirmarEliminar(id) {
    const item = getPostulacionPorId(id);
    if (!item) return;

    const ok = confirm(`¿Eliminar la postulación a "${item.empresa}" (${item.cargo})?\n\nEsta acción no se puede deshacer.`);
    if (ok) {
        eliminarPostulacion(id);
        render();
    }
}

/* ---------------------------------------------------
EXPORTAR / IMPORTAR
--------------------------------------------------- */

function manejarImportacion(archivo) {
    const lector = new FileReader();

    lector.onload = (evento) => {
        try {
            const cantidad = importarDatos(evento.target.result, 'fusionar');
            cargarDatalists();
            render();
            alert(`Importación completada. Se procesaron ${cantidad} postulación(es).`);
        } catch (error) {
            alert(error.message);
        }
    };

    lector.readAsText(archivo);
}

/* ---------------------------------------------------
EVENTOS
--------------------------------------------------- */

function registrarEventos() {
    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('btnGuardar').addEventListener('click', guardarDesdeFormulario);

    document.getElementById('fBuscar').addEventListener('input', (e) => {
        filtroTexto = e.target.value;
        render();
    });

    document.getElementById('fEstado').addEventListener('input', (e) => {
        filtroEstado = e.target.value;
        render();
    });

    document.getElementById('fPortal').addEventListener('input', (e) => {
        filtroPortal = e.target.value;
        render();
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    document.getElementById('btnExportar').addEventListener('click', exportarDatos);

    document.getElementById('btnImportar').addEventListener('click', () => {
        document.getElementById('inputImportar').click();
    });

    document.getElementById('inputImportar').addEventListener('change', (e) => {
        const archivo = e.target.files[0];
        if (archivo) {
            manejarImportacion(archivo);
        }
        e.target.value = ''; // permite volver a importar el mismo archivo si hace falta
    });
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