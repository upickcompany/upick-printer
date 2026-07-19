import { useState, useEffect } from 'react'

function App() {
  const [restaurantId, setRestaurantId] = useState('')
  const [connectionType, setConnectionType] = useState<'network' | 'usb'>('network')
  const [printerIp, setPrinterIp] = useState('192.168.40.18')
  const [printerPort, setPrinterPort] = useState('9100')
  const [printerVid, setPrinterVid] = useState('')
  const [printerPid, setPrinterPid] = useState('')
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    // Load config on mount
    window.ipcRenderer.invoke('get-config').then((config: any) => {
      if (config.restaurantId) setRestaurantId(config.restaurantId)
      if (config.connectionType) setConnectionType(config.connectionType)
      if (config.printerIp) setPrinterIp(config.printerIp)
      if (config.printerPort) setPrinterPort(String(config.printerPort))
      if (config.printerVid) setPrinterVid(config.printerVid)
      if (config.printerPid) setPrinterPid(config.printerPid)
    })

    // Listen for supabase status updates
    window.ipcRenderer.on('supabase-status', (_event: any, newStatus: any) => {
      setStatus(newStatus)
    })

    // Listen for backend logs
    window.ipcRenderer.on('main-console-log', (_event: any, ...args: any[]) => {
      console.log('%c[BACKEND]', 'color: #3b82f6; font-weight: bold;', ...args)
    })
    window.ipcRenderer.on('main-console-error', (_event: any, ...args: any[]) => {
      console.error('%c[BACKEND ERROR]', 'color: #ef4444; font-weight: bold;', ...args)
    })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await window.ipcRenderer.invoke('save-config', { 
      restaurantId, 
      connectionType,
      printerIp, 
      printerPort,
      printerVid,
      printerPid
    })
    setIsSaving(false)
    alert('Configuración guardada. Escuchando nuevas órdenes...')
  }

  const handleTestPrinter = async () => {
    setIsTesting(true)
    const success = await window.ipcRenderer.invoke('test-printer', { 
      connectionType,
      ip: printerIp, 
      port: printerPort,
      vid: printerVid,
      pid: printerPid
    })
    setIsTesting(false)
    if (success) {
      alert('¡Impresión exitosa!')
    } else {
      alert(`Error de conexión con la impresora. Verifica la configuración.`)
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

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipo de Conexión</label>
            <div className="flex bg-neutral-100 p-1 rounded-xl">
              <button 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${connectionType === 'network' ? 'bg-white shadow-sm text-red-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                onClick={() => setConnectionType('network')}
              >
                Red (IP)
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${connectionType === 'usb' ? 'bg-white shadow-sm text-red-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                onClick={() => setConnectionType('usb')}
              >
                Cable (USB)
              </button>
            </div>
          </div>

          {connectionType === 'network' ? (
            <div className="flex gap-3 animate-in fade-in zoom-in-95 duration-200">
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
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <p className="text-sm text-blue-800">
                La aplicación intentará autodetectar la primera impresora USB conectada. Opcionalmente, puedes especificar su VID y PID.
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1">Vendor ID (Opcional)</label>
                  <input 
                    type="text" 
                    value={printerVid}
                    onChange={e => setPrinterVid(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    placeholder="Ej: 0x04b8"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1">Product ID (Opcional)</label>
                  <input 
                    type="text" 
                    value={printerPid}
                    onChange={e => setPrinterPid(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    placeholder="Ej: 0x0e28"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button 
              onClick={handleTestPrinter}
              disabled={isTesting || (connectionType === 'network' && (!printerIp || !printerPort))}
              className="w-full bg-white border-2 border-red-100 hover:border-red-200 text-red-600 py-3 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 mb-3"
            >
              {isTesting ? 'Probando...' : 'Probar Impresión'}
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !restaurantId || (connectionType === 'network' && !printerIp)}
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
