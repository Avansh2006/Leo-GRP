'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProductivity } from '@/contexts/ProductivityContext'
import { useToast } from '@/components/ToastProvider'
import {
  retrieveLegislationContext,
  generateInstantLegalExplanation,
  RetrievedSource,
} from '@/utils/legislationRetriever'
import {
  aiModelProvider,
  AIModelStatus,
  RECOMMENDED_LOCAL_MODEL,
} from '@/utils/aiModelProvider'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  sources?: RetrievedSource[]
  timestamp: string
}

interface LegislationAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
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
  const [aiStatus, setAiStatus] = useState<AIModelStatus>(aiModelProvider.getStatus())
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [webGPUInfo, setWebGPUInfo] = useState<{ supported: boolean; message: string } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to AI Model Provider state changes
  useEffect(() => {
    const unsubscribe = aiModelProvider.subscribe((status, prog, text) => {
      setAiStatus(status)
      if (prog !== undefined) setDownloadProgress(prog)
      if (text !== undefined) setStatusText(text)
    })
    return () => unsubscribe()
  }, [])

  // Check WebGPU capabilities on open
  useEffect(() => {
    if (isOpen) {
      aiModelProvider.checkDeviceWebGPUSupport().then(setWebGPUInfo)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle initial pre-filled query if provided (e.g. from "Ask Assistant" on a law card)
  useEffect(() => {
    if (isOpen && initialQuery) {
      setInputQuery(initialQuery)
    }
  }, [isOpen, initialQuery])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  if (!isOpen) return null

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = inputQuery.trim()
    if (!query) return

    const userMsgId = `msg-${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    }

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
      // 1. Retrieve authoritative legislation context
      const retrieval = await retrieveLegislationContext(query, 5)

      // 2. Generate answer
      if (aiStatus === 'READY' || aiStatus === 'INSTALLED') {
        let streamText = ''
        const assistantMsgId = `msg-ai-${Date.now()}`

        // Placeholder assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: 'Thinking...',
            sources: retrieval.sources,
            timestamp: new Date().toISOString(),
          },
        ])

        await aiModelProvider.generateExplanation(
          query,
          retrieval.contextText,
          (token) => {
            streamText += token
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, text: streamText } : m))
            )
          },
          (final) => {
            setIsProcessing(false)
          }
        )
      } else {
        // Fast Instant Retrieval Mode
        await new Promise((res) => setTimeout(res, 200))
        const explanation = generateInstantLegalExplanation(retrieval)

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-instant-${Date.now()}`,
            sender: 'assistant',
            text: explanation,
            sources: retrieval.sources,
            timestamp: new Date().toISOString(),
          },
        ])
        setIsProcessing(false)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Encountered an issue retrieving legislation. Please try another query.',
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
        className="w-full max-w-2xl h-[85vh] bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl overflow-hidden text-on-surface flex flex-col"
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
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded text-xs font-mono"
              title="Assistant Settings & Model Management"
            >
              ⚙️
            </button>
            <button
              onClick={() => {
                setMessages([])
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

        {/* Settings Drawer / Panel (if opened) */}
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
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl">
                ⚖️
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="font-semibold text-base text-on-surface">
                  Ask anything about San Andreas Legislation
                </h4>
                <p className="text-xs text-on-surface-variant font-mono leading-relaxed">
                  Instant local retrieval over the active Traffic Code (2nd Rendition) and Penal Codes.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg pt-2">
                {[
                  'What are the penalties for Reckless Driving?',
                  'Explain § T.C. 3.5 Driving Under Influence',
                  'What is the speed limit in special zones?',
                  'What are the rules for open carry of weapons?',
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
                  className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-3.5 text-xs sm:text-sm leading-relaxed ${
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
                        <span>📚</span> Authoritative Sources:
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
                            title={`Open ${s.code} in Legislation Guide`}
                          >
                            <span>§</span> {s.code} ({s.title.slice(0, 20)}...)
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
                  </div>
                )}
              </div>
            ))
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant py-2">
              <span className="animate-spin">⚙️</span>
              <span>Retrieving authoritative legislation provisions...</span>
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
            placeholder="Ask about traffic violations, charges, penalties, or procedures..."
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
