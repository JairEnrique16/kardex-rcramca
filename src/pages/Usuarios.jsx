import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { user } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'vendedor',
  })

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true })
    setUsuarios(data || [])
    setLoading(false)
  }

  async function handleGuardar() {
    if (!form.email || !form.password || !form.nombre) {
      alert('Todos los campos son obligatorios')
      return
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
    })

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    const { error: perfilError } = await supabase.from('perfiles').insert({
      id: data.user.id,
      nombre: form.nombre,
      rol: form.rol,
      activo: true,
    })

    if (perfilError) {
      alert('Error al crear perfil: ' + perfilError.message)
      return
    }

    await registrarAuditoria(user?.id, 'Nuevo usuario creado: ' + form.nombre + ' (' + form.rol + ')', 'Usuarios')
    setShowForm(false)
    setForm({ email: '', password: '', nombre: '', rol: 'vendedor' })
    cargarUsuarios()
  }

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este usuario?')) return
    await supabase.from('perfiles').update({ activo: false }).eq('id', id)
    await registrarAuditoria(user?.id, 'Usuario desactivado', 'Usuarios')
    cargarUsuarios()
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Usuarios</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Usuario</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Nombre completo *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Contraseña *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="administrador">Administrador</option>
                <option value="encargado">Encargado de Tienda</option>
                <option value="vendedor">Vendedor</option>
                <option value="jefe_produccion">Jefe de Producción</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">No hay usuarios registrados.</td></tr>
            ) : (
              usuarios.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.nombre}</td>
                  <td className="px-4 py-3 capitalize">{u.rol}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.activo && (
                      <button
                        onClick={() => handleDesactivar(u.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Usuarios