
const STORAGE_KEY="applyflow";

function obtener(){
    const datos=localStorage.getItem(STORAGE_KEY);
    return datos?JSON.parse(datos):[];
}

function obtenerPorId(id){
    return obtener().find(postulacion=>postulacion.id===id);
}

function guardar(postulaciones){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(postulaciones));
}

function agregar(postulacion){
    const postulaciones=obtener();
    postulaciones.push(postulacion);
    guardar(postulaciones);
}

function actualizar(id,datosActualizados){
    const postulaciones=obtener();
    const indice=postulaciones.findIndex(postulacion=>postulacion.id===id);

    if(indice===-1) return false;

    postulaciones[indice]={
        ...postulaciones[indice],
        ...datosActualizados,
        actualizadoEn:new Date().toISOString()
    };

    guardar(postulaciones);
    return true;
}

function eliminar(id){
    const postulaciones=obtener().filter(postulacion=>postulacion.id!==id);
    guardar(postulaciones);
}