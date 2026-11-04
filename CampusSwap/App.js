import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { abrirBD, actualizarProducto, agregarProducto, eliminarProducto, iniciarYCargarProductos, obtenerProductos } from './database/productos';
import { agregarPublicacion, eliminarPublicacion, escucharPublicaciones } from './database/publicaciones';

const Stack = createNativeStackNavigator();

// ---------- EVENTOS: botón de favorito con Pressable ----------
function BotonFavorito() {
  const [favorito, setFavorito] = useState(false);

  return (
    <Pressable
      onPress={() => setFavorito((prev) => !prev)}
      style={({ pressed }) => [
        styles.favBoton,
        pressed && styles.favBotonPresionado,
      ]}
    >
      <Text style={styles.favTexto}>{favorito ? '❤️ Favorito' : '🤍 Favorito'}</Text>
    </Pressable>
  );
}

// ---------- EVENTOS + NAVEGACIÓN: tarjeta de producto ----------
function TarjetaProducto({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.tarjeta} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tarjetaIcono}>
        <Text style={styles.tarjetaIconoTexto}>📦</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tarjetaTitulo}>{item.title}</Text>
      </View>
      <Text style={styles.tarjetaPrecio}>${item.price}</Text>
    </TouchableOpacity>
  );
}

// ---------- PANTALLA: LISTA (ahora cargada desde SQLite) ----------
function ListaScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se ejecuta al entrar a la pantalla, y de nuevo cada vez que se vuelve a ella
  // (por ejemplo, al regresar de Detalle después de editar o eliminar)
  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      iniciarYCargarProductos()
        .then((filas) => setProductos(filas))
        .catch((error) => console.log('Error cargando productos:', error))
        .finally(() => setCargando(false));
    }, [])
  );

  // Inserta el producto del formulario y recarga la lista desde SQLite
  async function guardarNuevoProducto() {
    if (!nuevoTitulo.trim() || !nuevoPrecio.trim()) return;

    setGuardando(true);
    try {
      const db = await abrirBD();
      await agregarProducto(db, nuevoTitulo.trim(), parseFloat(nuevoPrecio));
      const filas = await obtenerProductos(db);
      setProductos(filas);
      setNuevoTitulo('');
      setNuevoPrecio('');
    } catch (error) {
      console.log('Error guardando producto:', error);
    } finally {
      setGuardando(false);
    }
  }

  const productosFiltrados = productos.filter((p) =>
    p.title.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <View style={styles.cargandoContainer}>
        <ActivityIndicator size="large" color="#2D1B4E" />
        <Text style={styles.cargandoTexto}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={productosFiltrados}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.titulo}>CampusSwap</Text>
          <BotonFavorito />

          <TextInput
            style={styles.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto..."
            placeholderTextColor="#B7AEDB"
          />

          <View style={styles.formNuevo}>
            <TextInput
              style={[styles.inputNuevo, { flex: 1.3 }]}
              value={nuevoTitulo}
              onChangeText={setNuevoTitulo}
              placeholder="Nombre del producto"
              placeholderTextColor="#B7AEDB"
            />
            <TextInput
              style={[styles.inputNuevo, { flex: 0.7 }]}
              value={nuevoPrecio}
              onChangeText={setNuevoPrecio}
              placeholder="Precio"
              placeholderTextColor="#B7AEDB"
              keyboardType="numeric"
            />
            <Pressable
              style={[styles.botonAgregar, guardando && { opacity: 0.6 }]}
              onPress={guardarNuevoProducto}
              disabled={guardando}
            >
              <Text style={styles.botonAgregarTexto}>{guardando ? '...' : '+ Agregar'}</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.botonPublicaciones}
            onPress={() => navigation.navigate('Publicaciones')}
          >
            <Text style={styles.botonPublicacionesTexto}>🌐 Ver publicaciones de otros estudiantes</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <TarjetaProducto
          item={item}
          onPress={() => navigation.navigate('Detalle', { producto: item })}
        />
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

// ---------- PANTALLA: DETALLE (editar y eliminar) ----------
function DetalleScreen({ route, navigation }) {
  const [producto, setProducto] = useState(route.params.producto);
  const [editando, setEditando] = useState(false);
  const [editTitulo, setEditTitulo] = useState(producto.title);
  const [editPrecio, setEditPrecio] = useState(String(producto.price));
  const [procesando, setProcesando] = useState(false);

  async function guardarEdicion() {
    if (!editTitulo.trim() || !editPrecio.trim()) return;

    setProcesando(true);
    try {
      const db = await abrirBD();
      const nuevoPrecio = parseFloat(editPrecio);
      await actualizarProducto(db, producto.id, editTitulo.trim(), nuevoPrecio);
      setProducto({ ...producto, title: editTitulo.trim(), price: nuevoPrecio });
      setEditando(false);
    } catch (error) {
      console.log('Error editando producto:', error);
    } finally {
      setProcesando(false);
    }
  }

  async function eliminar() {
    setProcesando(true);
    try {
      const db = await abrirBD();
      await eliminarProducto(db, producto.id);
      navigation.goBack();
    } catch (error) {
      console.log('Error eliminando producto:', error);
      setProcesando(false);
    }
  }

  if (editando) {
    return (
      <View style={styles.detalleContainer}>
        <Text style={styles.editEtiqueta}>Nombre</Text>
        <TextInput
          style={styles.editInput}
          value={editTitulo}
          onChangeText={setEditTitulo}
          placeholder="Nombre del producto"
        />
        <Text style={styles.editEtiqueta}>Precio</Text>
        <TextInput
          style={styles.editInput}
          value={editPrecio}
          onChangeText={setEditPrecio}
          placeholder="Precio"
          keyboardType="numeric"
        />

        <Pressable
          style={[styles.volverBoton, procesando && { opacity: 0.6 }]}
          onPress={guardarEdicion}
          disabled={procesando}
        >
          <Text style={styles.volverTexto}>{procesando ? 'Guardando...' : 'Guardar cambios'}</Text>
        </Pressable>
        <Pressable style={styles.cancelarBoton} onPress={() => setEditando(false)}>
          <Text style={styles.cancelarTexto}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.detalleContainer}>
      <View style={styles.detalleIcono}>
        <Text style={{ fontSize: 40 }}>📦</Text>
      </View>
      <Text style={styles.detalleTitulo}>{producto.title}</Text>
      <Text style={styles.detallePrecio}>${producto.price}</Text>

      <View style={styles.accionesFila}>
        <Pressable style={styles.editarBoton} onPress={() => setEditando(true)}>
          <Text style={styles.editarTexto}>✏️ Editar</Text>
        </Pressable>
        <Pressable
          style={[styles.eliminarBoton, procesando && { opacity: 0.6 }]}
          onPress={eliminar}
          disabled={procesando}
        >
          <Text style={styles.eliminarTexto}>{procesando ? '...' : '🗑️ Eliminar'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.volverBoton} onPress={() => navigation.goBack()}>
        <Text style={styles.volverTexto}>← Volver a la lista</Text>
      </Pressable>
    </View>
  );
}

// ---------- PANTALLA: PUBLICACIONES (Firebase Firestore, en tiempo real) ----------
function PublicacionesScreen({ navigation }) {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se suscribe una vez al montar la pantalla; cada cambio en Firestore
  // (de cualquier estudiante, desde cualquier celular) actualiza la lista sola
  useEffect(() => {
    const cancelarSuscripcion = escucharPublicaciones((filas) => {
      setPublicaciones(filas);
      setCargando(false);
    });

    // al salir de la pantalla, dejamos de escuchar (evita fugas de memoria)
    return cancelarSuscripcion;
  }, []);

  async function publicar() {
    if (!titulo.trim() || !autor.trim() || !precio.trim()) return;

    setGuardando(true);
    try {
      await agregarPublicacion({
        titulo: titulo.trim(),
        autor: autor.trim(),
        precio: parseFloat(precio),
      });
      setTitulo('');
      setAutor('');
      setPrecio('');
    } catch (error) {
      console.log('Error publicando:', error);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    try {
      await eliminarPublicacion(id);
    } catch (error) {
      console.log('Error eliminando publicación:', error);
    }
  }

  return (
    <FlatList
      style={styles.container}
      data={publicaciones}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.titulo}>Publicaciones</Text>
          <Text style={styles.publicacionesSubtitulo}>
            Compartidas entre todos los estudiantes, en tiempo real (Firestore)
          </Text>

          <View style={styles.formNuevo}>
            <TextInput
              style={[styles.inputNuevo, { flex: 1 }]}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="¿Qué ofreces?"
              placeholderTextColor="#B7AEDB"
            />
            <TextInput
              style={[styles.inputNuevo, { flex: 0.7 }]}
              value={autor}
              onChangeText={setAutor}
              placeholder="Tu nombre"
              placeholderTextColor="#B7AEDB"
            />
            <TextInput
              style={[styles.inputNuevo, { flex: 0.6 }]}
              value={precio}
              onChangeText={setPrecio}
              placeholder="Precio"
              placeholderTextColor="#B7AEDB"
              keyboardType="numeric"
            />
          </View>
          <Pressable
            style={[styles.botonAgregar, { width: '100%', paddingVertical: 10 }, guardando && { opacity: 0.6 }]}
            onPress={publicar}
            disabled={guardando}
          >
            <Text style={styles.botonAgregarTexto}>{guardando ? 'Publicando...' : '+ Publicar'}</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        cargando ? (
          <View style={styles.cargandoContainer}>
            <ActivityIndicator size="large" color="#2D1B4E" />
            <Text style={styles.cargandoTexto}>Cargando publicaciones...</Text>
          </View>
        ) : (
          <Text style={styles.sinPublicaciones}>Todavía no hay publicaciones. ¡Sé la primera!</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.tarjetaPublicacion}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tarjetaTitulo}>{item.titulo}</Text>
            <Text style={styles.publicacionAutor}>por {item.autor}</Text>
          </View>
          <Text style={styles.tarjetaPrecio}>${item.precio}</Text>
          <Pressable onPress={() => eliminar(item.id)} style={styles.eliminarMini}>
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

// ---------- NAVEGACIÓN: Stack Navigator ----------
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Lista" component={ListaScreen} options={{ title: 'CampusSwap' }} />
        <Stack.Screen name="Detalle" component={DetalleScreen} options={{ title: 'Detalle del producto' }} />
        <Stack.Screen name="Publicaciones" component={PublicacionesScreen} options={{ title: 'Publicaciones' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  cargandoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cargandoTexto: { marginTop: 12, color: '#6B637F', fontSize: 14 },
  header: {
    backgroundColor: '#2D1B4E',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  favBoton: {
    backgroundColor: '#241A3A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  favBotonPresionado: { opacity: 0.6 },
  favTexto: { color: '#FFFFFF', fontWeight: '600' },
  buscador: {
    width: '100%',
    backgroundColor: '#3E2E63',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F5F2FA',
    borderRadius: 14,
  },
  tarjetaIcono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tarjetaIconoTexto: { fontSize: 20 },
  tarjetaTitulo: { fontSize: 14, fontWeight: '600', color: '#241A3A' },
  tarjetaPrecio: { fontSize: 15, fontWeight: 'bold', color: '#2D1B4E' },
  detalleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  detalleIcono: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  detalleTitulo: { fontSize: 22, fontWeight: 'bold', color: '#241A3A', marginBottom: 8 },
  detallePrecio: { fontSize: 20, color: '#2D1B4E', marginBottom: 30 },
  volverBoton: {
    backgroundColor: '#2D1B4E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  volverTexto: { color: '#FFFFFF', fontWeight: '600' },
  formNuevo: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  inputNuevo: {
    backgroundColor: '#3E2E63',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  botonAgregar: {
    backgroundColor: '#00D9C0',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAgregarTexto: { color: '#241A3A', fontWeight: 'bold', fontSize: 12 },
  accionesFila: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  editarBoton: {
    backgroundColor: '#F5F2FA',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  editarTexto: { color: '#241A3A', fontWeight: '600' },
  eliminarBoton: {
    backgroundColor: '#FFE4E9',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  eliminarTexto: { color: '#C81E3A', fontWeight: '600' },
  cancelarBoton: { marginTop: 12 },
  cancelarTexto: { color: '#6B637F', fontWeight: '600' },
  editEtiqueta: { alignSelf: 'flex-start', marginLeft: 8, color: '#6B637F', fontSize: 13, marginBottom: 4, marginTop: 12 },
  editInput: {
    width: '100%',
    backgroundColor: '#F5F2FA',
    color: '#241A3A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  botonPublicaciones: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#241A3A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonPublicacionesTexto: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  publicacionesSubtitulo: { color: '#D8D2EA', fontSize: 12, marginBottom: 4, textAlign: 'center' },
  sinPublicaciones: { textAlign: 'center', color: '#6B637F', marginTop: 40, fontSize: 14 },
  tarjetaPublicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F5F2FA',
    borderRadius: 14,
    gap: 10,
  },
  publicacionAutor: { fontSize: 12, color: '#6B637F', marginTop: 2 },
  eliminarMini: { padding: 6 },
});
