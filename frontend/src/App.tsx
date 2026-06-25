import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  db: string
}

export default function App() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
      const res = await fetch(`${baseUrl}/health`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md">
        {/* Glassmorphic card */}
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:border-slate-700/80">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <span className="text-xl font-bold text-white tracking-wider">S</span>
            </div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
              Sandhi
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Foundation Phase
            </p>
          </div>

          {/* Status Display Area */}
          <div className="space-y-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3" id="status-loading">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">Verifying connections...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3" id="status-error">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-400">Connection Failed</h3>
                  <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && data && (
              <div className="space-y-3" id="status-success">
                {/* Backend Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800/60 hover:bg-slate-800/60 transition-colors">
                  <span className="text-sm text-slate-400">Backend API</span>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${data.status === 'ok' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'}`} />
                    <span className="text-sm font-semibold capitalize" id="backend-status-value">
                      {data.status}
                    </span>
                  </div>
                </div>

                {/* Database Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800/60 hover:bg-slate-800/60 transition-colors">
                  <span className="text-sm text-slate-400">Database Connection</span>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${data.db === 'connected' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'}`} />
                    <span className="text-sm font-semibold capitalize" id="db-status-value">
                      {data.db}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="mt-8">
            <button
              id="refresh-button"
              onClick={fetchHealth}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2"
            >
              <span>Refresh Health Status</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
