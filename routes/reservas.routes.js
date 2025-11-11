const express = require('express');
const router = express.Router();
const ds = require('../utils/datastore');

const FILE = 'reservas.json';
const LAB_FILE = 'laboratorios.json';

// util: chequear solapamiento en un laboratorio
function overlaps(aStart, aEnd, bStart, bEnd) {
  // asume ISO strings -> Date
  const A1 = new Date(aStart).getTime();
  const A2 = new Date(aEnd).getTime();
  const B1 = new Date(bStart).getTime();
  const B2 = new Date(bEnd).getTime();
  return A1 < B2 && B1 < A2;
}

// GET /api/v1/reservas ?desde=ISO&hasta=ISO
router.get('/', async (req, res, next) => {
  try {
    let items = await ds.getAll(FILE);
    if (req.query.desde || req.query.hasta) {
      const desde = req.query.desde ? new Date(req.query.desde).getTime() : -Infinity;
      const hasta = req.query.hasta ? new Date(req.query.hasta).getTime() : Infinity;
      items = items.filter(r => {
        const inicio = new Date(r.inicio).getTime();
        const fin = new Date(r.fin).getTime();
        return !(fin < desde || inicio > hasta);
      });
    }
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await ds.getById(FILE, req.params.id);
    if (!r) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json(r);
  } catch (err) { next(err); }
});

// POST /api/v1/reservas
router.post('/', async (req, res, next) => {
  try {
    const { laboratorioId, responsable, inicio, fin, descripcion } = req.body;
    const errors = [];
    if (!laboratorioId) errors.push('laboratorioId obligatorio');
    if (!responsable || typeof responsable !== 'string') errors.push('responsable obligatorio (string)');
    if (!inicio || !fin) errors.push('inicio y fin obligatorios (ISO strings)');
    const start = new Date(inicio).getTime();
    const end = new Date(fin).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) errors.push('fin debe ser > inicio y fechas válidas');

    // verificar laboratorio existe
    const lab = await ds.getById(LAB_FILE, laboratorioId);
    if (!lab) errors.push('laboratorioId no existe');

    if (errors.length) return res.status(400).json({ error: 'Bad Request', details: errors });

    // validar solapamiento
    const all = await ds.getAll(FILE);
    const conflicting = all.find(r => String(r.laboratorioId) === String(laboratorioId) && overlaps(r.inicio, r.fin, inicio, fin));
    if (conflicting) {
      return res.status(409).json({ error: 'Conflicto de horario con reserva existente', conflict: conflicting });
    }

    const reserva = await ds.create(FILE, {
      laboratorioId: Number(laboratorioId),
      responsable,
      inicio,
      fin,
      descripcion: descripcion || '',
      estado: 'pendiente'
    });
    res.status(201).json(reserva);
  } catch (err) { next(err); }
});

// POST /api/v1/reservas/:id/cancelar
router.post('/:id/cancelar', async (req, res, next) => {
  try {
    const r = await ds.getById(FILE, req.params.id);
    if (!r) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (r.estado === 'cancelada') return res.status(409).json({ error: 'Reserva ya cancelada' });
    const updated = await ds.update(FILE, req.params.id, { estado: 'cancelada' });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
