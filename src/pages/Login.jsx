import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await login(email, password)
    if (err) {
      setError('Usuario o contraseña incorrectos')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #021a0a 0%, #042f12 25%, #064e1f 50%, #055c24 75%, #043d18 100%)'
    }}>

      {/* Estrellas */}
      {[...Array(35)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 4 === 0 ? '3px' : '2px',
          height: i % 4 === 0 ? '3px' : '2px',
          borderRadius: '50%',
          background: 'white',
          opacity: Math.random() * 0.6 + 0.2,
          top: `${Math.random() * 45}%`,
          left: `${Math.random() * 100}%`,
        }}></div>
      ))}

      {/* Luna */}
      <div style={{
        position: 'absolute',
        top: '6%',
        right: '12%',
        width: '55px',
        height: '55px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #fffde7, #f9e79f)',
        boxShadow: '0 0 30px rgba(249,231,159,0.4), 0 0 60px rgba(249,231,159,0.15)',
        opacity: 0.9
      }}></div>

      {/* Niebla/neblina en el suelo */}
      <div style={{
        position: 'absolute',
        bottom: '18%',
        left: 0,
        width: '100%',
        height: '120px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(100,200,120,0.06) 50%, rgba(150,230,150,0.1) 100%)',
        filter: 'blur(8px)'
      }}></div>

      {/* Montañas traseras */}
      <svg style={{ position: 'absolute', bottom: 0, width: '100%', height: '50%' }} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="#021a0a" fillOpacity="0.9" d="M0,320 L0,180 L100,120 L200,160 L320,80 L440,140 L560,60 L680,120 L800,50 L920,110 L1040,70 L1160,130 L1280,90 L1440,150 L1440,320 Z"/>
        <path fill="#032510" fillOpacity="0.85" d="M0,320 L0,220 L80,190 L180,210 L280,160 L400,195 L520,145 L640,185 L760,130 L880,175 L1000,145 L1120,180 L1240,155 L1360,185 L1440,165 L1440,320 Z"/>
        <path fill="#042a12" fillOpacity="0.8" d="M0,320 L0,260 L100,240 L200,255 L320,230 L440,250 L560,225 L680,245 L800,215 L920,240 L1040,220 L1160,245 L1280,225 L1440,240 L1440,320 Z"/>
      </svg>

      {/* Pinos grandes traseros */}
      <svg style={{ position: 'absolute', bottom: 0, width: '100%', height: '40%' }} viewBox="0 0 1440 250" preserveAspectRatio="none">
        {[20,100,200,320,420,540,660,780,900,1020,1140,1260,1380].map((x, i) => {
          const h = 140 + (i % 3) * 30
          const w = 45 + (i % 2) * 15
          return (
            <g key={i}>
              <polygon points={`${x},250 ${x + w/2},${250-h} ${x + w},250`} fill="#021508" opacity="0.95"/>
              <polygon points={`${x + 5},250 ${x + w/2},${250-h+20} ${x + w - 5},250`} fill="#031c0c" opacity="0.6"/>
            </g>
          )
        })}
      </svg>

      {/* Pinos delanteros más grandes */}
      <svg style={{ position: 'absolute', bottom: 0, width: '100%', height: '35%' }} viewBox="0 0 1440 220" preserveAspectRatio="none">
        {[0,70,160,280,400,520,640,760,880,1000,1120,1240,1360].map((x, i) => {
          const h = 160 + (i % 4) * 20
          const w = 55 + (i % 3) * 10
          return (
            <g key={i}>
              <polygon points={`${x},220 ${x + w/2},${220-h} ${x + w},220`} fill="#010d04" opacity="1"/>
            </g>
          )
        })}
      </svg>

      {/* Plantas/helechos en primer plano */}
      <svg style={{ position: 'absolute', bottom: 0, width: '100%', height: '15%' }} viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path fill="#010a03" d="M0,100 Q50,60 80,100 Q120,50 160,100 Q200,55 240,100 Q280,60 320,100 Q360,50 400,100 Q440,55 480,100 Q520,60 560,100 Q600,50 640,100 Q680,55 720,100 Q760,60 800,100 Q840,50 880,100 Q920,55 960,100 Q1000,60 1040,100 Q1080,50 1120,100 Q1160,55 1200,100 Q1240,60 1280,100 Q1320,50 1360,100 Q1400,55 1440,100 L1440,100 L0,100 Z"/>
      </svg>

      {/* Luciérnagas */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: '#a8ff78',
          boxShadow: '0 0 6px #a8ff78, 0 0 12px rgba(168,255,120,0.5)',
          opacity: 0.7,
          bottom: `${15 + Math.random() * 25}%`,
          left: `${Math.random() * 100}%`,
        }}></div>
      ))}

      {/* Tarjeta glassmorphism */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        margin: '0 20px',
        padding: '44px 40px',
        borderRadius: '20px',
        background: 'rgba(0, 30, 10, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(100, 200, 100, 0.2)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(100,200,100,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 0 20px rgba(100,200,100,0.2)'
          }}>
            {/* Aquí va el logo — reemplaza el span por <img src="/logo.png" style={{width:'50px',height:'50px',borderRadius:'50%'}} /> */}
            <span style={{ color: 'white', fontSize: '22px', fontWeight: '900' }}>RC</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>RC RAMCA Perú</h1>
          <p style={{ color: 'rgba(150,230,150,0.7)', fontSize: '12px', margin: 0 }}>🌿 Sistema Kardex — Productos Naturales</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                required
                style={{
                  width: '100%', padding: '14px 48px 14px 20px',
                  borderRadius: '50px', border: '1px solid rgba(100,200,100,0.25)',
                  background: 'rgba(0,50,20,0.4)', color: 'white',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(100,220,100,0.6)'; e.target.style.background = 'rgba(0,60,20,0.5)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(100,200,100,0.25)'; e.target.style.background = 'rgba(0,50,20,0.4)' }}
              />
              <span style={{ position: 'absolute', right: '18px', top: '14px', fontSize: '16px' }}>👤</span>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                style={{
                  width: '100%', padding: '14px 48px 14px 20px',
                  borderRadius: '50px', border: '1px solid rgba(100,200,100,0.25)',
                  background: 'rgba(0,50,20,0.4)', color: 'white',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(100,220,100,0.6)'; e.target.style.background = 'rgba(0,60,20,0.5)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(100,200,100,0.25)'; e.target.style.background = 'rgba(0,50,20,0.4)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '18px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                {showPassword ? '🙈' : '🔒'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '10px 16px', marginBottom: '16px'
            }}>
              <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '50px', border: 'none',
              background: loading ? 'rgba(255, 255, 255, 0.23)' : 'linear-gradient(135deg, #97e580, #a0e68e)',
              color: loading ? 'rgba(255,255,255,0.5)' : '#052e16',
              fontSize: '14px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '⏳ Iniciando...' : '🌿 Iniciar Sesión'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(150,230,150,0.4)', fontSize: '11px', margin: '20px 0 0' }}>
          🔒 Acceso seguro — © 2026 RC RAMCA Perú
        </p>
      </div>
    </div>
  )
}

export default Login