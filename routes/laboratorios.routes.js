const express = require('express');
const router = express.Router();
const ds = require('../utils/datastore');

const FILE = 'laboratorios.json';

// GET /api/v1/laboratorios
// Soporta: ?activo=true|false, ?capacidadMin=, ?search=, ?sort=capacidad&order=asc|desc, ?page=&limit=
router.get('/', async (req, res, next) => {
  try {
    let items = await ds.getAll(FILE);

    // filtros
    if (req.query.activo !== undefined) {
      const val = req.query.activo === 'true';
      items = items.filter(i => Boolean(i.activo) === val);
    }
    if (req.query.capacidadMin) {
      const min = Number(req.query.capacidadMin);
      items = items.filter(i => Number(i.capacidad) >= min);
    }
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      items = items.filter(i =>
        (i.nombre || '').toLowerCase().includes(q) ||
        (i.ubicacion || '').toLowerCase().includes(q)
      );
    }

    // ordenamiento
    if (req.query.sort) {
      const key = req.query.sort;
      const order = (req.query.order || 'asc') === 'asc' ? 1 : -1;
      items.sort((a,b) => {
        if (a[key] < b[key]) return -1 * order;
        if (a[key] > b[key]) return 1 * order;
        return 0;
      });
    }

    // paginación
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || items.length);
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    res.json({ data: paged, meta: { total: items.length, page, limit } });
  } catch (err) { next(err); }
});

// GET /api/v1/laboratorios/:id
router.get('/:id', async (req, res, next) => {
  try {
    const lab = await ds.getById(FILE, req.params.id);
    if (!lab) return res.status(404).json({ error: 'Laboratorio no encontrado' });
    res.json(lab);
  } catch (err) { next(err); }
});

// POST /api/v1/laboratorios
router.post('/', async (req, res, next) => {
  try {
    const { nombre, ubicacion, capacidad, activo } = req.body;
    const errors = [];
    if (!nombre || typeof nombre !== 'string') errors.push('nombre es obligatorio (string)');
    if (capacidad !== undefined && !(Number(capacidad) > 0)) errors.push('capacidad debe ser número > 0');

    // nombre único
    const all = await ds.getAll(FILE);
    if (all.some(l => l.nombre && l.nombre.toLowerCase() === (nombre || '').toLowerCase())) {
      return res.status(409).json({ error: 'Nombre de laboratorio ya existe' });
    }

    if (errors.length) return res.status(400).json({ error: 'Bad Request', details: errors });

    const lab = await ds.create(FILE, {
      nombre,
      ubicacion: ubicacion || '',
      capacidad: Number(capacidad) || 0,
      activo: activo === undefined ? true : Boolean(activo)
    });
    res.status(201).json(lab);
  } catch (err) { next(err); }
});

module.exports = router;
