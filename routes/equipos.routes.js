const express = require('express');
const router = express.Router();
const ds = require('../utils/datastore');

const FILE = 'equipos.json';
const LAB_FILE = 'laboratorios.json';

// GET /api/v1/equipos
// filtros ?estado=, ?nombre=
router.get('/', async (req, res, next) => {
  try {
    let items = await ds.getAll(FILE);
    if (req.query.estado) items = items.filter(e => e.estado === req.query.estado);
    if (req.query.nombre) {
      const q = req.query.nombre.toLowerCase();
      items = items.filter(e => (e.nombre || '').toLowerCase().includes(q));
    }
    res.json({ data: items });
  } catch (err) { next(err); }
});

// GET /api/v1/equipos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const eq = await ds.getById(FILE, req.params.id);
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(eq);
  } catch (err) { next(err); }
});

// POST /api/v1/equipos
router.post('/', async (req, res, next) => {
  try {
    const { codigo, nombre, laboratorioId, estado } = req.body;
    const errors = [];
    if (!codigo || typeof codigo !== 'string') errors.push('codigo obligatorio (string)');
    if (!nombre || typeof nombre !== 'string') errors.push('nombre obligatorio (string)');
    if (laboratorioId === undefined || isNaN(Number(laboratorioId))) errors.push('laboratorioId obligatorio (number)');

    // verificar laboratorio existe
    const lab = await ds.getById(LAB_FILE, laboratorioId);
    if (!lab) errors.push('laboratorioId no existe');

    // codigo unico
    const all = await ds.getAll(FILE);
    if (all.some(e => (e.codigo || '').toLowerCase() === (codigo || '').toLowerCase())) {
      return res.status(409).json({ error: 'Codigo de equipo ya existe' });
    }

    if (errors.length) return res.status(400).json({ error: 'Bad Request', details: errors });

    const eq = await ds.create(FILE, {
      codigo, nombre, laboratorioId: Number(laboratorioId),
      estado: ['disponible','mantenimiento','fuera_de_servicio'].includes(estado) ? estado : 'disponible'
    });
    res.status(201).json(eq);
  } catch (err) { next(err); }
});

// GET /api/v1/laboratorios/:labId/equipos (rutas anidadas)
router.get('/laboratorio/:labId', async (req, res, next) => {
  try {
    const labId = req.params.labId;
    const all = await ds.getAll(FILE);
    const items = all.filter(e => String(e.laboratorioId) === String(labId));
    res.json({ data: items });
  } catch (err) { next(err); }
});

module.exports = router;
