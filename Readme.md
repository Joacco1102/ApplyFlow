# 📋 ApplyFlow

**Aplicación web para el seguimiento personal de postulaciones laborales.**

ApplyFlow nace de una necesidad real: ordenar y visualizar el proceso de búsqueda de empleo (empresas contactadas, estados, entrevistas, portales usados) en un solo lugar, sin depender de una hoja de cálculo dispersa.

---

## 🎯 ¿Qué hace?

- Registra cada postulación con empresa, cargo, portal, estado, modalidad, fecha, enlace de la oferta, descripción del puesto y notas personales.
- Muestra un **dashboard** con el total de postulaciones, cuántas siguen activas y cuántas fueron rechazadas.
- Permite **filtrar en tiempo real** por empresa/cargo, estado o portal.
- Aprende de ti: los campos "Portal", "Estado" y "CV Utilizado" sugieren automáticamente los valores que ya has usado antes, sin listas fijas que limiten al usuario.
- Persiste los datos en la nube (MongoDB Atlas), disponibles desde cualquier sesión del navegador.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, Bootstrap 5, JavaScript (vanilla, sin frameworks) |
| Backend | Node.js + Express |
| Base de datos | MongoDB Atlas (NoSQL, en la nube) |
| Comunicación | API REST propia (`fetch` + JSON) |

**Por qué este stack:** el proyecto está pensado para ser simple de leer y mantener — sin frameworks de frontend (React, Vue, Angular) ni ORMs pesados. Cada capa tiene una responsabilidad clara: el navegador solo pinta datos, Express expone la API, y MongoDB los almacena.

---

## 🏗️ Arquitectura

```
Navegador (HTML/CSS/JS)
        │
        │  fetch() → peticiones HTTP (GET, POST, PUT, DELETE)
        ▼
Servidor Express (server.js)
        │
        │  driver oficial de MongoDB
        ▼
MongoDB Atlas (colección "Postulaciones")
```

---

## 📁 Estructura del proyecto

```
ApplyFlow/
│── server.js              → Servidor Express + conexión a MongoDB + rutas API
│── .env                    → Variables de entorno (credenciales, no se versiona)
│── package.json
│
└── public/
      index.html            → Estructura de la app
      css/style.css         → Estilos (paleta "Modern Executive")
      js/app.js             → Lógica de UI, filtros y llamadas a la API
```

---

## 🚀 Cómo correrlo localmente

1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```
2. Crear un archivo `.env` en la raíz con tus propias credenciales de MongoDB Atlas:
   ```
   MONGODB_URI=tu_connection_string_aqui
   DB_NAME=ApplyFlow
   COLLECTION_NAME=Postulaciones
   PORT=3000
   ```
3. Levantar el servidor:
   ```bash
   npm start
   ```
4. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

---

## 💡 Decisiones de diseño

- **Sin frameworks de frontend**: se priorizó JavaScript nativo para mantener el código legible y sin dependencias innecesarias, dado el alcance del proyecto.
- **NoSQL sobre SQL**: al tratarse de un solo tipo de registro (postulación) con campos flexibles, un modelo de documentos evita definir esquemas rígidos por adelantado.
- **Catálogos dinámicos vía `distinct()`**: en vez de mantener listas de valores aparte, se aprovechó una consulta nativa de MongoDB para derivar sugerencias directamente de los datos existentes, reduciendo lógica duplicada.

---

## 👤 Autor

Proyecto personal desarrollado como ejercicio práctico de desarrollo full-stack (frontend + backend + base de datos en la nube).