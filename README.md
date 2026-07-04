# ARR-Imports

Sistema ERP para la gestión de vehículos importados desde EEUU a Bolivia.

## Estructura del proyecto

```
ARR-Imports/
├── server/          → Backend (Node.js + Express + MongoDB)
│   ├── src/
│   ├── package.json
│   └── .env
└── client/          → Frontend (React)
    ├── src/
    └── package.json
```

## Backend (`server/`)

```bash
cd server
cp .env.example .env   # configurar variables
npm install
npm run dev            # http://localhost:3001
```

## Frontend (`client/`)

```bash
cd client
cp .env.example .env   # opcional
npm install
npm run dev            # http://localhost:5173
```

## API

Base URL: `http://localhost:3001/api`
