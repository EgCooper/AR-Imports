import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatClient,
  formatPayment,
  formatPhoto,
  formatQuoteDocument,
  toIdString,
} from '../src/utils/formatters.js';
import { ObjectId } from 'mongodb';

describe('formatters', () => {
  it('toIdString convierte ObjectId a string', () => {
    const id = new ObjectId();
    assert.equal(toIdString(id), id.toString());
  });

  it('formatClient expone id y omite _id', () => {
    const id = new ObjectId();
    const formatted = formatClient({ _id: id, nombreCompleto: 'Ana', vin: 'X' });
    assert.equal(formatted.id, id.toString());
    assert.equal(formatted.nombreCompleto, 'Ana');
    assert.equal(formatted._id, undefined);
  });

  it('formatPayment normaliza clienteId', () => {
    const clientId = new ObjectId();
    const paymentId = new ObjectId();
    const formatted = formatPayment({
      _id: paymentId,
      clienteId: clientId,
      monto: 100,
      concepto: 'PAGO_INICIAL',
    });
    assert.equal(formatted.id, paymentId.toString());
    assert.equal(formatted.clienteId, clientId.toString());
  });

  it('formatPhoto y formatQuoteDocument usan id string', () => {
    const id = new ObjectId();
    const photo = formatPhoto({ _id: id, clienteId: id, fotoUrl: '/uploads/vehicles/a.jpg' });
    const quote = formatQuoteDocument({ _id: id, clienteId: id, totalVehiculo: 5000 });
    assert.equal(photo.id, id.toString());
    assert.equal(quote.id, id.toString());
    assert.equal(quote.clienteId, id.toString());
  });
});
