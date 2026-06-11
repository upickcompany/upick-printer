import { useState, useEffect } from 'react'

function App() {
  const [restaurantId, setRestaurantId] = useState('')
  const [printerIp, setPrinterIp] = useState('192.168.40.18')
  const [printerPort, setPrinterPort] = useState('9100')
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    // Load config on mount
    window.ipcRenderer.invoke('get-config').then((config: any) => {
      if (config.restaurantId) setRestaurantId(config.restaurantId)
      if (config.printerIp) setPrinterIp(config.printerIp)
      if (config.printerPort) setPrinterPort(String(config.printerPort))
    })

    // Listen for supabase status updates
    window.ipcRenderer.on('supabase-status', (_event: any, newStatus: any) => {
      setStatus(newStatus)
    })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await window.ipcRenderer.invoke('save-config', { restaurantId, printerIp, printerPort })
    setIsSaving(false)
    alert('Configuración guardada. Escuchando nuevas órdenes...')
  }

  const handleTestPrinter = async () => {
    setIsTesting(true)
    const success = await window.ipcRenderer.invoke('test-printer', { ip: printerIp, port: printerPort })
    setIsTesting(false)
    if (success) {
      alert('¡Impresión exitosa!')
    } else {
      alert(`Error de conexión con la impresora. Verifica la IP y el puerto ${printerPort}.`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 text-neutral-900 p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-red-900/5 w-full max-w-md border border-neutral-100">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-black text-center mb-2 tracking-tight text-neutral-800">UPick <span className="text-red-600">Printer</span></h1>
        <p className="text-neutral-500 text-center mb-8 text-sm">Escucha órdenes en tiempo real y envíalas a tu impresora térmica local.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">ID del Restaurante</label>
            <input 
              type="text" 
              value={restaurantId}
              onChange={e => setRestaurantId(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:ring-2 focus:ring-red-600/50 focus:border-red-600 outline-none transition-all placeholder-neutral-400 font-medium"
              placeholder="Ej: cm4z..."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-neutral-700 mb-1">IP Local</label>
              <input 
                type="text" 
                value={printerIp}
                onChange={e => setPrinterIp(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:ring-2 focus:ring-red-600/50 focus:border-red-600 outline-none transition-all placeholder-neutral-400 font-medium"
                placeholder="192.168.x.x"
              />
            </div>
            
            <div className="w-24">
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Puerto</label>
              <input 
                type="text" 
                value={printerPort}
                onChange={e => setPrinterPort(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 focus:ring-2 focus:ring-red-600/50 focus:border-red-600 outline-none transition-all placeholder-neutral-400 font-medium text-center"
                placeholder="9100"
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleTestPrinter}
              disabled={isTesting || !printerIp || !printerPort}
              className="w-full bg-white border-2 border-red-100 hover:border-red-200 text-red-600 py-3 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 mb-3"
            >
              {isTesting ? 'Probando...' : 'Probar Impresión'}
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !restaurantId || !printerIp}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-red-600/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar y Conectar'}
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50 -mx-8 -mb-8 px-8 py-5 rounded-b-2xl">
          <span className="text-sm font-semibold text-neutral-600">Estado de Conexión</span>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
            {status === 'connected' && (
              <><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span><span className="text-sm font-bold text-emerald-600">En línea</span></>
            )}
            {status === 'disconnected' && (
              <><span className="h-2.5 w-2.5 rounded-full bg-neutral-400"></span><span className="text-sm font-bold text-neutral-600">En espera</span></>
            )}
            {status === 'error' && (
              <><span className="h-2.5 w-2.5 rounded-full bg-red-500"></span><span className="text-sm font-bold text-red-600">Error</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
