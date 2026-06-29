import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Sidebar() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const menuAdmin = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/productos', label: 'Productos' },
    { path: '/usuarios', label: 'Usuarios' },
    { path: '/consulta-stock', label: 'Panel de Stock' },
    { path: '/historial', label: 'Historial' },
    { path: '/reportes', label: 'Reportes' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/auditoria', label: 'Auditoría' },
  ]

  const menuEncargado = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/ingresos', label: 'Registrar Ingreso' },
    { path: '/traslados', label: 'Traslados' },
    { path: '/mermas', label: 'Mermas' },
    { path: '/proveedores', label: 'Proveedores' },
    { path: '/incidencias', label: 'Incidencias' },
    { path: '/reclamos', label: 'Reclamos' },
  ]

  const menuVendedor = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/salidas', label: 'Registrar Salida' },
    { path: '/consulta-stock', label: 'Consultar Stock' },
    { path: '/precios', label: 'Consultar Precios' },
  ]

  const menuProduccion = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/insumos', label: 'Insumos' },
    { path: '/recetas', label: 'Recetas' },
    { path: '/ordenes-produccion', label: 'Órdenes de Producción' },
  ]

  function getMenu() {
    switch (perfil?.rol) {
      case 'administrador': return menuAdmin
      case 'encargado': return menuEncargado
      case 'vendedor': return menuVendedor
      case 'jefe_produccion': return menuProduccion
      default: return []
    }
  }

  return (
    <div className="w-56 min-h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-sm font-bold">Sistema Kardex</h1>
        <p className="text-xs text-gray-400">RC RAMCA Perú</p>
      </div>

      <div className="p-4 border-b border-gray-700">
        <p className="text-xs text-gray-400">Usuario</p>
        <p className="text-sm font-semibold">{perfil?.nombre}</p>
        <p className="text-xs text-blue-400 capitalize">{perfil?.rol}</p>
      </div>

      <nav className="flex-1 p-2">
        {getMenu().map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm mb-1 transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-sm bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Sidebar