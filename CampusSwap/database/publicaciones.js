import { db } from './firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

const COLECCION = 'publicaciones';

// 1) Escucha la colección EN TIEMPO REAL: cada vez que alguien (tú u otro
// estudiante, desde otro celular) crea, edita o borra una publicación,
// este callback se vuelve a ejecutar solo, sin que nadie recargue nada.
export function escucharPublicaciones(callback) {
  const q = query(collection(db, COLECCION), orderBy('creadoEn', 'desc'));

  const cancelarSuscripcion = onSnapshot(q, (snapshot) => {
    const publicaciones = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(publicaciones);
  });

  return cancelarSuscripcion; // llamar esta función detiene la escucha
}

// 2) Crea una publicación nueva (equivalente al INSERT de SQLite)
export async function agregarPublicacion({ titulo, autor, precio }) {
  await addDoc(collection(db, COLECCION), {
    titulo,
    autor,
    precio,
    creadoEn: serverTimestamp(),
  });
}

// 3) Edita una publicación existente (equivalente al UPDATE de SQLite)
export async function actualizarPublicacion(id, { titulo, precio }) {
  await updateDoc(doc(db, COLECCION, id), { titulo, precio });
}

// 4) Elimina una publicación (equivalente al DELETE de SQLite)
export async function eliminarPublicacion(id) {
  await deleteDoc(doc(db, COLECCION, id));
}
