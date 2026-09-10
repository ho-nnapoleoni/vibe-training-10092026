import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Anchor, ArrowDown, Check, ChevronDown, CircleHelp, Clock3, Gauge, Map, Moon, RefreshCw, RotateCcw, Ship, ShieldCheck, SlidersHorizontal, Sun, TriangleAlert, X } from 'lucide-react'
import { assessImpact } from './impact'
import { details, zones } from './data'
import { chokepointById, chokepointRules } from './domain/chokepoints'
import { buildRouteModel } from './domain/routing'
import { MapViewer } from './components/MapViewer'
import { loadServiceDetail, request } from './api'
import type { Chokepoint, ImpactAssessment, ServiceDetail, ServiceSummary, ZoneCode } from './types'

const GlobeViewer = lazy(() => import('./components/GlobeViewer').then((module) => ({ default: module.GlobeViewer })))

function App() {
  const [from, setFrom] = useState<ZoneCode>('ASIE')
  const [to, setTo] = useState<ZoneCode>('WEUR')
  const [services, setServices] = useState<ServiceSummary[]>([])
  const [selected, setSelected] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState<Chokepoint[]>([])
  const [apiMode, setApiMode] = useState<'fixture' | 'live' | 'offline'>('fixture')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailErrors, setDetailErrors] = useState<{ proforma?: string; fleet?: string }>({})
  const [lastService, setLastService] = useState<ServiceSummary | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'))
  const listController = useRef<AbortController | null>(null)
  const detailController = useRef<AbortController | null>(null)

  useEffect(() => { request<{ mode: 'fixture' | 'live' }>('/api/health').then((health) => setApiMode(health.mode)).catch(() => setApiMode('offline')) }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme) }, [theme])
  useEffect(() => () => { listController.current?.abort(); detailController.current?.abort() }, [])

  async function loadServices() {
    listController.current?.abort(); listController.current = new AbortController()
    setLoading(true); setError(''); setSelected(null)
    try { const result = await request<{ items: ServiceSummary[] }>(`/api/zones/${from}/zones/${to}/services`, listController.current.signal); setServices(result.items) }
    catch (loadError) { if ((loadError as Error).name !== 'AbortError') setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les services.') }
    finally { setLoading(false) }
  }

  async function selectService(service: ServiceSummary) {
    detailController.current?.abort(); detailController.current = new AbortController()
    setDetailLoading(true); setSelected(null); setExpanded(null); setDetailErrors({}); setLastService(service)
    try { const result = await loadServiceDetail(service, detailController.current.signal); setSelected(result.detail); setDetailErrors({ proforma: result.proformaError, fleet: result.fleetError }) }
    catch (loadError) { if ((loadError as Error).name !== 'AbortError') setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le service.') }
    finally { setDetailLoading(false) }
  }

  function resetScenario() { listController.current?.abort(); detailController.current?.abort(); setActive([]); setServices([]); setSelected(null); setError(''); setDetailErrors({}); setExpanded(null) }

  const assessments = useMemo(() => services.map((service) => {
    const detail = service.code === selected?.code ? selected : details[service.code]
    return { service, impact: assessImpact(service, detail?.proformaCalls ?? [], active) }
  }), [services, selected, active])
  const affected = assessments.filter((item) => item.impact.status === 'AFFECTED')
  const unknown = assessments.filter((item) => item.impact.status === 'UNKNOWN')
  const criticalEscalation = affected.filter((item) => item.service.criticality === 'CRITICAL').length >= 3

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Anchor size={20} /></div><div><span className="eyebrow">CMA CGM / OPERATIONS INTELLIGENCE</span><h1>Disruption Navigator</h1></div></div>
      <div className="topbar-actions"><span className={`mode-pill ${apiMode}`}><span className="status-dot" />{apiMode === 'fixture' ? 'Données de démonstration' : apiMode === 'live' ? 'API connectée' : 'API indisponible'}</span><button className="icon-button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} title="Changer de thème" aria-label={`Activer le thème ${theme === 'dark' ? 'clair' : 'sombre'}`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button" onClick={resetScenario} title="Réinitialiser le scénario" aria-label="Réinitialiser le scénario"><RotateCcw size={18} /></button><button className="icon-button" onClick={() => setHelpOpen(true)} title="Aide sur les données" aria-label="Aide sur les données"><CircleHelp size={18} /></button></div>
    </header>

    <section className="hero-band"><div><p className="kicker">VOYAGE CONTROL ROOM / 01</p><h2>See the route.<br /><em>Stress the network.</em></h2><p className="hero-copy">Explore service exposure across the global network and model what happens when a strategic maritime chokepoint closes.</p></div><div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><Ship size={29} /><span>LIVE<br />MODEL</span></div><span className="orbit-label label-top">ROUTE<br />SIGNAL</span><span className="orbit-label label-bottom">READ ONLY</span></div></section>

    <section className="control-panel panel">
      <div className="panel-heading"><div><span className="section-index">01</span><div><h3>Set your corridor</h3><p>Choose the departure and arrival zones to load active services.</p></div></div><span className="step-tag">SCENARIO SETUP</span></div>
      <div className="control-grid"><label><span>Departure zone</span><select value={from} onChange={(event) => setFrom(event.target.value as ZoneCode)}>{zones.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label><div className="route-arrow"><ArrowDown size={17} /></div><label><span>Arrival zone</span><select value={to} onChange={(event) => setTo(event.target.value as ZoneCode)}>{zones.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label><button className="primary-button" onClick={loadServices} disabled={loading}>{loading ? <RefreshCw className="spin" size={17} /> : <SlidersHorizontal size={17} />}{loading ? 'Loading services' : 'Load services'}</button></div>
      <div className="disruption-strip"><div className="strip-label"><span className="signal-icon"><TriangleAlert size={17} /></span><div><strong>Simulate a disruption</strong><small>Local scenario · no upstream action</small></div></div><div className="toggle-group">{chokepointRules.map((rule) => <button key={rule.id} className={`toggle ${active.includes(rule.id) ? 'is-active' : ''}`} onClick={() => setActive((current) => current.includes(rule.id) ? current.filter((item) => item !== rule.id) : [...current, rule.id])}><span className="toggle-track"><span /></span>{rule.label}</button>)}</div></div>
    </section>

    {error && <div className="alert error-alert" role="alert" aria-live="assertive"><AlertTriangle size={18} /><span>{error}</span><button className="retry-button" onClick={() => lastService ? selectService(lastService) : loadServices()}><RefreshCw size={14} />Réessayer</button><button onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}

    <section className="workspace-grid">
      <div className="services-column"><div className="section-heading"><div><span className="section-index">02</span><div><h3>Services in corridor</h3><p>{services.length ? `${services.length} active services · ${from} → ${to}` : 'Load a corridor to inspect its services'}</p></div></div><span className="count-badge">{affected.length} affected</span></div>
        {active.length > 0 && <div className="scenario-banner" aria-live="polite"><div className="scenario-status"><span className="pulse-dot" /><strong>{active.map((item) => chokepointById[item].label).join(' + ')} closure active</strong></div><div className="scenario-counts"><span><b>{affected.length}</b> affected</span><span><b>{unknown.length}</b> uncertain</span>{criticalEscalation && <span className="escalation"><TriangleAlert size={14} />Escalate</span>}</div></div>}
        {loading && <div className="loading-stack"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>}
        {!loading && services.length === 0 && <div className="empty-state"><div className="empty-icon"><Gauge size={23} /></div><h4>No corridor loaded</h4><p>Choose two zones above, then load the active maritime services.</p></div>}
        {!loading && services.map((service) => { const item = assessments.find((entry) => entry.service.code === service.code)!; return <button key={service.code} className={`service-card ${selected?.code === service.code ? 'selected' : ''} ${item.impact.status === 'AFFECTED' ? 'affected' : ''}`} onClick={() => selectService(service)}><div className="card-topline"><span className="service-code">{service.code}</span><span className={`impact-mini ${item.impact.status.toLowerCase()}`}>{item.impact.status === 'AFFECTED' ? 'Affected' : item.impact.status === 'UNKNOWN' ? 'Unknown' : active.length ? 'Clear' : '—'}</span></div><h4>{service.name}</h4><p>{service.line.name} <span>·</span> {service.serviceType}</p><div className="card-footer"><span><Clock3 size={14} /> Every {service.frequency} days</span><span>{service.carriers[0]?.code}</span><ChevronDown className="card-chevron" size={17} /></div></button> })}</div>
      <aside className="detail-column"><div className="section-heading detail-heading"><div><span className="section-index">03</span><div><h3>Service intelligence</h3><p>Operational detail and network exposure</p></div></div><span className="read-only"><ShieldCheck size={13} /> READ ONLY</span></div>
        {detailLoading && <div className="detail-empty"><RefreshCw className="spin" size={23} /><p>Fetching operational detail...</p></div>}
        {!detailLoading && !selected && <div className="detail-empty"><div className="map-glyph"><Map size={27} /></div><p>Select a service to see its port calls, fleet and impact assessment.</p></div>}
        {selected && <ServiceDetailPanel detail={selected} impact={assessments.find((item) => item.service.code === selected.code)!.impact} errors={detailErrors} retry={() => lastService && selectService(lastService)} expanded={expanded} setExpanded={setExpanded} />}
      </aside>
    </section>
    {helpOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Fermer l'aide"><X size={18} /></button><span className="eyebrow">SIMULATION READ ONLY</span><h3 id="help-title">Comment lire les résultats</h3><p>Les escales et navires viennent de l'API ou des fixtures. Les détections de chokepoints, routes alternatives et délais sont des estimations heuristiques.</p><p>Aucune fermeture ni proposition ne déclenche une action externe. Toute décision doit être validée par les opérations.</p></section></div>}
    <footer><span>DISRUPTION NAVIGATOR · AI-FIRST 2026</span><span><ShieldCheck size={14} /> Simulation only · Human approval required for all recommendations</span></footer>
  </main>
}

function ServiceDetailPanel({ detail, impact, errors, retry, expanded, setExpanded }: { detail: ServiceDetail; impact: ImpactAssessment; errors: { proforma?: string; fleet?: string }; retry: () => void; expanded: string | null; setExpanded: (value: string | null) => void }) {
  const route = buildRouteModel(detail.proformaCalls, impact)
  const [view, setView] = useState<'map' | 'globe'>('map')
  return <div className="detail-content"><div className="detail-identity"><div className="service-avatar"><Ship size={22} /></div><div><h4>{detail.name}</h4><p>{detail.code} · {detail.line.name}</p></div><span className="active-label"><Check size={13} /> Active</span></div><div className="metric-row"><div><span>Rotation</span><strong>{detail.rotationDuration} <small>days</small></strong></div><div><span>Frequency</span><strong>{detail.frequency} <small>days</small></strong></div><div><span>Fleet</span><strong>{detail.fleet.length} <small>vessels</small></strong></div></div><div className="detail-section"><div className="subheading"><h4>World route</h4><span>{route.nominal.length} mapped calls</span></div><div className="view-tabs" role="tablist" aria-label="Route visualisation"><button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>2D map</button><button role="tab" aria-selected={view === 'globe'} className={view === 'globe' ? 'active' : ''} onClick={() => setView('globe')}>3D globe</button></div>{view === 'map' ? <MapViewer route={route} impact={impact} /> : <GlobeViewer route={route} impact={impact} />}</div><div className="detail-section"><div className="subheading"><h4>Port rotation</h4><span>{detail.proformaCalls.length} calls</span></div><div className="timeline">{detail.proformaCalls.map((call, index) => <div className="timeline-item" key={`${call.port.code}-${index}`}><div className="timeline-marker"><span /></div><div className="port-content"><div><strong>{call.port.name}</strong><span className="port-code">{call.port.unLocode}</span></div><p>{call.terminal?.name ?? 'Terminal data unavailable'} <span>·</span> {call.bound}</p></div><span className="transit">{call.transitTime ?? '—'} <small>days</small></span></div>)}</div></div><div className="detail-section fleet-section"><div className="subheading"><h4>Assigned fleet</h4><span>{detail.fleet.length} vessels</span></div>{detail.fleet.map((vessel) => <div className="vessel-row" key={vessel.imo}><div className="vessel-icon"><Ship size={15} /></div><div><strong>{vessel.name}</strong><p>IMO {vessel.imo}</p></div><span>{vessel.smdgLinerCode}</span></div>)}</div><div className={`impact-card ${impact.status.toLowerCase()}`}><button className="impact-header" onClick={() => setExpanded(expanded === detail.code ? null : detail.code)}><div><span className="impact-kicker"><TriangleAlert size={13} /> SCENARIO IMPACT</span><strong>{impact.status === 'AFFECTED' ? `${impact.activeChokepoints.join(' + ')} exposure detected` : impact.status === 'UNKNOWN' ? 'Impact cannot be confirmed' : 'No active chokepoint exposure'}</strong></div><ChevronDown className={expanded === detail.code ? 'rotate' : ''} size={18} /></button>{expanded === detail.code && <div className="impact-body">{impact.status === 'AFFECTED' ? <><div className="impact-facts"><div><span>First affected port</span><strong>{impact.firstAffectedPort?.name}</strong></div><div><span>Estimated delay</span><strong>+{impact.additionalDays} days</strong></div><div><span>Alternative</span><strong>{impact.alternateRoute}</strong></div></div><p className="proposal"><strong>[PROPOSAL]</strong> {impact.recommendation?.replace('[PROPOSAL] ', '')}</p><p className="confidence"><Check size={14} /> Medium confidence · heuristic port evidence · human validation required</p></> : <p className="impact-explanation">{impact.reason}</p>}</div>}</div></div>
}

export default App
