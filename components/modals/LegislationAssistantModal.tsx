'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  aiModelProvider,
  AIModelStatus,
  RECOMMENDED_LOCAL_MODEL,
  AIDebugTrace,
} from '@/utils/aiModelProvider'
import {
  retrieveLegislationContext,
  generateQuestionAwareResponse,
  RetrievedSource,
  ConversationTurn,
} from '@/utils/legislationRetriever'
import { useToast } from '@/components/ToastProvider'
import { useProductivity } from '@/contexts/ProductivityContext'

interface LegislationAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  sources?: RetrievedSource[]
  timestamp: string
  debugTrace?: AIDebugTrace | null
}

export default function LegislationAssistantModal({
  isOpen,
  onClose,
  initialQuery,
}: LegislationAssistantModalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { createNote, setIsRightPanelOpen, setUtilityTab, recordRecentItem } = useProductivity()

  const [inputQuery, setInputQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiStatus, setAiStatus] = useState<AIModelStatus>('NOT_INSTALLED')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDebugTrace, setShowDebugTrace] = useState(false)
  const [currentDebugTrace, setCurrentDebugTrace] = useState<AIDebugTrace | null>(null)
  const [webGPUInfo, setWebGPUInfo] = useState<{ supported: boolean; message: string } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to AI Model Provider state
  useEffect(() => {
    const unsubscribe = aiModelProvider.subscribe((status, progress, text) => {
      setAiStatus(status)
      if (progress !== undefined) setDownloadProgress(progress)
      if (text !== undefined) setStatusText(text)
    })

    aiModelProvider.checkDeviceWebGPUSupport().then(setWebGPUInfo)

    return () => unsubscribe()
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  // Focus input and handle initial query on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
      if (initialQuery && initialQuery.trim()) {
        setInputQuery(initialQuery)
      }
    }
  }, [isOpen, initialQuery])

  if (!isOpen) return null

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = inputQuery.trim()
    if (!query || isProcessing) return

    const userMsgId = `msg-${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    }

    // Build recent conversation turns for context-awareness
    const conversationTurns: ConversationTurn[] = messages.slice(-6).map((m) => ({
      sender: m.sender,
      text: m.text,
    }))

    setMessages((prev) => [...prev, userMsg])
    setInputQuery('')
    setIsProcessing(true)

    recordRecentItem({
      type: 'legislation',
      targetId: query,
      title: `Assistant: ${query.slice(0, 30)}`,
      subtitle: 'Legislation AI Query',
    })

    try {
      // 1. Retrieve authoritative legislation context with question awareness & history
      const retrieval = await retrieveLegislationContext(query, 4, conversationTurns)

      // 2. Generate answer
      if (aiStatus === 'READY') {
        let streamText = ''
        const assistantMsgId = `msg-ai-${Date.now()}`

        // Placeholder assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: 'Analyzing legislation...',
            sources: retrieval.sources,
            timestamp: new Date().toISOString(),
          },
        ])

        await aiModelProvider.generateExplanation(
          query,
          retrieval,
          conversationTurns,
          (token) => {
            streamText += token
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, text: streamText } : m))
            )
          },
          (final) => {
            const trace = aiModelProvider.getLastDebugTrace()
            setCurrentDebugTrace(trace)
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, debugTrace: trace } : m))
            )
            setIsProcessing(false)
          }
        )
      } else {
        // Fast Instant Retrieval-Only Mode (Deterministic & Question-Aware)
        await new Promise((res) => setTimeout(res, 150))
        const explanation = generateQuestionAwareResponse(query, retrieval, conversationTurns)
        const finalPrompt = aiModelProvider.buildPrompt(query, retrieval)

        const debugTrace: AIDebugTrace = {
          userQuery: query,
          normalizedQuery: retrieval.normalizedQuery,
          detectedConcepts: {
            actions: retrieval.concepts.actions,
            negatedActions: retrieval.concepts.negatedActions,
            objects: retrieval.concepts.objects,
            locations: retrieval.concepts.locations,
            actor: retrieval.concepts.actor,
            primaryTopic: retrieval.concepts.primaryTopic,
          },
          detectedSection: retrieval.detectedSection,
          retrievedSources: retrieval.sources.map((s) => ({
            code: s.code,
            title: s.title,
            score: s.relevanceScore,
            fine: s.fine,
            sentence: s.sentence,
            applicabilityStatus: s.applicabilityStatus,
            missingFacts: s.missingFacts,
          })),
          rejectedSources: retrieval.rejectedSources.map((r) => ({
            code: r.code,
            title: r.title,
            topic: r.topic,
            reason: r.reason,
          })),
          finalPrompt,
          generatedResponse: explanation,
          timestamp: new Date().toISOString(),
        }

        setCurrentDebugTrace(debugTrace)

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-instant-${Date.now()}`,
            sender: 'assistant',
            text: explanation,
            sources: retrieval.sources,
            timestamp: new Date().toISOString(),
            debugTrace,
          },
        ])
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Assistant error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'I encountered an issue retrieving the legislation. Please check your query or section number.',
          timestamp: new Date().toISOString(),
        },
      ])
      setIsProcessing(false)
    }
  }

  const handleDownloadAndEnable = async () => {
    setShowConsentDialog(false)
    const success = await aiModelProvider.requestConsentAndDownload()
    if (success) {
      showToast('Legislation AI model downloaded and enabled!', 'success')
    } else {
      showToast('Failed to download local AI model', 'error')
    }
  }

  const handleSaveToNotes = (text: string) => {
    createNote({
      title: `Legal Advice: ${inputQuery || 'Legislation Query'}`,
      content: text,
      category: 'Procedure',
    })
    setIsRightPanelOpen(true)
    setUtilityTab('notes')
    showToast('Explanation saved to Officer Notes', 'success')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-brightness-75 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[88vh] bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-on-surface leading-tight">
                  Legislation Assistant
                </h3>
                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                    aiStatus === 'READY'
                      ? 'bg-secondary/15 text-secondary border-secondary/30'
                      : aiStatus === 'DOWNLOADING'
                      ? 'bg-primary/15 text-primary border-primary/30 animate-pulse'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {aiStatus === 'READY'
                    ? '● Local AI Active'
                    : aiStatus === 'DOWNLOADING'
                    ? '⏳ Downloading'
                    : '○ Retrieval Engine'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Active Source: Traffic Code 2nd Rendition (28.07.2025) & Penal Codes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDebugTrace(!showDebugTrace)}
              className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                showDebugTrace
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:text-on-surface'
              }`}
              title="Toggle Developer Debug / Retrieval Trace"
            >
              🐞 Debug
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded text-xs font-mono"
              title="Assistant Settings & Model Management"
            >
              ⚙️
            </button>
            <button
              onClick={() => {
                setMessages([])
                setCurrentDebugTrace(null)
                showToast('Cleared conversation history', 'info')
              }}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded text-xs font-mono"
              title="Clear Conversation"
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded text-sm ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Developer Debug Trace Drawer */}
        {showDebugTrace && currentDebugTrace && (
          <div className="p-3 bg-black/95 border-b border-amber-500/40 text-xs font-mono space-y-2 animate-fadeIn flex-shrink-0 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between text-amber-400 font-bold border-b border-amber-500/20 pb-1">
              <span>🐞 Developer Debug Trace</span>
              <span className="text-[10px] text-amber-300/80">
                Topic: {currentDebugTrace.detectedConcepts?.primaryTopic || 'GENERAL'}
              </span>
            </div>

            {/* Concepts and Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-surface-container-lowest/60 p-2 rounded border border-outline-variant/40">
              <div>
                <strong className="text-on-surface">Normalized Query:</strong>
                <div className="text-on-surface-variant truncate">{currentDebugTrace.normalizedQuery || currentDebugTrace.userQuery}</div>
                <div className="text-[10px] text-primary mt-1">
                  Actions: {currentDebugTrace.detectedConcepts?.actions?.join(', ') || 'None'} | Objects: {currentDebugTrace.detectedConcepts?.objects?.join(', ') || 'None'}
                </div>
                {currentDebugTrace.detectedConcepts?.negatedActions?.length > 0 && (
                  <div className="text-[10px] text-rose-400 font-bold">
                    ⛔ Excluded / Negated: {currentDebugTrace.detectedConcepts.negatedActions.join(', ')}
                  </div>
                )}
              </div>

              <div>
                <strong className="text-on-surface">Retrieved Provisions ({currentDebugTrace.retrievedSources.length}):</strong>
                <ul className="text-[10px] text-on-surface-variant space-y-0.5 mt-0.5">
                  {currentDebugTrace.retrievedSources.length === 0 && <li className="text-amber-400/80">No provisions passed confidence threshold</li>}
                  {currentDebugTrace.retrievedSources.map((s, idx) => (
                    <li key={idx} className="truncate text-secondary">
                      #{idx + 1} § {s.code} (Score: {s.score}) — {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rejected / Suppressed provisions */}
            {currentDebugTrace.rejectedSources?.length > 0 && (
              <div className="text-[10px] text-on-surface-variant/80 border-t border-outline-variant/30 pt-1">
                <span className="text-rose-400 font-semibold">Excluded Candidates ({currentDebugTrace.rejectedSources.length}):</span>
                <ul className="space-y-0.5 mt-0.5">
                  {currentDebugTrace.rejectedSources.slice(0, 3).map((r, idx) => (
                    <li key={idx} className="truncate">
                      • § {r.code} ({r.topic}): {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Settings Drawer / Panel */}
        {showSettings && (
          <div className="p-3 bg-surface-container border-b border-outline-variant text-xs font-mono space-y-2 animate-fadeIn flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-on-surface">Local AI Management</span>
              <span className="text-[10px] text-on-surface-variant">100% On-Device</span>
            </div>

            <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant text-[11px] space-y-1">
              <div>
                <strong>Device Status:</strong>{' '}
                <span className={webGPUInfo?.supported ? 'text-secondary' : 'text-amber-400'}>
                  {webGPUInfo?.message || 'Checking...'}
                </span>
              </div>
              <div>
                <strong>Recommended Model:</strong> {RECOMMENDED_LOCAL_MODEL.name} ({RECOMMENDED_LOCAL_MODEL.sizeEstimate})
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {aiStatus !== 'READY' && (
                <button
                  onClick={() => setShowConsentDialog(true)}
                  className="px-2.5 py-1 bg-primary text-on-primary rounded text-[11px] font-semibold hover:bg-primary-container"
                >
                  Enable Local LLM
                </button>
              )}
              {aiStatus === 'READY' && (
                <>
                  <button
                    onClick={() => {
                      aiModelProvider.unloadModel()
                      showToast('Model unloaded from RAM', 'info')
                    }}
                    className="px-2.5 py-1 bg-surface-container-high border border-outline-variant text-on-surface rounded text-[11px]"
                  >
                    Unload (Reclaim RAM)
                  </button>
                  <button
                    onClick={() => {
                      aiModelProvider.deleteModel()
                      showToast('Local AI model deleted', 'info')
                    }}
                    className="px-2.5 py-1 bg-error/20 border border-error/30 text-error rounded text-[11px]"
                  >
                    Delete Model
                  </button>
                </>
              )}
              <button
                onClick={() => setShowSettings(false)}
                className="px-2.5 py-1 text-on-surface-variant hover:text-on-surface text-[11px] ml-auto"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* Download Progress Banner */}
        {aiStatus === 'DOWNLOADING' && (
          <div className="p-3 bg-surface-container-high border-b border-primary/40 space-y-1.5 flex-shrink-0">
            <div className="flex justify-between text-xs font-mono text-primary">
              <span>{statusText}</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden border border-outline-variant">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {messages.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl">
                ⚖️
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="font-semibold text-base text-on-surface">
                  Question-Aware Legislation Assistant
                </h4>
                <p className="text-xs text-on-surface-variant font-mono leading-relaxed">
                  Answers your specific legal and procedural questions based directly on the active Traffic Code (2nd Rendition) and Penal Codes.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl pt-2">
                {[
                  'What is the DUI provision?',
                  'What happens when someone refuses to identify themselves?',
                  'Explain § 3.5.',
                  'Can I arrest someone for this?',
                  'What is the penalty for reckless driving?',
                  'How do I handle a suspect requesting a lawyer?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInputQuery(prompt)
                    }}
                    className="px-3 py-1.5 text-xs font-mono bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded text-on-surface text-left transition-colors"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-lg p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-on-primary font-mono'
                      : 'bg-surface-container border border-outline-variant text-on-surface'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Sources Used Citation Box */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-outline-variant/60 space-y-1.5">
                      <div className="text-[10px] font-mono font-bold uppercase text-on-surface-variant flex items-center gap-1">
                        <span>📚</span> Cited Provisions:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s) => (
                          <button
                            key={s.code}
                            onClick={() => {
                              router.push(`/patrolman-guide?code=${encodeURIComponent(s.code)}`)
                              onClose()
                            }}
                            className="px-2 py-0.5 bg-surface-container-highest hover:bg-primary/20 border border-outline-variant hover:border-primary/40 rounded text-[11px] font-mono text-primary flex items-center gap-1 transition-colors"
                            title={`Open § ${s.code} in Legislation Guide`}
                          >
                            <span>§</span> {s.code} ({s.title.slice(0, 24)}...)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      onClick={() => handleSaveToNotes(msg.text)}
                      className="text-[10px] font-mono text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>📝</span> Save to Notes
                    </button>
                    {msg.debugTrace && (
                      <button
                        onClick={() => {
                          setCurrentDebugTrace(msg.debugTrace || null)
                          setShowDebugTrace(true)
                        }}
                        className="text-[10px] font-mono text-amber-400/80 hover:text-amber-400 transition-colors flex items-center gap-1"
                      >
                        <span>🐞</span> View Trace
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant py-2">
              <span className="animate-spin">⚙️</span>
              <span>Retrieving authoritative legislation and analyzing query...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-outline-variant bg-surface-container-lowest flex items-center gap-2 flex-shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about DUI, refusal to identify, arrest authority, penalties, or procedures..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded text-on-surface placeholder:text-on-surface-variant font-mono text-xs sm:text-sm focus:outline-none focus:border-primary"
          />

          {isProcessing ? (
            <button
              type="button"
              onClick={() => aiModelProvider.stopGeneration()}
              className="px-3.5 py-2 bg-error/20 hover:bg-error/30 text-error border border-error/40 font-mono text-xs font-semibold rounded flex items-center gap-1"
            >
              <span>⏹</span> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold rounded transition-colors disabled:opacity-40"
            >
              Ask
            </button>
          )}
        </form>
      </div>

      {/* Explicit Consent Dialog for Local AI Model Download */}
      {showConsentDialog && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 animate-fadeIn"
          onClick={() => setShowConsentDialog(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-low border border-primary/40 rounded-lg shadow-2xl p-5 text-on-surface space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
              <span className="text-xl">⚖️</span>
              <h3 className="font-bold text-base text-on-surface">
                Enable Local Legislation AI?
              </h3>
            </div>

            <div className="text-xs text-on-surface space-y-2 leading-relaxed font-sans">
              <p>
                LEO-GRP can run a lightweight, privacy-preserving AI model directly in your browser to explain legislation in natural conversational language.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-on-surface-variant font-mono text-[11px]">
                <li>100% On-Device: Your questions never leave your computer.</li>
                <li>Model: {RECOMMENDED_LOCAL_MODEL.name}</li>
                <li>Download Size: {RECOMMENDED_LOCAL_MODEL.sizeEstimate} (one-time local cache).</li>
                <li>Optional: Legislation search and citation work 100% offline without AI.</li>
                <li>Can be unloaded or deleted anytime to reclaim RAM/storage.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
              <button
                onClick={() => setShowConsentDialog(false)}
                className="px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadAndEnable}
                className="px-4 py-1.5 bg-primary text-on-primary font-mono text-xs font-bold rounded hover:bg-primary-container"
              >
                Download & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
