import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import './setup.js';
import { createApp } from '../src/createApp.js';

const app = createApp();

describe('API HTTP', () => {
  it('GET /api/health responde 200', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ok');
  });

  it('GET /api/ready responde 503 si la app no está lista', async () => {
    const res = await request(app).get('/api/ready');
    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
  });

  it('GET /api/ruta-inexistente responde 404', async () => {
    const res = await request(app).get('/api/ruta-inexistente');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/login sin credenciales responde 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.message, /requeridos/i);
  });

  it('GET /api/clients sin sesión responde 401', async () => {
    const res = await request(app).get('/api/clients');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/quotes sin sesión responde 401', async () => {
    const res = await request(app).get('/api/quotes');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/payments sin sesión responde 401', async () => {
    const res = await request(app).post('/api/payments').send({
      clienteId: '507f1f77bcf86cd799439011',
      monto: 100,
      concepto: 'PAGO_INICIAL',
      metodoPago: 'EFECTIVO',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
