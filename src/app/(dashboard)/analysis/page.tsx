'use client'

import { useState } from 'react'
import MarkdownRenderer from '@/app/components/MarkdownRenderer'

export default function AnalysisPage() {
  const [hasStarted, setHasStarted] = useState(false)
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleAnalyze = async () => {
    setHasStarted(true)
    setIsLoading(true)
    setCompletion('')
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Stream non disponible')
      }

      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        text += decoder.decode(value, { stream: true })
        setCompletion(text)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur inconnue'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analyse IA</h1>
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyse en cours...
            </>
          ) : (
            <>
              <span>🤖</span>
              {hasStarted ? 'Relancer l\'analyse' : 'Lancer l\'analyse'}
            </>
          )}
        </button>
      </div>

      {/* Analysis Result */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4">
              <p className="font-medium">Erreur lors de l'analyse</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {!hasStarted && !isLoading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Analysez vos finances</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                L'IA analysera vos wallets, transactions des 30 derniers jours et détectera les comportements à risque.
              </p>
            </div>
          )}

          {isLoading && !completion && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 mt-4">Analyse en cours...</p>
              </div>
            </div>
          )}

          {completion && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <span className="font-medium text-gray-900">Assistant Financier</span>
                {isLoading && (
                  <span className="text-xs text-blue-600 animate-pulse ml-2">En train d'écrire...</span>
                )}
              </div>
              
              <MarkdownRenderer content={completion} />
              {isLoading && (
                <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse rounded-sm"></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
