# 🛒 Radar Black Friday SV 2026

Plataforma web independiente de código abierto para consultar y comparar precios históricos en los principales comercios de El Salvador durante la temporada de fin de año.

---

## ✨ Características

* **Comparativa directa**: Consulta precios del mismo modelo en múltiples tiendas locales.
* **Historial transparente**: Visualización de precios habituales frente a promociones de temporada.
* **Diseño Mobile-First**: Interfaz rápida, accesible y optimizada para uso en dispositivos móviles.
* **Arquitectura de alto rendimiento**: Carga instantánea con soporte para navegación offline.

---

## 🛠️ Stack Tecnológico

* **Frontend**: React 19, TypeScript, Vite.
* **Estilos**: Tailwind CSS.
* **Despliegue**: Cloudflare Pages / Workers.
* **Datos**: Integración con almacenamiento estructurado y snapshots estáticos de alta disponibilidad.

---

## 🚀 Inicio Rápido en Local

### Requisitos previos
* Node.js v20 o superior
* npm v10 o superior

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/dannieldev/blackfridaysv.git
cd blackfridaysv

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3030`.

---

## 📂 Estructura del Proyecto

```text
blackfridaysv/
├── apps/
│   └── web/            # Aplicación web frontend (React + Tailwind)
├── packages/
│   └── scrapers/       # Módulos de procesamiento y extracción de datos
└── supabase/
    └── migrations/     # Esquemas de base de datos
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
