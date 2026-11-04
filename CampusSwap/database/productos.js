import * as SQLite from 'expo-sqlite';

// Productos iniciales con los que se siembra la tabla la primera vez
const PRODUCTOS_INICIALES = [
  { title: 'Calculadora científica', price: 45 },
  { title: 'Mochila para laptop', price: 60 },
  { title: 'Libro de Cálculo', price: 25 },
  { title: 'Audífonos inalámbricos', price: 80 },
];

// 1) Abre (o crea si no existe) el archivo de base de datos de la app
export async function abrirBD() {
  return SQLite.openDatabaseAsync('campusswap.db');
}

// 2) Crea la tabla una sola vez; no falla si ya existía
export async function crearTablaProductos(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);
}

// 3) Si la tabla está vacía, la siembra con los productos iniciales
export async function sembrarProductosSiVacia(db) {
  const fila = await db.getFirstAsync('SELECT COUNT(*) as total FROM productos');
  if (fila.total > 0) return;

  for (const producto of PRODUCTOS_INICIALES) {
    await db.runAsync(
      'INSERT INTO productos (title, price) VALUES (?, ?)',
      producto.title,
      producto.price
    );
  }
}

// 4) Lee todos los productos guardados en la base de datos
export async function obtenerProductos(db) {
  return db.getAllAsync('SELECT * FROM productos ORDER BY id');
}

// Atajo: abre la BD, crea la tabla, la siembra si hace falta y devuelve los productos
export async function iniciarYCargarProductos() {
  const db = await abrirBD();
  await crearTablaProductos(db);
  await sembrarProductosSiVacia(db);
  return obtenerProductos(db);
}

// 5) Inserta un producto nuevo y devuelve su id generado
export async function agregarProducto(db, title, price) {
  const resultado = await db.runAsync(
    'INSERT INTO productos (title, price) VALUES (?, ?)',
    title,
    price
  );
  return resultado.lastInsertRowId;
}

// 6) Actualiza un producto existente (editar)
export async function actualizarProducto(db, id, title, price) {
  await db.runAsync(
    'UPDATE productos SET title = ?, price = ? WHERE id = ?',
    title,
    price,
    id
  );
}

// 7) Elimina un producto por su id
export async function eliminarProducto(db, id) {
  await db.runAsync('DELETE FROM productos WHERE id = ?', id);
}
