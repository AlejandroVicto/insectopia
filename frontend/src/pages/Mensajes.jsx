import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarConversacion, adaptarMensaje, adaptarPagina, combinarMensajes } from '../adapters/mensajesAdapter'
import { consultarConversacionesDemo, consultarMensajesDemo, conversacionesDemo } from '../data/mensajesDemo'
import { abrirConversacion, consultarConversacion, consultarConversaciones, ocultarConversacion, registrarLectura } from '../services/conversacionesService'
import { consultarMensajes, enviarMensaje } from '../services/mensajesService'
import ConversationsList from '../components/mensajes/ConversationsList'
import ConversationPanel from '../components/mensajes/ConversationPanel'
import ContactProfile from '../components/mensajes/ContactProfile'
import NewMessageModal from '../components/mensajes/NewMessageModal'
import HideConversationModal from '../components/mensajes/HideConversationModal'
import './mensajes.css'

export const MENSAJES_DEMO = import.meta.env.VITE_MENSAJES_MOCK === 'true'
const PAGE_SIZE = 20
const HISTORY_SIZE = 30
const POLL_MS = Math.max(5000, Number(import.meta.env.VITE_MENSAJES_POLL_MS) || 15000)
const mergeChats = (current, incoming) => [...new Map([...current, ...incoming].map((chat) => [String(chat.id), chat])).values()]

export default function Mensajes({ demo = MENSAJES_DEMO, pollMs = POLL_MS }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedChat = searchParams.get('conversacion')
  const [routeError, setRouteError] = useState('')
  const [visibleTab, setVisibleTab] = useState(document.visibilityState !== 'hidden')
  const routeController = useRef(null)
  const readController = useRef(null)
  const readUpTo = useRef(null)
  const [draftSearch, setDraftSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('todos')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)
  const [demoChats, setDemoChats] = useState(() => conversacionesDemo.map((chat) => ({ ...chat })))
  const [list, setList] = useState(null)
  const [listRetry, setListRetry] = useState(0)
  const [history, setHistory] = useState(null)
  const [historyRetry, setHistoryRetry] = useState(0)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const listMoreController = useRef(null)
  const historyMoreController = useRef(null)
  const sendController = useRef(null)
  const sendingRef = useRef(false)
  const listKey = JSON.stringify([demo, query, filter, listRetry])
  const historyKey = JSON.stringify([demo, selected?.id, historyRetry, user?.id])
  const demoPage = demo ? adaptarPagina(consultarConversacionesDemo({ q: query, noLeidos: filter === 'no-leidos', size: PAGE_SIZE, chats: demoChats }), adaptarConversacion) : null
  const visibleList = demo ? { key: listKey, status: 'success', chats: demoPage.content, page: 0, hasMore: !demoPage.last }
    : list?.key === listKey ? list : { key: listKey, status: 'loading', chats: [], page: 0, hasMore: false }
  const demoHistory = demo && selected ? adaptarPagina(consultarMensajesDemo(selected.id, user.id), adaptarMensaje) : null
  const visibleHistory = !selected ? null : demo ? { key: historyKey, status: 'success', messages: combinarMensajes([], demoHistory.content), hasMore: !demoHistory.last }
    : history?.key === historyKey ? history : { key: historyKey, status: 'loading', messages: [], hasMore: false }

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draftSearch.trim()), 350)
    return () => clearTimeout(timer)
  }, [draftSearch])

  useEffect(() => {
    function onVisibility() { setVisibleTab(document.visibilityState !== 'hidden') }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (demo || requestedChat === null) return undefined
    const controller = new AbortController()
    routeController.current = controller
    queueMicrotask(() => { if (!controller.signal.aborted) { setSelected(null); setRouteError('') } })
    if (!/^[1-9]\d*$/.test(requestedChat) || !Number.isSafeInteger(Number(requestedChat))) {
      queueMicrotask(() => { if (!controller.signal.aborted) setRouteError('Conversación no disponible.') })
      return () => controller.abort()
    } else {
      consultarConversacion(requestedChat, { signal: controller.signal }).then(({ data }) => {
        const chat = adaptarConversacion(data)
        if (String(chat.id) !== requestedChat) throw new Error('Conversación incorrecta')
        if (!controller.signal.aborted) setSelected(chat)
      }).catch((error) => {
        if (!controller.signal.aborted) setRouteError(error.response?.status === 403 || error.response?.status === 404
          ? 'Conversación no disponible.' : 'No se pudo abrir la conversación.')
      })
    }
    return () => controller.abort()
  }, [demo, requestedChat])

  useEffect(() => {
    const controller = new AbortController()
    if (!demo) {
      consultarConversaciones({ q: query, noLeidos: filter === 'no-leidos', size: PAGE_SIZE, signal: controller.signal })
        .then(({ data }) => {
          const page = adaptarPagina(data, adaptarConversacion)
          if (!controller.signal.aborted) setList({ key: listKey, status: 'success', chats: page.content, page: 0, hasMore: !page.last })
        }).catch(() => { if (!controller.signal.aborted) setList({ key: listKey, status: 'error', chats: [], page: 0, hasMore: false }) })
    }
    return () => { controller.abort(); listMoreController.current?.abort() }
  }, [demo, query, filter, listRetry, listKey])

  useEffect(() => {
    const controller = new AbortController()
    if (!demo && selected) {
      consultarMensajes(selected.id, { size: HISTORY_SIZE, signal: controller.signal }).then(({ data }) => {
        const page = adaptarPagina(data, adaptarMensaje)
        if (page.content.some((msg) => String(msg.conversacionId) !== String(selected.id))) throw new Error('Mensajes de otra conversación')
        if (!controller.signal.aborted) setHistory({ key: historyKey, status: 'success', messages: combinarMensajes([], page.content), page: 0, hasMore: !page.last })
      }).catch(() => { if (!controller.signal.aborted) setHistory({ key: historyKey, status: 'error', messages: [], page: 0, hasMore: false }) })
    }
    return () => { controller.abort(); historyMoreController.current?.abort() }
  }, [demo, selected, historyRetry, historyKey])

  // Confirmar únicamente hasta el último mensaje recibido que aparece en el historial cargado.
  const latestReceived = visibleHistory?.status === 'success' && selected
    ? [...visibleHistory.messages].reverse().find((msg) => String(msg.remitenteId) !== String(user?.id)) : null
  const receivedId = latestReceived?.id
  const selectedId = selected?.id
  useEffect(() => {
    if (demo || !selectedId || !visibleTab || visibleHistory?.status !== 'success' || !receivedId) return undefined
    const marker = `${selectedId}:${receivedId}`
    if (readUpTo.current === marker) return undefined
    const controller = new AbortController()
    readController.current?.abort()
    readController.current = controller
    registrarLectura(selectedId, receivedId, { signal: controller.signal }).then(({ data }) => {
      const confirmed = adaptarConversacion(data)
      if (String(confirmed.id) !== String(selectedId)) throw new Error('Lectura de otra conversación')
      if (!controller.signal.aborted) {
        readUpTo.current = marker
        setSelected((current) => String(current?.id) === String(confirmed.id) ? { ...current, noLeidos: confirmed.noLeidos } : current)
        setList((prev) => prev?.status === 'success' ? { ...prev,
          chats: prev.chats.map((chat) => String(chat.id) === String(confirmed.id)
            ? { ...chat, noLeidos: confirmed.noLeidos } : chat) } : prev)
        setListRetry((n) => n + 1)
      }
    }).catch(() => { /* El contador sigue siendo el del servidor; podrá reintentarse al reabrir el chat. */ })
    return () => controller.abort()
  }, [demo, selectedId, visibleHistory?.status, receivedId, visibleTab])

  // A single delayed request at a time; no polling in demo, hidden tabs, or without a session/chat.
  useEffect(() => {
    if (demo || !selected || visibleHistory?.status !== 'success' || !user?.id) return undefined
    const controller = new AbortController()
    let timer
    let failed = 0
    async function refresh() {
      if (controller.signal.aborted) return
      if (document.visibilityState !== 'hidden') {
        try {
          const { data } = await consultarMensajes(selected.id, { size: HISTORY_SIZE, signal: controller.signal })
          const page = adaptarPagina(data, adaptarMensaje)
          if (page.content.some((msg) => String(msg.conversacionId) !== String(selected.id))) throw new Error('Mensajes de otra conversación')
          if (!controller.signal.aborted) {
            failed = 0
            setHistory((prev) => prev?.key === historyKey && prev.status === 'success'
              ? { ...prev, messages: combinarMensajes(prev.messages, page.content) } : prev)
          }
        } catch { failed = Math.min(failed + 1, 4) }
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, pollMs * (failed ? 2 ** failed : 1))
    }
    timer = setTimeout(refresh, pollMs)
    return () => { clearTimeout(timer); controller.abort() }
  }, [demo, selected, visibleHistory?.status, historyKey, pollMs, user?.id])

  useEffect(() => () => sendController.current?.abort(), [])

  function choose(chat, force = false) {
    if (!force && String(chat.id) === String(selected?.id)) return
    routeController.current?.abort()
    if (requestedChat !== null) {
      const next = new URLSearchParams(searchParams)
      next.delete('conversacion')
      setSearchParams(next, { replace: true })
    }
    setRouteError('')
    sendController.current?.abort()
    sendingRef.current = false
    setSending(false)
    setDraft('')
    setSendError('')
    setSelected(chat)
  }

  async function openRecipient(person, signal) {
    if (!person.loSigo || String(person.id) === String(user.id)) throw new Error('Destinatario no permitido')
    if (demo) {
      const existing = demoChats.find((chat) => String(chat.interlocutor.id) === String(person.id))
      const chat = existing ? { ...existing, interlocutor: { ...existing.interlocutor, loSigo: true }, oculta: false } : {
        id: `demo-chat-${person.id}`, interlocutor: { ...person }, ultimoMensaje: null, noLeidos: 0, oculta: false,
      }
      setDemoChats((prev) => existing ? prev.map((item) => String(item.id) === String(chat.id) ? chat : item) : [chat, ...prev])
      return adaptarConversacion(chat)
    }
    const { data } = await abrirConversacion(person.id, { signal })
    const chat = adaptarConversacion(data)
    if (String(chat.interlocutor.id) !== String(person.id) || chat.oculta) throw new Error('Respuesta de conversación inválida')
    return chat
  }

  function opened(chat) {
    setDraftSearch('')
    setQuery('')
    setFilter('todos')
    setListRetry((n) => n + 1)
    choose(chat, true)
    setModal(null)
  }

  async function hideChat(id, signal) {
    if (demo) return
    const response = await ocultarConversacion(id, { signal })
    if (response.status !== 204 && !(response.status === 200 && response.data?.oculta === true)) {
      throw new Error('La ocultación no fue confirmada por el servidor')
    }
  }

  function hidden(id) {
    if (demo) setDemoChats((prev) => prev.map((chat) => String(chat.id) === String(id) ? { ...chat, oculta: true } : chat))
    setSelected(null)
    sendController.current?.abort()
    sendingRef.current = false
    setSending(false)
    setDraft('')
    setSendError('')
    setListRetry((n) => n + 1)
    setModal(null)
  }

  async function loadChats() {
    if (demo || visibleList.status !== 'success' || !visibleList.hasMore || listMoreController.current) return
    const controller = new AbortController()
    listMoreController.current = controller
    setList((prev) => ({ ...prev, loadingMore: true }))
    try {
      const { data } = await consultarConversaciones({ page: visibleList.page + 1, size: PAGE_SIZE, q: query,
        noLeidos: filter === 'no-leidos', signal: controller.signal })
      const page = adaptarPagina(data, adaptarConversacion)
      if (!controller.signal.aborted) setList((prev) => prev?.key === listKey
        ? { ...prev, chats: mergeChats(prev.chats, page.content), page: page.number, hasMore: !page.last, loadingMore: false } : prev)
    } catch {
      if (!controller.signal.aborted) setList((prev) => prev?.key === listKey ? { ...prev, loadingMore: false, moreError: true } : prev)
    } finally { if (listMoreController.current === controller) listMoreController.current = null }
  }

  async function loadOlder() {
    if (demo || visibleHistory?.status !== 'success' || (!visibleHistory.hasMore && !visibleHistory.olderError) || historyMoreController.current) return
    const controller = new AbortController()
    historyMoreController.current = controller
    setHistory((prev) => ({ ...prev, loadingMore: true, olderError: false }))
    try {
      const { data } = await consultarMensajes(selected.id, { page: visibleHistory.page + 1, size: HISTORY_SIZE, signal: controller.signal })
      const page = adaptarPagina(data, adaptarMensaje)
      if (page.content.some((msg) => String(msg.conversacionId) !== String(selected.id))) throw new Error('Mensajes de otra conversación')
      if (!controller.signal.aborted) setHistory((prev) => prev?.key === historyKey
        ? { ...prev, messages: combinarMensajes(prev.messages, page.content), page: page.number, hasMore: !page.last, loadingMore: false } : prev)
    } catch {
      if (!controller.signal.aborted) setHistory((prev) => prev?.key === historyKey ? { ...prev, loadingMore: false, olderError: true } : prev)
    } finally { if (historyMoreController.current === controller) historyMoreController.current = null }
  }

  async function send() {
    if (demo || !selected || !draft.trim() || sendingRef.current || visibleHistory?.status !== 'success') return
    const controller = new AbortController()
    sendController.current = controller
    sendingRef.current = true
    setSending(true)
    setSendError('')
    const content = draft.trim()
    try {
      const { data } = await enviarMensaje(selected.id, content, { signal: controller.signal })
      const message = adaptarMensaje(data)
      if (String(message.conversacionId) !== String(selected.id) || String(message.remitenteId) !== String(user.id)) throw new Error('Respuesta de envío inválida')
      if (!controller.signal.aborted) {
        setHistory((prev) => prev?.key === historyKey ? { ...prev, messages: combinarMensajes(prev.messages, [message]) } : prev)
        setDraft((current) => current === draft ? '' : current)
      }
    } catch {
      if (!controller.signal.aborted) setSendError('No se pudo enviar el mensaje.')
    } finally {
      if (sendController.current === controller) { sendController.current = null; sendingRef.current = false; setSending(false) }
    }
  }

  return <div className="mensajes">
    <div className="msg-heading"><div><h1 className="font-display">Mensajes</h1>
      {routeError && <p role="alert" className="msg-inline-error">{routeError}</p>}</div></div>
    <div className="msg-grid"><ConversationsList chats={visibleList.chats} selectedId={selected?.id} onSelect={choose}
      draft={draftSearch} onSearch={setDraftSearch} filter={filter} onFilter={setFilter} status={visibleList.status}
      onRetry={() => setListRetry((n) => n + 1)} onMore={loadChats} hasMore={visibleList.hasMore} loadingMore={visibleList.loadingMore} moreError={visibleList.moreError}
      onNew={() => setModal('new')} />
      <ConversationPanel chat={selected} history={visibleHistory} userId={user?.id} demo={demo} draft={draft} onDraft={setDraft}
        onSend={send} sending={sending} sendError={sendError} onRetry={() => setHistoryRetry((n) => n + 1)} onMore={loadOlder}
        onOptions={() => setModal('hide')} />
      <ContactProfile chat={selected} onHide={() => setModal('hide')} /></div>
    {modal === 'new' && <NewMessageModal demo={demo} userId={user?.id} onClose={() => setModal(null)} onOpen={openRecipient} onOpened={opened} />}
    {modal === 'hide' && selected && <HideConversationModal demo={demo} chat={selected} onClose={() => setModal(null)} onHide={hideChat} onHidden={hidden} />}
  </div>
}
