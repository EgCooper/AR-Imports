import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { connectDB } from './config/mongo.js';
import authRoutes from './routes/authRoutes.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  sendSuccess(res, 200, { message: 'Servidor operativo' });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });

    sendSuccess(res, 200, {
      message: 'Conexión a MongoDB exitosa',
      database: db.databaseName,
    });
  } catch (error) {
    sendError(res, 503, 'No se pudo conectar a MongoDB');
  }
});

app.listen(PORT, async () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  try {
    await connectDB();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
  }
});
