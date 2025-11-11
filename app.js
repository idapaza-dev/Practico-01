const express = require('express');
const app = express();
const morgan = require('morgan'); // optional: for cleaner logging if available
const path = require('path');

// routers
const laboratoriosRouter = require('./routes/laboratorios.routes');
const equiposRouter = require('./routes/equipos.routes');
const reservasRouter = require('./routes/reservas.routes');
const incidenciasRouter = require('./routes/incidencias.routes');

// middlewares
app.use(express.json());

// simple logger middleware (method, path, response time)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// mount routers with versioning prefix
app.use('/api/v1/laboratorios', laboratoriosRouter);
app.use('/api/v1/equipos', equiposRouter);
app.use('/api/v1/reservas', reservasRouter);
app.use('/api/v1/incidencias', incidenciasRouter);

// nested routes (some routers handle nested URLs as well)
// Example root
app.get('/', (req, res) => {
  res.json({ message: 'SRLE API - /api/v1' });
});

// global error handler (basic)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:3000/api/v1/laboratorios`));

// https://localhost:3000/api/v1/laboratorios
