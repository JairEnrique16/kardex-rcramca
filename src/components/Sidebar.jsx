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
    { path: '/ventas', label: 'Registrar Venta' },
    { path: '/consulta-stock', label: 'Consultar Stock' },
    { path: '/precios', label: 'Consultar Precios' },
  ]

  const menuProduccion = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/insumos', label: 'Insumos' },
    { path: '/recetas', label: 'Recetas' },
    { path: '/ordenes-produccion', label: 'Órdenes de Producción' },
  ]

  const rolInfo = {
    administrador: { menu: menuAdmin, label: 'Administrador', color: 'bg-brand-blue' },
    encargado: { menu: menuEncargado, label: 'Encargado de Tienda', color: 'bg-brand-green-dark' },
    vendedor: { menu: menuVendedor, label: 'Vendedor', color: 'bg-amber-500' },
    jefe_produccion: { menu: menuProduccion, label: 'Producción', color: 'bg-purple-500' },
  }

  const actual = rolInfo[perfil?.rol] || { menu: [], label: perfil?.rol || '-', color: 'bg-gray-500' }

  return (
    <div className="w-64 min-h-screen bg-brand-navy text-white flex flex-col">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-display font-bold text-white text-sm shrink-0">
          RC
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-sm leading-tight truncate">Sistema de Productos Naturales</h1>
          <p className="text-xs text-white/50 truncate">RC RAMCA Perú</p>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">Sesión activa</p>
        <p className="text-sm font-semibold truncate">{perfil?.nombre}</p>
        <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-white ${actual.color}`}>
          {actual.label}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {actual.menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex items-center px-3.5 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-brand-green" />
                )}
                <span className="pl-2">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full text-sm bg-white/5 hover:bg-danger/90 text-white/80 hover:text-white py-2.5 rounded-lg transition font-medium"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Sidebar