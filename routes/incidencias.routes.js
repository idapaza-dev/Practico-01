const express = require('express');
const router = express.Router();
const ds = require('../utils/datastore');

const FILE = 'incidencias.json';
const EQUIPO_FILE = 'equipos.json';

// GET /api/v1/incidencias ?estado=&prioridad=&tipo=
router.get('/', async (req, res, next) => {
  try {
    let items = await ds.getAll(FILE);
    if (req.query.estado) items = items.filter(i => i.estado === req.query.estado);
    if (req.query.prioridad) items = items.filter(i => i.prioridad === req.query.prioridad);
    if (req.query.tipo) items = items.filter(i => i.tipo === req.query.tipo);
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const inc = await ds.getById(FILE, req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada' });
    res.json(inc);
  } catch (err) { next(err); }
});

// POST /api/v1/incidencias
router.post('/', async (req, res, next) => {
  try {
    const { equipoId, tipo, prioridad, descripcion, fecha } = req.body;
    const errors = [];
    if (!equipoId) errors.push('equipoId obligatorio');
    if (!tipo || !['falla','insumo','otro'].includes(tipo)) errors.push('tipo inválido (falla|insumo|otro)');
    if (descripcion === undefined || (typeof descripcion === 'string' && descripcion.trim().length < 10)) errors.push('descripcion obligatorio, mínimo 10 caracteres');

    // verificar equipo existe
    const eq = await ds.getById(EQUIPO_FILE, equipoId);
    if (!eq) errors.push('equipoId no existe');

    if (errors.length) return res.status(400).json({ error: 'Bad Request', details: errors });

    const inc = await ds.create(FILE, {
      equipoId: Number(equipoId),
      tipo,
      prioridad: ['baja','media','alta'].includes(prioridad) ? prioridad : 'baja',
      descripcion,
      fecha: fecha || new Date().toISOString(),
      estado: 'abierta'
    });
    res.status(201).json(inc);
  } catch (err) { next(err); }
});

// GET /api/v1/equipos/:equipoId/incidencias
router.get('/equipo/:equipoId', async (req, res, next) => {
  try {
    const equipoId = req.params.equipoId;
    const all = await ds.getAll(FILE);
    const items = all.filter(i => String(i.equipoId) === String(equipoId));
    res.json({ data: items });
  } catch (err) { next(err); }
});

// POST /api/v1/incidencias/:id/procesar
router.post('/:id/procesar', async (req, res, next) => {
  try {
    const inc = await ds.getById(FILE, req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada' });
    if (inc.estado !== 'abierta') return res.status(409).json({ error: 'Solo incidencias abiertas pueden pasar a en_proceso' });
    const updated = await ds.update(FILE, req.params.id, { estado: 'en_proceso' });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/v1/incidencias/:id/resolver
router.post('/:id/resolver', async (req, res, next) => {
  try {
    const inc = await ds.getById(FILE, req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada' });
    if (inc.estado !== 'en_proceso') return res.status(409).json({ error: 'Solo incidencias en_proceso pueden resolverse' });
    const updated = await ds.update(FILE, req.params.id, { estado: 'resuelta' });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
