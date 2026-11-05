# 📱 Asistente Virtual Inteligente de Soporte al Cliente - Entel Perú 🇵🇪

API REST inteligente y moderna interfaz web de atención al cliente automatizada para **Entel Perú**, construida con **Node.js**, **Express**, **MongoDB (Mongoose)** y la **API oficial de Google Gemini (`@google/genai`)** utilizando el modelo `gemini-2.5-flash` con **Respuestas Estructuradas JSON**.

---

## 🏗️ Arquitectura del Proyecto

```
ChatBot/
├── config/
│   └── db.js                 # Conexión resiliente a MongoDB Atlas o local
├── controllers/
│   ├── authController.js     # Registro, login e inspección de usuarios (JWT)
│   └── supportController.js  # Procesamiento del chat con Gemini y persistencia
├── middleware/
│   ├── authMiddleware.js     # Verificación obligatoria y opcional de JWT
│   └── errorMiddleware.js    # Manejo centralizado de 404 y errores 500
├── models/
│   ├── Conversation.js       # Registro de consultas, respuestas, categorías y derivaciones
│   └── User.js               # Modelo de usuario con bcryptjs pre-save hook
├── public/
│   ├── index.html            # Interfaz de chat corporativa con identidad Entel
│   ├── style.css             # Estilos responsive con Azul (#002EFF) y Naranja (#FF7900)
│   └── script.js             # Lógica del cliente fetch, chips y formato markdown
├── routes/
│   ├── authRoutes.js         # Rutas de autenticación (/api/auth)
│   └── supportRoutes.js      # Rutas de chat y FAQs (/api/support)
├── services/
│   └── geminiService.js      # Integración oficial con @google/genai y JSON Schema
├── .env                      # Variables de entorno locales
├── .env.example              # Plantilla de variables de entorno
├── app.js                    # Configuración de Express, Helmet, CORS y Rate Limit
├── package.json              # Dependencias y scripts npm
├── server.js                 # Punto de entrada y levantamiento del servidor
└── README.md                 # Documentación técnica completa
```

---

## 🚀 Requisitos Previos

1. **Node.js**: v18 o superior (recomendado v20+).
2. **MongoDB**: Instancia local de MongoDB o una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/atlas).
3. **Google Gemini API Key**: Obtén tu API Key gratuita en [Google AI Studio](https://aistudio.google.com/).

---

## ⚙️ Variables de Entorno (`.env`)

Copia el archivo `.env.example` a `.env` si aún no lo has hecho:

```bash
cp .env.example .env
```

Configura tus credenciales en el archivo `.env`:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.mongodb.net/entel_support?retryWrites=true&w=majority
JWT_SECRET=tu_clave_secreta_jwt_super_segura_entel_2025
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=AIzaSy...TuApiKeyDeGoogleGemini
```

---

## 📦 Instalación y Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor

- **Modo Desarrollo (con auto-reload):**
  ```bash
  npm run dev
  ```

- **Modo Producción:**
  ```bash
  npm start
  ```

Una vez iniciado, abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧠 Características de la IA con Gemini 2.5 Flash

El servicio `services/geminiService.js` implementa el SDK oficial `@google/genai`:

- **Modelo**: `gemini-2.5-flash` con baja latencia y alta precisión contextual.
- **System Instruction**: Entrenado con el portafolio comercial de Entel Perú:
  - Planes Postpago **Entel Power** (S/ 29.90, 39.90, 49.90, 69.90 con gigas ilimitados y política de uso justo).
  - Consulta de saldo de datos y minutos marcando **`*144#`** o desde la **App Mi Entel**.
  - Recargas prepago desde S/ 5 por Yape, Plin o bancos.
  - Canales de autoservicio: App Mi Entel, web `entel.pe`, WhatsApp oficial `+51 994 860 000` y marcación al `123`.
  - Migración a **eSIM digital** y portabilidad 100% online.
- **Esquema Estructurado JSON (`responseSchema`)**:
  ```json
  {
    "category": "recibo_pago | saldo_bolsas | internet_llamadas | chip_esim | portabilidad | equipo | reclamo | otro",
    "summary": "Resumen conciso en 1 línea",
    "reply": "Respuesta detallada y cordial para el cliente",
    "suggestedSteps": ["Paso 1", "Paso 2"],
    "requiresHuman": false
  }
  ```
- **Regla Estricta para `requiresHuman`**:
  `requiresHuman` se activa como `true` **ÚNICAMENTE** en los siguientes 3 casos:
  1. El cliente exige explícitamente hablar con un asesor o humano.
  2. El cliente solicita formalmente la cancelación o baja de la línea.
  3. El cliente presenta un reclamo por cobro excesivo o facturación indebida.

---

## 📡 Endpoints de la API REST

### 1. Soporte y Chatbot (`/api/support`)

#### `POST /api/support/chat`
Envía una consulta y obtiene una respuesta estructurada generada por Gemini. Si el usuario incluye un token JWT en la cabecera `Authorization: Bearer <token>`, la conversación se asocia a su cuenta.

- **Body (JSON):**
  ```json
  {
    "message": "¿Cómo consulto mis gigas disponibles y compro una bolsa de datos?",
    "history": [
      { "role": "user", "content": "Hola" },
      { "role": "model", "content": "¡Hola! ¿En qué puedo ayudarte hoy?" }
    ]
  }
  ```
- **Respuesta (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "672...db_id",
      "reply": "Para consultar tu saldo de gigas y comprar bolsas adicionales en Entel Perú tienes dos opciones principales...",
      "category": "saldo_bolsas",
      "summary": "Consulta de gigas y compra de bolsas vía *144# y App Mi Entel",
      "suggestedSteps": [
        "Marca *144# gratis desde tu celular Entel",
        "Selecciona la opción 1 para saldo o 2 para comprar bolsas",
        "Ingresa a la App Mi Entel para ver tu consumo gráfico en tiempo real"
      ],
      "requiresHuman": false,
      "createdAt": "2026-11-05T15:45:00.000Z"
    }
  }
  ```

#### `GET /api/support/history`
Consulta el historial de conversaciones guardadas en MongoDB con soporte de paginación (`?page=1&limit=20`) y filtros (`?category=recibo_pago&requiresHuman=true`).

#### `GET /api/support/faqs`
Devuelve los accesos directos y preguntas frecuentes comerciales preconfiguradas.

---

### 2. Autenticación (`/api/auth`)

#### `POST /api/auth/register`
Registra un nuevo usuario con contraseña hasheada mediante `bcryptjs`.
- **Body:** `{ "username": "carlos_entel", "email": "carlos@example.pe", "password": "mipassword123" }`

#### `POST /api/auth/login`
Autentica al usuario y devuelve un token JWT con vigencia configurable.
- **Body:** `{ "email": "carlos@example.pe", "password": "mipassword123" }`

#### `GET /api/auth/me`
Obtiene los datos del perfil autenticado (`Authorization: Bearer <token>`).

---

### 3. Monitoreo y Salud

#### `GET /api/health`
Retorna el estado operativo de la API, tiempo activo, estado de la conexión con MongoDB y el modelo de IA activo.

---

## 🎨 Interfaz Web Corporativa Entel (`public/`)

- Colores oficiales: **Azul Entel (`#002EFF`)** y **Naranja Entel (`#FF7900`)**.
- Totalmente responsive (ordenador, tablet y smartphone).
- Chips interactivos con preguntas rápidas comunes.
- Indicador visual animado de escritura.
- Renderizado de badges por categoría, listas de pasos recomendados y caja de alerta prioritaria para derivación a asesores humanos con enlace directo a WhatsApp y llamada telefónica gratuita al 123.

