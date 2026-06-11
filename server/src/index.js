import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/mongo.js';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors());
app.use('/uploads/vehicles', express.static(path.join(__dirname, '../uploads/vehicles')));
app.use('/uploads/comprobantes', express.static(path.join(__dirname, '../uploads/comprobantes')));
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/photos', photoRoutes);

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
