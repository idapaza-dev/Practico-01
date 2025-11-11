const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

async function readFile(name) {
  const p = path.join(dataDir, name);
  try {
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    // si no existe, devolver array vacío
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeFile(name, data) {
  const p = path.join(dataDir, name);
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

async function getAll(resourceFile) {
  return readFile(resourceFile);
}

async function getById(resourceFile, id) {
  const arr = await readFile(resourceFile);
  return arr.find(item => String(item.id) === String(id));
}

async function create(resourceFile, obj) {
  const arr = await readFile(resourceFile);
  // generar id incremental simple
  const maxId = arr.reduce((m, it) => (it.id > m ? it.id : m), 0);
  const newObj = { id: maxId + 1, ...obj };
  arr.push(newObj);
  await writeFile(resourceFile, arr);
  return newObj;
}

async function update(resourceFile, id, changes) {
  const arr = await readFile(resourceFile);
  const idx = arr.findIndex(item => String(item.id) === String(id));
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...changes };
  await writeFile(resourceFile, arr);
  return arr[idx];
}

async function remove(resourceFile, id) {
  const arr = await readFile(resourceFile);
  const idx = arr.findIndex(item => String(item.id) === String(id));
  if (idx === -1) return false;
  arr.splice(idx, 1);
  await writeFile(resourceFile, arr);
  return true;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
