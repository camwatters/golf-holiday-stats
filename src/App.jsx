import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  ScatterChart, Scatter, ReferenceLine, ReferenceArea,
} from 'recharts'

// ── Palette ────────────────────────────────────────────────────────────────
const G = {
  green:      '#1b4332',
  greenMid:   '#2d6a4f',
  greenLight: '#d8f3dc',
  gold:       '#c9a84c',
  goldLight:  '#fdf6e3',
  silver:     '#9ca3af',
  bronze:     '#b87333',
  red:        '#9b1c1c',
  redLight:   '#fde8e8',
  blue:       '#1e3a5f',
  blueLight:  '#dbeafe',
  bg:         '#f2f0eb',
  card:       '#ffffff',
  border:     '#e5e2db',
  text:       '#111827',
  muted:      '#6b7280',
  faint:      '#f9f8f5',
}

const TEAM_COLORS    = { Europe: G.blue,    USA: G.red }
const TEAM_BG        = { Europe: G.blueLight, USA: G.redLight }
const CHART_PALETTE  = ['#1b4332','#c9a84c','#1e3a5f','#9b1c1c','#4a7c59','#b5883e','#2c5282','#7b1d1d','#6b9e80']

// ── Shared styles ──────────────────────────────────────────────────────────
const shadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)'
const shadowHover = '0 2px 6px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.1)'

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt1 = (n) => (typeof n === 'number' ? n.toFixed(2) : n)
const fmt3 = (n) => (typeof n === 'number' ? n.toFixed(3) : n)

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 10,
      padding: '10px 14px', boxShadow: shadow, fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: G.text }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: p.fill || p.stroke, display: 'inline-block' }} />
          <span style={{ color: G.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: G.text }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Card with export button ────────────────────────────────────────────────
function Card({ children, style, id, noPad }) {
  const ref = useRef()
  const exportImg = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas')
    const hidden = [...ref.current.querySelectorAll('[data-no-export]')]
    hidden.forEach(el => { el.dataset.prevDisplay = el.style.display; el.style.display = 'none' })
    const prevRadius = ref.current.style.borderRadius
    ref.current.style.borderRadius = '0'
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: G.card, useCORS: true })
    ref.current.style.borderRadius = prevRadius
    hidden.forEach(el => { el.style.display = el.dataset.prevDisplay || ''; delete el.dataset.prevDisplay })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = (id || 'card') + '.png'
    a.click()
  }, [id])

  return (
    <div ref={ref} style={{
      background: G.card, borderRadius: 16,
      border: `1px solid ${G.border}`,
      boxShadow: shadow,
      padding: noPad ? 0 : '28px',
      position: 'relative',
      overflow: noPad ? 'hidden' : undefined,
      ...style,
    }}>
      {children}
      <button
        onClick={exportImg}
        title="Save as PNG"
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,0.9)',
          border: `1px solid ${G.border}`,
          borderRadius: 8, cursor: 'pointer',
          padding: '4px 9px', fontSize: 12,
          color: G.muted, lineHeight: 1,
          backdropFilter: 'blur(4px)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = G.card; e.currentTarget.style.color = G.text }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.color = G.muted }}
      >⬇ Export</button>
    </div>
  )
}

function SectionTitle({ children, id }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '48px 0 20px' }}>
      <div style={{ width: 4, height: 28, background: G.gold, borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontSize: 22, fontWeight: 700, color: G.text, fontFamily: "'Playfair Display', serif" }}>
        {children}
      </h2>
    </div>
  )
}

// ── Floating Nav ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'sec-leaderboard',   label: 'Leaderboard' },
  { id: 'sec-rivalry',       label: 'Rivalry' },
  { id: 'sec-spotlight',     label: 'Player Spotlight' },
  { id: 'sec-profile',       label: 'Player Profile' },
  { id: 'sec-partnerships',  label: 'Best Partnerships' },
  { id: 'sec-wins',          label: 'Biggest Wins' },
  { id: 'sec-birdies',       label: 'Birdies' },
  { id: 'sec-awards',        label: 'Award Leaderboards' },
  { id: 'sec-dotd',          label: 'Holiday Awards' },
]

function FloatingNav() {
  const [active, setActive]     = useState(null)
  const [expanded, setExpanded] = useState(false)
  const w = useWindowWidth()
  if (w < 768) return null

  useEffect(() => {
    const observers = NAV_SECTIONS.map(s => {
      const el = document.getElementById(s.id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(s.id) },
        { rootMargin: '-10% 0px -80% 0px' }
      )
      obs.observe(el)
      return obs
    }).filter(Boolean)
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
        zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'flex-start',
      }}
    >
      {NAV_SECTIONS.map(s => {
        const isActive = active === s.id
        return (
          <div
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: '3px 0',
            }}
          >
            <div style={{
              width: isActive ? 10 : 6,
              height: isActive ? 10 : 6,
              borderRadius: '50%',
              background: isActive ? G.gold : 'rgba(0,0,0,0.2)',
              flexShrink: 0,
              transition: 'all 0.2s',
              marginLeft: isActive ? 0 : 2,
            }} />
            <div style={{
              fontSize: 12, fontWeight: isActive ? 700 : 500,
              color: isActive ? G.text : G.muted,
              whiteSpace: 'nowrap',
              maxWidth: expanded ? 140 : 0,
              overflow: 'hidden',
              opacity: expanded ? 1 : 0,
              transition: 'max-width 0.25s ease, opacity 0.2s ease',
              background: expanded ? 'rgba(255,255,255,0.92)' : 'transparent',
              padding: expanded ? '2px 8px' : '2px 0',
              borderRadius: 99,
              boxShadow: expanded ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              {s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Badge({ children, color = G.green, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 99,
      background: bg || (color + '18'),
      color, fontSize: 12, fontWeight: 600,
      letterSpacing: 0.2,
    }}>{children}</span>
  )
}

function RankBadge({ rank }) {
  const map = {
    1: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
    2: { bg: '#f3f4f6', color: '#374151', border: '#9ca3af' },
    3: { bg: '#fef2e8', color: '#7c2d12', border: '#d97706' },
  }
  const s = map[rank] || { bg: G.faint, color: G.muted, border: G.border }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: s.bg, border: `1.5px solid ${s.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0,
    }}>{rank}</div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ data }) {
  const [hoveredHoliday, setHoveredHoliday] = useState(null)
  const w = useWindowWidth()
  const isMobile = w < 640
  const totalMatches = [...new Set(data.player_matches.map(r => `${r.holiday_id}-${r.match_id}`))].length
  const usaWins = data.rivalry.filter(r => r.winner === 'USA').length
  const euWins  = data.rivalry.filter(r => r.winner === 'Europe' || r.winner === 'Tie').length

  const mvpByHoliday = {}
  ;(data.holiday_mvp || []).forEach(m => { mvpByHoliday[m.holiday_id] = m })

  const infoByHoliday = {}
  data.awards.forEach(a => {
    const hol = data.holidays.find(h => h.holiday_id === a.holiday_id) || {}
    infoByHoliday[a.holiday_id] = {
      courses:    [...new Set(a.matchdays.map(d => d.Course).filter(c => c && c !== 'Marbella'))],
      eurCaptain: hol.team_1_captain || '',
      usaCaptain: hol.team_2_captain || '',
    }
  })

  return (
    <div style={{
      background: `linear-gradient(135deg, ${G.green} 0%, #0f2b1e 100%)`,
      borderRadius: 20,
      padding: isMobile ? '28px 20px 24px' : '48px 48px 44px',
      marginBottom: 8,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(27,67,50,0.35)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: isMobile ? 16 : 32 }}>
        {/* left: title */}
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            The Annual Golf Holiday
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isMobile ? 36 : 56, fontWeight: 800, color: '#ffffff',
            lineHeight: 1.05, marginBottom: 12,
          }}>
            Ride Her Cup<br />
            <span style={{ color: G.gold }}>Statistics</span>
          </h1>
        </div>

        {/* right: stats */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Series pill — first on mobile */}
          <div style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14, padding: '18px 24px', textAlign: 'center',
            order: isMobile ? -1 : 1,
            alignSelf: isMobile ? 'stretch' : 'auto',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Series</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#93c5fd', fontFamily: "'Playfair Display', serif" }}>{euWins}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Europe</div>
              </div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>–</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#fca5a5', fontFamily: "'Playfair Display', serif" }}>{usaWins}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>USA</div>
              </div>
            </div>
          </div>
          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', order: isMobile ? 1 : 0 }}>
            {[
              { value: data.holidays.length, label: 'Holidays' },
              { value: data.leaderboard.length, label: 'Players' },
              { value: totalMatches, label: 'Matches' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 14, padding: '18px 22px', textAlign: 'center', minWidth: 80, flex: 1,
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* bottom: holiday rivalry cards */}
      <div style={{
        marginTop: 36, paddingTop: 28,
        borderTop: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', gap: 12, flexWrap: 'wrap',
        justifyContent: isMobile ? 'center' : 'flex-start',
      }}>
        {data.rivalry.map(r => {
          const info = infoByHoliday[r.holiday_id] || { courses: [], eurCaptain: '', usaCaptain: '' }
          const { courses, eurCaptain, usaCaptain } = info
          const isHovered = hoveredHoliday === r.holiday_id
          return (
            <div
              key={r.holiday_id}
              onMouseEnter={() => setHoveredHoliday(r.holiday_id)}
              onMouseLeave={() => setHoveredHoliday(null)}
              style={{
                flex: 1, minWidth: 160, position: 'relative',
                background: isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '14px 18px',
                border: `1px solid ${isHovered ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'default', transition: 'all 0.15s',
              }}
            >
              {/* location + winner badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{r.country}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{r.area}</div>
                </div>
                <span style={{
                  flexShrink: 0,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: r.winner === 'USA' ? 'rgba(252,165,165,0.2)' : 'rgba(147,197,253,0.2)',
                  color: r.winner === 'USA' ? '#fca5a5' : '#93c5fd',
                }}>{r.winner === 'Tie' ? 'Retained' : r.winner}</span>
              </div>

              {/* progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(r.europe_pts / (r.europe_pts + r.usa_pts)) * 100}%`,
                  background: 'linear-gradient(90deg, #93c5fd, #3b82f6)',
                  borderRadius: 3,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>EUR {r.europe_pts}</span>
                <span style={{ color: '#fca5a5', fontWeight: 600 }}>USA {r.usa_pts}</span>
              </div>

              {/* MVP row */}
              {mvpByHoliday[r.holiday_id] && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>MVP </span>
                  <span style={{ color: G.gold, fontWeight: 700 }}>{mvpByHoliday[r.holiday_id].players.join(' & ')}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{mvpByHoliday[r.holiday_id].pts}pts</span>
                </div>
              )}

              {/* hover tooltip: courses + captains */}
              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                  background: '#0f2b1e', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '12px 14px', minWidth: 190,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 10,
                  pointerEvents: 'none',
                }}>
                  {courses.length > 0 && (<>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>Courses</div>
                    {courses.map(c => (
                      <div key={c} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{c}</div>
                    ))}
                  </>)}
                  {(eurCaptain || usaCaptain) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: courses.length > 0 ? 10 : 0 }}>
                      {eurCaptain && (
                        <div>
                          <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>EUR Captain</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{eurCaptain}</div>
                        </div>
                      )}
                      {usaCaptain && (
                        <div>
                          <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>USA Captain</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{usaCaptain}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Leaderboard ────────────────────────────────────────────────────────────
const LB_BASE = [
  { key: 'rank',            label: '#',          align: 'center', width: '3%' },
  { key: 'player',          label: 'Player',     align: 'left',   width: '13%' },
  { key: 'apps',            label: 'Apps',       align: 'center', width: '4%' },
  { key: 'total_pts',       label: 'Total',      align: 'center', width: '5%', fmt: fmt1 },
  { key: 'ppg',             label: 'PPG',        align: 'center', width: '5%', fmt: fmt3 },
]
const LB_PAIRS_COMBINED = [
  { key: 'pairs_record',    label: 'Pairs Rec',  align: 'center', width: '11%', title: 'Fourball + 2x2 Scramble combined W/L (ties)' },
]
const LB_PAIRS_EXPANDED = [
  { key: 'fourball_record', label: 'FB Rec',     align: 'center', width: '11%', title: 'Fourball W/L (ties)' },
  { key: 'twoxtwo_record',  label: '2x2 Rec',    align: 'center', width: '11%', title: '2x2 Scramble W/L (ties)' },
]
const LB_TAIL = [
  { key: 'singles_record',  label: 'Singles Rec',align: 'center', width: '11%', title: 'Singles W/L (ties)' },
  { key: 'kingpin_record',  label: 'Kingpin Rec', align: 'center', width: '10%', title: 'Kingpin W/L (ties)' },
  { key: 'scramble_record', label: 'Tex S Rec',  align: 'center', width: '10%', title: 'Texas Scramble — 1st/2nd/3rd/4th' },
  { key: 'birdies',         label: 'Birdies',    align: 'center', width: '3%',  title: 'Birdies' },
  { key: 'chip_ins',        label: 'Chip Ins',   align: 'center', width: '3%',  title: 'Chip-ins' },
  { key: 'long_drive',      label: 'Long Drive', align: 'center', width: '3%',  title: 'Long Drive wins' },
  { key: 'near_pin',        label: 'Near Pin',   align: 'center', width: '3%',  title: 'Nearest Pin wins' },
  { key: 'dotd',            label: 'DOTD',       align: 'center', width: '3%',  title: 'Dick Of The Day' },
]

function Leaderboard({ data, playerMatches, players }) {
  const [sortKey, setSortKey]       = useState('rank')
  const [sortAsc, setSortAsc]       = useState(true)
  const [hovered, setHovered]       = useState(null)
  const [pairsOpen, setPairsOpen]   = useState(false)
  const [expanded, setExpanded]     = useState(null)
  const [hoveredDot, setHoveredDot] = useState(null)
  const [filter2026, setFilter2026] = useState('all')

  const attending2026 = new Set((players || []).filter(p => p.attending).map(p => p.name))

  const teamOf = {}
  data.forEach(p => { teamOf[p.player] = p.team })

  const cols = [...LB_BASE, ...(pairsOpen ? LB_PAIRS_EXPANDED : LB_PAIRS_COMBINED), ...LB_TAIL]

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sortAsc ? cmp : -cmp
  })

  const handleSort = (key) => {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key === 'rank' || key === 'player') }
  }

  const pairsCols = pairsOpen ? LB_PAIRS_EXPANDED.length : LB_PAIRS_COMBINED.length

  return (
    <Card id="leaderboard" noPad>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '6%' }} />
            {pairsOpen ? <><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /></> : <col style={{ width: '9%' }} />}
            <col style={{ width: '9%' }} />
            <col style={{ width: '8.5%' }} />
            <col style={{ width: '8.5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: G.green, color: '#fff' }}>
              <th colSpan={LB_BASE.length} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                <div data-no-export style={{ display: 'flex', gap: 6 }}>
                  {['all', 'highlight', 'focus'].map(mode => (
                    <button
                      key={mode}
                      onClick={e => { e.stopPropagation(); setFilter2026(mode) }}
                      style={{
                        flex: 1, padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                        border: `1.5px solid ${filter2026 === mode ? '#fff' : 'rgba(255,255,255,0.4)'}`,
                        background: filter2026 === mode ? 'rgba(255,255,255,0.2)' : 'transparent',
                        color: '#fff',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {mode === 'all' ? 'All Players' : mode === 'highlight' ? '2026 Players' : '2026 Focus'}
                    </button>
                  ))}
                </div>
              </th>
              <th
                colSpan={pairsCols}
                style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, borderLeft: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setPairsOpen(o => !o)}
                title="Click to expand/collapse Pairs breakdown"
              >
                Pairs {pairsOpen ? '▾' : '▸'}
              </th>
              <th colSpan={3} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>Game Records</th>
              <th colSpan={LB_TAIL.length - 3} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>Awards</th>
            </tr>
            <tr style={{ background: G.faint, borderBottom: `2px solid ${G.border}` }}>
              {cols.map((col, ci) => {
                const isPairsBoundary = ci === LB_BASE.length
                return (
                  <th
                    key={col.key}
                    title={col.title}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '10px 12px', textAlign: col.align, fontWeight: 600,
                      cursor: 'pointer', userSelect: 'none', width: col.width,
                      whiteSpace: 'nowrap', fontSize: 11, letterSpacing: 0.3,
                      color: sortKey === col.key ? G.green : G.muted,
                      textTransform: 'uppercase',
                      borderLeft: isPairsBoundary ? `2px solid ${G.border}` : undefined,
                    }}
                  >
                    {col.label}{sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const isTop3    = row.rank <= 3
              const isExpanded = expanded === row.player

              // Build form dots for this player (most recent first)
              const matches = (playerMatches || [])
                .filter(m => m.player === row.player)
                .sort((a, b) => new Date(b.date) - new Date(a.date) || b.match_id - a.match_id)
              const groups = []
              matches.forEach(m => {
                const last = groups[groups.length - 1]
                if (!last || last.holiday_id !== m.holiday_id) groups.push({ holiday_id: m.holiday_id, area: m.area, matches: [] })
                groups[groups.length - 1].matches.push(m)
              })

              const isAttending = attending2026.has(row.player)
              const isNew2026 = !!row.new_2026
              if (isNew2026 && filter2026 !== 'focus') return null
              if (filter2026 === 'focus' && !isAttending && !isNew2026) return null
              const isDimmed = filter2026 === 'highlight' && !isAttending

              return (
                <>
                <tr
                  key={row.player}
                  onClick={() => setExpanded(isExpanded ? null : row.player)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isNew2026 ? G.faint
                      : isExpanded
                        ? (row.team === 'Europe' ? '#dbeafe' : row.team === 'USA' ? '#fee2e2' : G.greenLight)
                        : hovered === i
                          ? (row.team === 'Europe' ? '#e8f0fb' : row.team === 'USA' ? '#fbeaea' : '#f0faf4')
                          : row.team === 'Europe' ? '#f4f7fd' : row.team === 'USA' ? '#fdf4f4' : G.card,
                    borderBottom: isExpanded ? 'none' : `1px solid ${G.border}`,
                    transition: 'background 0.12s, opacity 0.2s',
                    cursor: isNew2026 ? 'default' : 'pointer',
                    opacity: isDimmed ? 0.25 : 1,
                  }}
                >
                  {cols.map((col, ci) => {
                    const v = row[col.key]
                    const display = isNew2026 && col.key !== 'player' && col.key !== 'rank' ? '—' : col.fmt ? col.fmt(v) : (v ?? '—')
                    const isPairsBoundary = ci === LB_BASE.length
                    const cellStyle = {
                      padding: '7px 12px', textAlign: col.align, color: G.muted,
                      borderLeft: isPairsBoundary ? `2px solid ${G.border}` : undefined,
                    }

                    if (col.key === 'rank') return (
                      <td key="rank" style={{ ...cellStyle, textAlign: 'center' }}>
                        {isNew2026 ? <span style={{ fontSize: 11, color: G.muted }}>—</span> : <RankBadge rank={row.rank} />}
                      </td>
                    )
                    if (col.key === 'player') return (
                      <td key="player" style={{ ...cellStyle, fontWeight: 700, fontSize: 14, color: isNew2026 ? G.muted : G.text, whiteSpace: 'nowrap' }}>
                        {row.player}
                        {!isNew2026 && isTop3 && <span style={{ marginLeft: 6, fontSize: 11, color: G.gold }}>★</span>}
                        {!isNew2026 && <span style={{ marginLeft: 8, fontSize: 10, color: G.muted }}>{isExpanded ? '▴' : '▾'}</span>}
                        {isNew2026 && <span style={{ marginLeft: 8, fontSize: 10, color: G.muted, fontStyle: 'italic' }}>2026</span>}
                      </td>
                    )
                    if (col.key === 'total_pts') return (
                      <td key="pts" style={cellStyle}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: isTop3 ? G.green : G.text }}>{display}</span>
                      </td>
                    )
                    if (col.key === 'dotd') return (
                      <td key="dotd" style={cellStyle}>
                        {Number(v) >= 3
                          ? <Badge color={G.red} bg={G.redLight}>{display}</Badge>
                          : display}
                      </td>
                    )
                    if (col.key === 'birdies') return (
                      <td key="birdies" style={cellStyle}>
                        {Number(v) >= 5
                          ? <Badge color={G.green} bg={G.greenLight}>{display}</Badge>
                          : display}
                      </td>
                    )
                    return <td key={col.key} style={cellStyle}>{display}</td>
                  })}
                </tr>
                {isExpanded && (
                  <tr key={`${row.player}-form`} style={{ borderBottom: `1px solid ${G.border}` }}>
                    <td colSpan={cols.length} style={{ padding: '12px 16px', background: G.faint }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {groups.map((g, gi) => (
                          <div key={g.holiday_id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {gi > 0 && <div style={{ width: 1, height: 28, background: G.border, marginRight: 8 }} />}
                            <div style={{ fontSize: 10, color: G.muted, fontWeight: 600, marginRight: 6, whiteSpace: 'nowrap' }}>{g.area}</div>
                            {g.matches.map((m, mi) => {
                              const dotKey = `lb-${row.player}-${g.holiday_id}-${mi}`
                              return (
                                <FormDot
                                  key={dotKey}
                                  match={m}
                                  isHovered={hoveredDot === dotKey}
                                  onEnter={() => setHoveredDot(dotKey)}
                                  onLeave={() => setHoveredDot(null)}
                                  teamOf={teamOf}
                                />
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Rivalry ────────────────────────────────────────────────────────────────
function RivalryChart({ rivalry, rivalryByDay, rivalryByFormat, holidays }) {
  const isMobile = useWindowWidth() < 640
  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Per-day bar data, with holiday separator label
  const dayData = rivalryByDay.map(r => ({
    label: fmtLabel(r.date),
    Europe: r.europe_pts,
    USA: r.usa_pts,
    holiday_id: r.holiday_id,
  }))

  // Cumulative by day
  const cumData = (() => {
    let e = 0, u = 0
    return rivalryByDay.map(r => {
      e += r.europe_pts; u += r.usa_pts
      return { label: fmtLabel(r.date), Europe: +e.toFixed(1), USA: +u.toFixed(1) }
    })
  })()

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
      <Card id="rivalry-per-day">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Points per Day</div>
        <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Match points awarded each matchday</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dayData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={42} />
            <YAxis tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
            <Bar dataKey="Europe" fill={G.blue}  radius={[4,4,0,0]} />
            <Bar dataKey="USA"    fill="#c0392b" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card id="rivalry-cumulative">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Cumulative Points</div>
        <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Running total day by day</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={cumData}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: G.muted }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={42} />
            <YAxis tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
            <Line type="monotone" dataKey="Europe" stroke={G.blue}    strokeWidth={3} dot={{ r: 4, fill: G.blue,    strokeWidth: 0 }} />
            <Line type="monotone" dataKey="USA"    stroke="#c0392b"   strokeWidth={3} dot={{ r: 4, fill: '#c0392b', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', marginTop: 14, padding: '10px 16px', background: G.faint, borderRadius: 10, fontSize: 14 }}>
          Final: <strong style={{ color: G.blue }}>Europe {cumData.at(-1)?.Europe}</strong>
          <span style={{ color: G.muted, margin: '0 8px' }}>vs</span>
          <strong style={{ color: '#c0392b' }}>USA {cumData.at(-1)?.USA}</strong>
        </div>
      </Card>
    </div>

    {/* By game type */}
    <Card id="rivalry-by-format" style={{ marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Points by Game Type</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {rivalryByFormat.map(r => {
          const winner = r.europe_pts > r.usa_pts ? 'Europe' : r.usa_pts > r.europe_pts ? 'USA' : null
          return (
            <div key={r.format} style={{
              flex: '1 1 180px',
              background: G.faint, border: `1px solid ${G.border}`,
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
                {r.format}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
                  color: winner === 'Europe' ? G.blue : G.muted,
                }}>{r.europe_pts % 1 === 0 ? r.europe_pts : r.europe_pts.toFixed(1)}</span>
                <span style={{ fontSize: 16, color: G.muted, fontWeight: 400 }}>–</span>
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
                  color: winner === 'USA' ? '#c0392b' : G.muted,
                }}>{r.usa_pts % 1 === 0 ? r.usa_pts : r.usa_pts.toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 4, fontSize: 10, color: G.muted, letterSpacing: 0.3 }}>
                <span>EUR</span><span>USA</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
    </>
  )
}

// ── Player Spotlight ───────────────────────────────────────────────────────
function PlayerSpotlight({ leaderboard, playerMatches, pairStats, vsStats, players }) {
  const [selected, setSelected] = useState(leaderboard[0]?.player)
  const [hoveredTile, setHoveredTile] = useState(null)
  const tileLeaveTimer = useRef(null)
  const isMobile = useWindowWidth() < 640
  const player = leaderboard.find(p => p.player === selected)
  const rank   = leaderboard.findIndex(p => p.player === selected) + 1
  const playerInfo = (players || []).find(p => p.name === selected)
  const fullName = playerInfo ? `${playerInfo.first_name} ${playerInfo.last_name}` : selected

  const myVs    = vsStats.filter(r => r.player === selected)

  // Head-to-head matches only (excludes Texas Scramble)
  const myMatches = playerMatches.filter(m => m.player === selected && m.format !== 'Texas Scramble')

  const h2hPts = myMatches.reduce((s, m) => s + (m.pts || 0), 0)
  const h2hPPG = myMatches.length > 0 ? h2hPts / myMatches.length : 0

  // Partner: most matches alongside (h2h only)
  const partnerMap = {}
  myMatches.forEach(m => {
    (m.partners || []).forEach(p => {
      if (!partnerMap[p]) partnerMap[p] = { name: p, matches: 0, W: 0, L: 0, H: 0, matchList: [] }
      partnerMap[p].matches++
      const r = String(m.result)
      if (r === 'Win') partnerMap[p].W++
      else if (r === 'Loss') partnerMap[p].L++
      else if (r === 'Halved') partnerMap[p].H++
      partnerMap[p].matchList.push({ date: m.date, format: m.format, course: m.course, result: r, score: m.score })
    })
  })
  const partner = Object.values(partnerMap).length
    ? Object.values(partnerMap).sort((a, b) => b.matches - a.matches)[0]
    : null

  // Rival: most matches against (h2h only)
  const rivalMap = {}
  myMatches.forEach(m => {
    (m.opponents || []).forEach(p => {
      if (!rivalMap[p]) rivalMap[p] = { name: p, matches: 0, W: 0, L: 0, H: 0, matchList: [] }
      rivalMap[p].matches++
      const r = String(m.result)
      if (r === 'Win') rivalMap[p].W++
      else if (r === 'Loss') rivalMap[p].L++
      else if (r === 'Halved') rivalMap[p].H++
      rivalMap[p].matchList.push({ date: m.date, format: m.format, course: m.course, result: r, score: m.score })
    })
  })
  const rival = Object.values(rivalMap).length
    ? Object.values(rivalMap).sort((a, b) => b.matches - a.matches)[0]
    : null

  // Friend: most pts earned with a partner (h2h only)
  const friendMap = {}
  myMatches.forEach(m => {
    (m.partners || []).forEach(p => {
      if (!friendMap[p]) friendMap[p] = { partner: p, pts: 0, matchList: [] }
      friendMap[p].pts += m.pts || 0
      friendMap[p].matchList.push({ date: m.date, format: m.format, course: m.course, result: String(m.result), score: m.score })
    })
  })
  const friend = Object.values(friendMap).length
    ? Object.values(friendMap).sort((a, b) => b.pts - a.pts)[0]
    : null

  // Enemy / Victim: computed from opponents in h2h matches
  const opponentMap = {}
  myMatches.forEach(m => {
    (m.opponents || []).forEach(opp => {
      if (!opponentMap[opp]) opponentMap[opp] = { name: opp, wins: 0, losses: 0, halves: 0, matchList: [] }
      const r = String(m.result)
      if (r === 'Win') opponentMap[opp].wins++
      else if (r === 'Loss') opponentMap[opp].losses++
      else if (r === 'Halved') opponentMap[opp].halves++
      opponentMap[opp].matchList.push({ date: m.date, format: m.format, course: m.course, result: r, score: m.score })
    })
  })
  const oppList = Object.values(opponentMap)
  const enemy  = oppList.length ? [...oppList].sort((a, b) => b.losses - a.losses)[0] : null
  const victim = oppList.length ? [...oppList].sort((a, b) => b.wins  - a.wins)[0]   : null
  const byFormat  = {}
  myMatches.forEach(m => {
    const f = m.format || 'Other'
    if (!byFormat[f]) byFormat[f] = { W: 0, L: 0, H: 0 }
    const r = String(m.result)
    if (r === 'Win')    byFormat[f].W++
    else if (r === 'Loss')   byFormat[f].L++
    else if (r === 'Halved') byFormat[f].H++
  })
  const formatData = Object.entries(byFormat).map(([fmt, v]) => ({ format: fmt, Win: v.W, Loss: v.L, Halved: v.H }))

  const stats = [
    { label: 'Apps',       value: player?.apps },
    { label: 'Points',     value: fmt1(player?.total_pts) },
    { label: 'PPG',        value: fmt3(player?.ppg) },
    { label: 'Birdies',    value: player?.birdies },
    { label: 'Chip-ins',   value: player?.chip_ins },
    { label: 'Long Drive', value: player?.long_drive },
    { label: 'Near Pin',   value: player?.near_pin },
    { label: 'Trip MVPs',  value: player?.holiday_wins },
  ]

  return (
    <Card id={`player-${selected}`}>
      {/* player selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${G.border}` }}>
        {leaderboard.filter(p => !p.new_2026).map(p => (
          <button
            key={p.player}
            onClick={() => setSelected(p.player)}
            style={{
              padding: '7px 16px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: selected === p.player ? G.green : G.faint,
              color:      selected === p.player ? '#fff'  : G.text,
              border: `1.5px solid ${selected === p.player ? G.green : G.border}`,
              transition: 'all 0.15s',
            }}
          >{p.player}</button>
        ))}
      </div>

      {player && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: isMobile ? 20 : 32 }}>
          {/* left panel */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <RankBadge rank={rank} />
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{fullName}</div>
                <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>Rank #{rank} · {player.apps} holidays</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: G.faint, borderRadius: 10, padding: '12px 14px', border: `1px solid ${G.border}` }}>
                  <div style={{ fontSize: 10, color: G.muted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: G.text, marginTop: 2 }}>{s.value ?? 0}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              {[
                { label: 'Scramble', value: player.scramble_record },
                { label: 'Pairs',    value: player.pairs_record },
                { label: 'Singles',  value: player.singles_record },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: `1px solid ${G.border}`, fontSize: 14,
                }}>
                  <span style={{ color: G.muted, fontWeight: 500 }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: G.text }}>{r.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right panel */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: G.text }}>W / L / Halved by format</div>
            {formatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={formatData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={G.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="format" tick={{ fontSize: 12, fill: G.muted }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Win"    fill={G.greenMid}  radius={[0,4,4,0]} stackId="a" />
                  <Bar dataKey="Halved" fill={G.gold}      stackId="a" />
                  <Bar dataKey="Loss"   fill="#c0392b"     radius={[0,4,4,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: G.muted, fontSize: 13 }}>No individual match data available</div>
            )}

            {/* relationship tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10, marginTop: 20 }}>
              {[
                {
                  label: 'Partner',
                  name: partner?.name,
                  sub: partner ? `${partner.matches} matches` : null,
                  matchList: partner?.matchList || [],
                  color: G.blue,
                  bg: G.blueLight,
                  border: '#bfdbfe',
                },
                {
                  label: 'Rival',
                  name: rival?.name,
                  sub: rival ? `${rival.matches} matches` : null,
                  matchList: rival?.matchList || [],
                  color: '#92400e',
                  bg: G.goldLight,
                  border: '#f6d860',
                },
                {
                  label: 'Friend',
                  name: friend?.partner,
                  sub: friend ? `${friend.pts.toFixed(1)} pts together` : null,
                  matchList: friend?.matchList || [],
                  color: G.greenMid,
                  bg: G.greenLight,
                  border: '#b7e4c7',
                },
                {
                  label: 'Enemy',
                  name: enemy?.name,
                  sub: enemy ? `${enemy.losses} loss${enemy.losses !== 1 ? 'es' : ''}` : null,
                  matchList: enemy?.matchList || [],
                  color: G.red,
                  bg: G.redLight,
                  border: '#fca5a5',
                },
                {
                  label: 'Victim',
                  name: victim?.name,
                  sub: victim ? `${victim.wins} win${victim.wins !== 1 ? 's' : ''}` : null,
                  matchList: victim?.matchList || [],
                  color: G.green,
                  bg: '#f0faf4',
                  border: '#b7e4c7',
                },
              ].map(t => (
                <div
                  key={t.label}
                  onMouseEnter={() => { clearTimeout(tileLeaveTimer.current); t.matchList.length > 0 && setHoveredTile(t.label) }}
                  onMouseLeave={() => { tileLeaveTimer.current = setTimeout(() => setHoveredTile(null), 200) }}
                  style={{
                    background: t.bg, border: `1px solid ${t.border}`,
                    borderRadius: 12, padding: '12px 14px',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5 }}>
                    {t.label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: G.text }}>{t.name ?? '—'}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{t.sub ?? ''}</div>
                  {hoveredTile === t.label && t.matchList.length > 0 && (
                    <div
                      onMouseEnter={() => clearTimeout(tileLeaveTimer.current)}
                      onMouseLeave={() => { tileLeaveTimer.current = setTimeout(() => setHoveredTile(null), 200) }}
                      style={{
                      position: 'absolute', bottom: '100%', left: 0,
                      paddingBottom: 6,
                      background: 'transparent',
                      zIndex: 20,
                      pointerEvents: 'auto',
                    }}>
                    <div style={{
                      background: G.card, border: `1px solid ${G.border}`,
                      borderRadius: 10, padding: '10px 12px',
                      minWidth: 210, maxHeight: 220, overflowY: 'auto',
                      boxShadow: shadowHover,
                    }}>
                      {t.matchList.map((mx, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          padding: '5px 0', borderBottom: i < t.matchList.length - 1 ? `1px solid ${G.border}` : 'none',
                          gap: 8,
                        }}>
                          <div>
                            <div style={{ fontSize: 12, color: G.text, fontWeight: 500 }}>{mx.format}</div>
                            <div style={{ fontSize: 11, color: G.muted }}>{mx.date?.slice(0, 10)} · {mx.course}</div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                            color: mx.result === 'Win' ? G.greenMid : mx.result === 'Loss' ? G.red : G.gold,
                          }}>
                            {mx.result}{mx.score ? ` (${mx.score})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Birdies ────────────────────────────────────────────────────────────────
function BirdiesChart({ leaderboard, birdieByHoliday, holidays }) {
  const isMobile = useWindowWidth() < 640
  const totalData = [...leaderboard]
    .filter(p => p.birdies > 0)
    .sort((a, b) => b.birdies - a.birdies)
    .map((p, i) => ({ player: p.player, Birdies: p.birdies, fill: i === 0 ? G.green : i === 1 ? G.greenMid : '#4a7c59' }))

  const holidayData = holidays.map(h => {
    const row = { name: `${h.Area}` }
    leaderboard.filter(p => p.birdies > 0).forEach(p => {
      const m = birdieByHoliday.find(b => b.holiday_id === h.holiday_id && b.player === p.player)
      row[p.player] = m?.birdies || 0
    })
    return row
  })

  const activePlayers = leaderboard.filter(p => p.birdies > 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
      <Card id="birdies-total">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Total Birdies</div>
        <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Across all rounds</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={totalData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="player" tick={{ fontSize: 12, fill: G.muted }} width={80} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Birdies" radius={[0,6,6,0]}>
              {totalData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card id="birdies-by-holiday">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Birdies by Holiday</div>
        <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Stacked by player</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={holidayData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: G.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {activePlayers.map((p, i) => (
              <Bar key={p.player} dataKey={p.player} stackId="a" fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ── Award Leaderboards ─────────────────────────────────────────────────────
function AwardLeaderboards({ leaderboard, awards }) {
  const [hoveredDotd, setHoveredDotd] = useState(null)
  const w = useWindowWidth()
  const cols = w < 640 ? '1fr' : w < 1024 ? '1fr 1fr' : 'repeat(3, 1fr)'

  // Build map of player -> all DOTD incidents
  const dotdIncidents = {}
  awards.forEach(h => {
    h.matchdays.forEach(day => {
      if (!day.DOTD) return
      if (!dotdIncidents[day.DOTD]) dotdIncidents[day.DOTD] = []
      dotdIncidents[day.DOTD].push({ area: h.area, course: day.Course, description: day.Description, date: day.Date })
    })
  })

  const assignRanks = (sorted) => {
    let rank = 1
    return sorted.map((p, i) => {
      if (i > 0 && sorted[i - 1]._val !== p._val) rank = i + 1
      return { ...p, _rank: rank }
    })
  }

  const lists = [
    { key: 'chip_ins',      label: 'Most Chip-ins',        sub: 'Total chip-ins scored',        color: G.greenMid,  bg: G.greenLight, border: '#b7e4c7' },
    { key: 'long_drive',    label: 'Most Long Drives',     sub: 'Long drive competition wins',   color: G.blue,      bg: G.blueLight,  border: '#bfdbfe' },
    { key: 'near_pin',      label: 'Most Nearest Pins',    sub: 'Nearest pin competition wins',  color: '#92400e',   bg: G.goldLight,  border: '#f6d860' },
    { key: 'dotd',          label: 'Most DOTDs',           sub: 'Dick of the Day awards',        color: G.red,       bg: G.redLight,   border: '#fca5a5' },
    { key: 'birdies_faced', label: 'Most Birdies Conceded',sub: 'Opponent birdies faced',        color: G.green,     bg: G.greenLight, border: '#b7e4c7' },
    { key: 'chip_ins_faced',label: 'Most Chip-ins Conceded',sub: 'Opponent chip-ins faced',      color: '#92400e',   bg: G.goldLight,  border: '#f6d860' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 20 }}>
      {lists.map(({ key, label, sub, color, bg, border }) => {
        const sorted = [...leaderboard]
          .filter(p => p[key] > 0)
          .sort((a, b) => b[key] - a[key])
          .map(p => ({ ...p, _val: p[key] }))
        const ranked = assignRanks(sorted)
        const isDotd = key === 'dotd'

        return (
          <Card key={key} id={`award-lb-${key}`}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>{sub}</div>
            {ranked.length === 0
              ? <div style={{ fontSize: 13, color: G.muted }}>No data</div>
              : ranked.map((p, i) => (
                <div
                  key={p.player}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 0', borderBottom: i < ranked.length - 1 ? `1px solid ${G.border}` : 'none',
                    position: 'relative',
                  }}
                  onMouseEnter={() => isDotd && setHoveredDotd(p.player)}
                  onMouseLeave={() => isDotd && setHoveredDotd(null)}
                >
                  <RankBadge rank={p._rank} />
                  <div style={{ flex: 1, fontWeight: p._rank === 1 ? 700 : 400, fontSize: 14, color: G.text }}>{p.player}</div>
                  <div style={{
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: 8, padding: '3px 12px',
                    fontWeight: 700, fontSize: 15, color,
                  }}>{p[key]}</div>
                  {isDotd && hoveredDotd === p.player && dotdIncidents[p.player]?.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
                      background: G.card, border: `1px solid ${G.border}`,
                      borderRadius: 10, padding: '10px 14px',
                      boxShadow: shadowHover, zIndex: 30,
                      minWidth: 260, maxWidth: 340,
                      pointerEvents: 'none',
                    }}>
                      {dotdIncidents[p.player].map((inc, j) => (
                        <div key={j} style={{
                          padding: '6px 0',
                          borderBottom: j < dotdIncidents[p.player].length - 1 ? `1px solid ${G.border}` : 'none',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, marginBottom: 2 }}>
                            {inc.area} · {inc.course}
                          </div>
                          {inc.description && (
                            <div style={{ fontSize: 12, color: G.text, fontStyle: 'italic', lineHeight: 1.5 }}>
                              "{inc.description}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            }
          </Card>
        )
      })}
    </div>
  )
}

// ── Green Towels ──────────────────────────────────────────────────────────
function GreenJackets({ greenJackets, holidays }) {
  const [idx, setIdx] = useState(0)

  const groups = Object.entries(
    greenJackets.reduce((acc, r) => {
      if (!acc[r.holiday_id]) acc[r.holiday_id] = []
      acc[r.holiday_id].push(r)
      return acc
    }, {})
  ).map(([hid, rows]) => ({ hid: +hid, rows })).reverse()

  const { hid, rows } = groups[idx]
  const hol  = holidays.find(h => h.holiday_id === hid)
  const year = rows[0]?.date ? new Date(rows[0].date).getFullYear() : ''
  const hasScores = rows.some(r => r.score != null && r.score !== '')

  // Split into ranked, unknown, dns and cup-tied
  const rankedRaw = [...rows].filter(r => !isNaN(+r.rank)).sort((a, b) => +a.rank - +b.rank)
  const unknown   = rows.filter(r => String(r.rank).toLowerCase() === 'unknown')
  const dns       = rows.filter(r => String(r.rank).toLowerCase() === 'dns')
  const cupTied   = rows.filter(r => String(r.rank).toLowerCase().includes('cup'))

  // Compute tied ranks from scores when available, otherwise use stored rank
  const ranked = rankedRaw.map((r, i, arr) => {
    let tiedRank = +r.rank
    if (hasScores && r.score != null) {
      const pos = arr.findIndex(x => x.score != null && +x.score === +r.score)
      tiedRank = pos + 1
    }
    return { ...r, tiedRank }
  })

  const rowStyle = (i, total) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 0', borderBottom: i < total - 1 ? `1px solid ${G.border}` : 'none',
  })

  return (
    <Card id={`gj-${hid}`}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: G.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Green Towel</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
            {hol?.Country} <span style={{ color: G.muted, fontWeight: 400, fontSize: 18 }}>· {hol?.Area}</span>
          </div>
          <div style={{ fontSize: 13, color: G.muted, marginTop: 4 }}>{year}</div>
        </div>
        {/* navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${G.border}`,
              background: idx === 0 ? G.faint : G.card, cursor: idx === 0 ? 'default' : 'pointer',
              color: idx === 0 ? G.border : G.text, fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
          >‹</button>
          <span style={{ fontSize: 12, color: G.muted, minWidth: 36, textAlign: 'center' }}>{idx + 1} / {groups.length}</span>
          <button
            onClick={() => setIdx(i => Math.min(groups.length - 1, i + 1))}
            disabled={idx === groups.length - 1}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${G.border}`,
              background: idx === groups.length - 1 ? G.faint : G.card,
              cursor: idx === groups.length - 1 ? 'default' : 'pointer',
              color: idx === groups.length - 1 ? G.border : G.text, fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
          >›</button>
        </div>
      </div>

      {/* ranked rows */}
      <div>
        {ranked.map((r, i) => (
          <div key={r.player} style={rowStyle(i, ranked.length)}>
            <RankBadge rank={r.tiedRank} />
            <div style={{ flex: 1, fontWeight: r.tiedRank === 1 ? 700 : 400, fontSize: 14, color: G.text }}>{r.player}</div>
            {hasScores && <div style={{ fontWeight: 700, fontSize: 15, color: r.tiedRank === 1 ? G.gold : G.text, minWidth: 32, textAlign: 'right' }}>{r.score ?? '—'}</div>}
          </div>
        ))}

        {/* cup-tied */}
        {cupTied.map(r => (
          <div key={r.player} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: ranked.length > 0 ? `1px solid ${G.border}` : 'none' }}>
            <div style={{ width: 28, height: 28, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 14, color: G.muted }}>{r.player}</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}>Cup-Tied</span>
          </div>
        ))}

        {/* unknowns */}
        {unknown.length > 0 && (
          <div style={{ marginTop: ranked.length > 0 ? 12 : 0, paddingTop: ranked.length > 0 ? 12 : 0, borderTop: ranked.length > 0 ? `1px dashed ${G.border}` : 'none' }}>
            <div style={{ fontSize: 11, color: G.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Position unknown</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unknown.map(r => (
                <span key={r.player} style={{ fontSize: 13, color: G.text, background: G.faint, border: `1px solid ${G.border}`, borderRadius: 99, padding: '3px 10px' }}>{r.player}</span>
              ))}
            </div>
          </div>
        )}

        {/* dns */}
        {dns.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: G.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Did not play</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dns.map(r => (
                <span key={r.player} style={{ fontSize: 13, color: G.muted, background: G.faint, border: `1px solid ${G.border}`, borderRadius: 99, padding: '3px 10px' }}>{r.player}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        {groups.map((_, i) => (
          <div
            key={i}
            onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 20 : 8, height: 8, borderRadius: 99,
              background: i === idx ? G.green : G.border,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </Card>
  )
}

// ── Partnership Stats ──────────────────────────────────────────────────────
function PartnershipStats({ playerMatches, leaderboard }) {
  const [expanded, setExpanded] = useState(false)
  const isMobile = useWindowWidth() < 640
  const [sortBy, setSortBy]     = useState('pts')

  const teamOf = {}
  leaderboard.forEach(p => { teamOf[p.player] = p.team })

  const pairMap = {}
  playerMatches
    .filter(m => m.format !== 'Texas Scramble')
    .forEach(m => {
      (m.partners || []).forEach(partner => {
        if (m.player > partner) return
        const key = `${m.player}|${partner}`
        if (!pairMap[key]) pairMap[key] = { p1: m.player, p2: partner, matches: 0, wins: 0, halves: 0, losses: 0, pts: 0 }
        pairMap[key].matches++
        pairMap[key].pts += m.pts || 0
        const r = String(m.result)
        if (r === 'Win') pairMap[key].wins++
        else if (r === 'Loss') pairMap[key].losses++
        else if (r === 'Halved') pairMap[key].halves++
      })
    })

  const pct = (n, d) => d > 0 ? Math.round(100 * n / d) : 0

  const allPairs = Object.values(pairMap)
    .filter(p => teamOf[p.p1] && teamOf[p.p1] === teamOf[p.p2])
    .filter(p => sortBy === 'win_pct' ? p.matches >= 2 : true)
    .map(p => ({ ...p, team: teamOf[p.p1] }))
    .sort((a, b) => sortBy === 'win_pct'
      ? pct(b.wins, b.matches) - pct(a.wins, a.matches)
      : b.pts - a.pts
    )

  const europe = allPairs.filter(p => p.team === 'Europe')
  const usa    = allPairs.filter(p => p.team === 'USA')
  const LIMIT  = 5

  const SortBtn = ({ id, label }) => (
    <button
      onClick={() => setSortBy(id)}
      style={{
        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', border: `1.5px solid ${sortBy === id ? G.green : G.border}`,
        background: sortBy === id ? G.green : G.faint,
        color: sortBy === id ? '#fff' : G.muted,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  const PairList = ({ pairs, color }) => {
    const shown = expanded ? pairs : pairs.slice(0, LIMIT)
    return (
      <div>
        {pairs.length === 0 && <div style={{ fontSize: 13, color: G.muted }}>No data</div>}
        {shown.map((p, i) => (
          <div key={`${p.p1}-${p.p2}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: i < shown.length - 1 ? `1px solid ${G.border}` : 'none',
            gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: G.text }}>
                {p.p1} &amp; {p.p2}
              </div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                {p.matches} match{p.matches !== 1 ? 'es' : ''}&nbsp;&nbsp;
                W{pct(p.wins, p.matches)}% D{pct(p.halves, p.matches)}% L{pct(p.losses, p.matches)}%
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color }}>{p.pts % 1 === 0 ? p.pts : p.pts.toFixed(1)}</div>
              {sortBy === 'win_pct' && (
                <div style={{ fontSize: 10, color: G.muted }}>{pct(p.wins, p.matches)}% W</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const maxLen = Math.max(europe.length, usa.length)

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: G.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sort by</span>
        <SortBtn id="pts"     label="Points" />
        <SortBtn id="win_pct" label="Win %" />
        {maxLen > LIMIT && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginLeft: 'auto', padding: '4px 14px', borderRadius: 99, fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${G.border}`, background: G.faint, color: G.muted,
              transition: 'all 0.15s',
            }}
          >
            {expanded ? `Show less ▴` : `Show all ▾`}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        {[
          { label: 'Europe Partnerships', pairs: europe, color: G.blue, id: 'partnerships-europe' },
          { label: 'USA Partnerships',    pairs: usa,    color: G.red,  id: 'partnerships-usa'    },
        ].map(({ label, pairs, color, id }) => (
          <Card key={id} id={id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ fontWeight: 700, fontSize: 16 }}>{label}</div>
            </div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 16 }}>
              Head-to-head · {pairs.length} partnership{pairs.length !== 1 ? 's' : ''}
            </div>
            <PairList pairs={pairs} color={color} />
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Biggest Wins ───────────────────────────────────────────────────────────
function BiggestWins({ playerMatches, holidays }) {
  const matchMap = {}
  for (const m of playerMatches) {
    if (m.format === 'Texas Scramble' || m.format === 'Kingpin' || !m.score) continue
    const key = `${m.holiday_id}-${m.match_id}`
    if (!matchMap[key]) {
      matchMap[key] = {
        key, date: m.date, format: m.format, course: m.course,
        holiday_id: m.holiday_id, score: m.score,
        winners: [], losers: [], winnerTeam: null,
      }
    }
    if (m.result === 'Win') {
      matchMap[key].winners.push(m.player)
      matchMap[key].winnerTeam = matchMap[key].winnerTeam || m.team
    } else if (m.result === 'Loss') {
      matchMap[key].losers.push(m.player)
    }
  }

  const parseScore = (s) => {
    const mt = s?.match(/^(\d+)/)
    return mt ? parseInt(mt[1]) : 1
  }

  const isMatchPlayScore = (s) => /^\d+[&U]/.test(s)

  const wins = Object.values(matchMap)
    .filter(m => m.winners.length > 0 && isMatchPlayScore(m.score))
    .sort((a, b) => parseScore(b.score) - parseScore(a.score))

  if (wins.length === 0) return null

  const teamBg     = { Europe: G.blueLight,  USA: G.redLight }
  const teamBorder = { Europe: '#bfdbfe',     USA: '#fca5a5' }
  const teamColor  = { Europe: G.blue,        USA: G.red }

  return (
    <Card id="biggest-wins">
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Biggest Wins</div>
      <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Match play results ranked by margin</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {wins.slice(0, 8).map((w) => {
          const hol  = holidays.find(h => h.holiday_id === w.holiday_id)
          const year = w.date ? new Date(w.date).getFullYear() : ''
          const bg     = teamBg[w.winnerTeam]     || G.faint
          const border = teamBorder[w.winnerTeam] || G.border
          const color  = teamColor[w.winnerTeam]  || G.text
          return (
            <div key={w.key} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26, fontWeight: 800, color,
                lineHeight: 1, flexShrink: 0, minWidth: 56, marginTop: 2,
              }}>{w.score}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.text }}>
                  {w.winners.join(' & ')}
                </div>
                <div style={{ fontSize: 12, color: G.muted, margin: '2px 0' }}>
                  def. {w.losers.join(' & ')}
                </div>
                <div style={{ fontSize: 11, color: G.muted }}>
                  {w.format} · {hol?.Area || ''} {year}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Holiday MVP ────────────────────────────────────────────────────────────
function HolidayMVP({ holidayMvp, leaderboard }) {
  const teamOf = {}
  leaderboard.forEach(p => { teamOf[p.player] = p.team })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {holidayMvp.map((h, i) => {
        const team = teamOf[h.players[0]]
        const color  = team === 'Europe' ? G.blue  : team === 'USA' ? G.red  : G.green
        const bg     = team === 'Europe' ? G.blueLight : team === 'USA' ? G.redLight : G.greenLight
        const border = team === 'Europe' ? '#bfdbfe'   : team === 'USA' ? '#fca5a5'  : '#b7e4c7'
        return (
          <div key={h.holiday_id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '20px 22px', position: 'relative' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              Trip MVP · {h.area}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: G.text, lineHeight: 1.2 }}>
              {h.players.join(' & ')}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color }}>{h.pts}</span>
              <span style={{ fontSize: 12, color, fontWeight: 600 }}>pts</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Player Scatter ─────────────────────────────────────────────────────────
const ScatterDot = (props) => {
  const { cx, cy, payload, showLabel, r: dotR = 9 } = props
  const color = payload?.team === 'Europe' ? G.blue : G.red
  return (
    <g>
      <circle cx={cx} cy={cy} r={dotR} fill={color} stroke="#fff" strokeWidth={2} opacity={0.88} />
      {showLabel !== false && (
        <text
          x={cx} y={cy - 15} textAnchor="middle"
          fontSize={11} fontWeight={600} fill={G.text}
          fontFamily="Inter, sans-serif" style={{ pointerEvents: 'none' }}
        >{payload?.player}</text>
      )}
    </g>
  )
}

function PlayerScatter({ playerMatches, leaderboard }) {
  const isMobile = useWindowWidth() < 640
  const SINGLES_FMTS = new Set(['Singles'])
  const TEAM_FMTS    = new Set(['Fourball', '2x2 Scramble'])
  const scoreOf = r => r === 'Win' ? 1 : r === 'Loss' ? -1 : 0

  const data = leaderboard.map(p => {
    const ms = playerMatches.filter(m => m.player === p.player)
    const sx = ms.filter(m => SINGLES_FMTS.has(m.format)).reduce((s, m) => s + scoreOf(m.result), 0)
    const tx = ms.filter(m => TEAM_FMTS.has(m.format)).reduce((s, m) => s + scoreOf(m.result), 0)
    return { player: p.player, team: p.team, x: sx, y: tx }
  })

  const xs = data.map(d => d.x)
  const ys = data.map(d => d.y)
  const rawMax = Math.max(
    Math.abs(Math.min(...xs)), Math.abs(Math.max(...xs)),
    Math.abs(Math.min(...ys)), Math.abs(Math.max(...ys)),
  )
  const domainMax = rawMax * 1.1
  const tickMax   = Math.ceil(rawMax)
  const axisTicks = Array.from({ length: tickMax * 2 + 1 }, (_, i) => i - tickMax)
  const minX = -domainMax, maxX = domainMax, minY = -domainMax, maxY = domainMax

  const quadrants = [
    { x1: minX, x2: 0, y1: 0,    y2: maxY, label: 'Team Players',      pos: 'insideTopLeft',     fill: 'rgba(201,168,76,0.04)', color: '#92400e' },
    { x1: 0,    x2: maxX, y1: 0, y2: maxY, label: 'All-Rounders',      pos: 'insideTopRight',    fill: 'rgba(27,67,50,0.04)',   color: G.green },
    { x1: minX, x2: 0, y1: minY, y2: 0,    label: 'Good for Nobodies', pos: 'insideBottomLeft',  fill: 'rgba(155,28,28,0.04)',  color: G.red },
    { x1: 0,    x2: maxX, y1: minY, y2: 0, label: 'Mercenaries',       pos: 'insideBottomRight', fill: 'rgba(30,58,95,0.04)',   color: G.blue },
  ]

  return (
    <Card id="player-scatter">
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Singles vs Team Performance</div>
      <div style={{ fontSize: 13, color: G.muted, marginBottom: 20 }}>Win&nbsp;= +1 · Draw&nbsp;= 0 · Loss&nbsp;= −1 &nbsp;·&nbsp; Team = Fourball + Pairs formats</div>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" aspect={1}>
        <ScatterChart margin={{ top: isMobile ? 10 : 36, right: 40, bottom: 48, left: isMobile ? 30 : 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
          <XAxis
            type="number" dataKey="x" name="Singles Points" domain={[minX, maxX]} ticks={axisTicks}
            tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false}
            label={{ value: 'Singles Points', position: 'insideBottom', offset: -28, fill: G.muted, fontSize: 12 }}
          />
          <YAxis
            type="number" dataKey="y" name="Team Points" domain={[minY, maxY]} ticks={axisTicks}
            tick={{ fontSize: 11, fill: G.muted }} axisLine={false} tickLine={false}
            label={{ value: 'Team Points  (Fourball + 2×2)', angle: -90, position: 'insideLeft', offset: 14, fill: G.muted, fontSize: 12 }}
          />
          <ReferenceLine x={0} stroke={G.border} strokeWidth={2} />
          <ReferenceLine y={0} stroke={G.border} strokeWidth={2} />
          {quadrants.map(q => (
            <ReferenceArea
              key={q.label}
              x1={q.x1} x2={q.x2} y1={q.y1} y2={q.y2}
              fill={q.fill}
              label={{ value: q.label, position: q.pos, fill: q.color, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
            />
          ))}
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload
              if (!d) return null
              const teamColor = d.team === 'Europe' ? G.blue : G.red
              return (
                <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: shadow, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: teamColor, marginBottom: 6 }}>{d.player}</div>
                  <div style={{ color: G.muted }}>Singles: <strong style={{ color: G.text }}>{d.x > 0 ? `+${d.x}` : d.x}</strong></div>
                  <div style={{ color: G.muted }}>Team:&nbsp;&nbsp;&nbsp;&nbsp;<strong style={{ color: G.text }}>{d.y > 0 ? `+${d.y}` : d.y}</strong></div>
                </div>
              )
            }}
          />
          <Scatter data={data} shape={<ScatterDot showLabel={!isMobile} r={isMobile ? 5 : 9} />} />
        </ScatterChart>
      </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ── Awards ─────────────────────────────────────────────────────────────────
function Awards({ awards }) {
  const isMobile = useWindowWidth() < 640
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 20 }}>
      {awards.map(h => (
        <Card key={h.holiday_id} id={`awards-${h.holiday_id}`}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{h.country} <span style={{ color: G.muted, fontWeight: 400 }}>·</span> {h.area}</div>
          <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
            <div style={{ flex: 1, background: G.greenLight, borderRadius: 10, padding: '12px 14px', border: `1px solid #b7e4c7` }}>
              <div style={{ fontSize: 10, color: G.greenMid, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Long Drive</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: G.green }}>{h.long_drive || '—'}</div>
            </div>
            <div style={{ flex: 1, background: G.goldLight, borderRadius: 10, padding: '12px 14px', border: `1px solid #f6d860` }}>
              <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Nearest Pin</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: '#92400e' }}>{h.near_pin || '—'}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Dick of the Day
          </div>
          {h.matchdays.map((day, i) => (
            <div key={i} style={{
              padding: '10px 12px', marginBottom: 6, borderRadius: 10,
              background: G.faint, border: `1px solid ${G.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.Description ? 4 : 0 }}>
                <span style={{ fontSize: 12, color: G.muted, fontWeight: 500 }}>{day.Course}</span>
                <Badge color={G.red} bg={G.redLight}>{day.DOTD}</Badge>
              </div>
              {day.Description && (
                <div style={{ fontSize: 12, color: G.text, fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{day.Description}"
                </div>
              )}
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}


// ── Form Guide ─────────────────────────────────────────────────────────────
const SCRAMBLE_COLOR = {
  pos1: { bg: '#fef3c7', border: '#fbbf24', color: '#92400e', label: '1st' },
  pos2: { bg: '#f3f4f6', border: '#9ca3af', color: '#374151', label: '2nd' },
  pos3: { bg: '#fef2e8', border: '#d97706', color: '#7c2d12', label: '3rd' },
  pos4: { bg: G.redLight, border: '#fca5a5', color: G.red,   label: '4th' },
}

function FormDot({ match, isHovered, onEnter, onLeave, teamOf = {} }) {
  const isScramble = match.format === 'Texas Scramble'
  let bg, border, color, label

  if (isScramble) {
    const s = SCRAMBLE_COLOR[match.result] || SCRAMBLE_COLOR.pos4
    bg = s.bg; border = s.border; color = s.color; label = s.label
  } else if (match.result === 'Win') {
    bg = G.greenLight; border = '#6ee7b7'; color = G.green; label = 'W'
  } else if (match.result === 'Loss') {
    bg = G.redLight; border = '#fca5a5'; color = G.red; label = 'L'
  } else {
    bg = '#fef3c7'; border = '#fbbf24'; color = '#92400e'; label = 'H'
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: bg, border: `1.5px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color,
        cursor: 'default', transition: 'transform 0.1s',
        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
      }}>{label}</div>
      {isHovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          background: G.card, border: `1px solid ${G.border}`,
          borderRadius: 8, padding: '8px 12px',
          boxShadow: shadow, zIndex: 30,
          whiteSpace: 'nowrap', pointerEvents: 'none', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: G.text, marginBottom: 4 }}>
            {match.format}
            {match.score && <span style={{ marginLeft: 6, color, fontWeight: 700 }}>{match.score}</span>}
          </div>
          <div style={{ color: G.muted, marginBottom: 2 }}>{match.course} · {match.date?.slice(0, 10)}</div>
          {match.partners?.length > 0 && (
            <div style={{ marginTop: 3 }}>
              <span style={{ color: G.muted }}>With: </span>
              {match.partners.map((p, i) => (
                <span key={p} style={{ color: teamOf[p] === 'Europe' ? '#3b82f6' : teamOf[p] === 'USA' ? G.red : G.text, fontWeight: 600 }}>
                  {p}{i < match.partners.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
          {match.opponents?.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <span style={{ color: G.muted }}>vs: </span>
              {match.opponents.map((p, i) => (
                <span key={p} style={{ color: teamOf[p] === 'Europe' ? '#3b82f6' : teamOf[p] === 'USA' ? G.red : G.text, fontWeight: 600 }}>
                  {p}{i < match.opponents.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Password Gate ──────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [value, setValue]   = useState('')
  const [error, setError]   = useState(false)
  const [shake, setShake]   = useState(false)

  const attempt = () => {
    const correct = import.meta.env.VITE_APP_PASSWORD
    if (!correct || value === correct) {
      sessionStorage.setItem('rhc_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${G.green} 0%, #0f2b1e 100%)`,
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 360,
        textAlign: 'center',
        transform: shake ? 'translateX(0)' : undefined,
        animation: shake ? 'shake 0.4s ease' : undefined,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          The Annual Golf Holiday
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>
          Ride Her Cup
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: G.gold, marginBottom: 36 }}>
          Statistics
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', borderRadius: 10, fontSize: 15,
            background: 'rgba(255,255,255,0.1)',
            border: `1.5px solid ${error ? '#fca5a5' : 'rgba(255,255,255,0.2)'}`,
            color: '#fff', outline: 'none', marginBottom: 12,
          }}
        />
        {error && (
          <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 12 }}>Incorrect password</div>
        )}
        <button
          onClick={attempt}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 15,
            fontWeight: 700, cursor: 'pointer', border: 'none',
            background: G.gold, color: G.green, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Enter
        </button>
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }`}</style>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]         = useState(null)
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem('rhc_unlocked'))
  const isMobile = useWindowWidth() < 640

  useEffect(() => {
    fetch('/data/golf.json').then(r => r.json()).then(setData)
  }, [])

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: G.muted, fontSize: 16 }}>
      Loading…
    </div>
  )

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '40px 28px 80px' }}>
      <FloatingNav />
      <Hero data={data} />

      <SectionTitle id="sec-leaderboard">Overall Leaderboard</SectionTitle>
      <Leaderboard data={data.leaderboard} playerMatches={data.player_matches} players={data.players} />

      <SectionTitle id="sec-rivalry">Europe vs USA Rivalry</SectionTitle>
      <RivalryChart rivalry={data.rivalry} rivalryByDay={data.rivalry_by_day} rivalryByFormat={data.rivalry_by_format} holidays={data.holidays} />

      <SectionTitle id="sec-spotlight">Player Spotlight</SectionTitle>
      <PlayerSpotlight leaderboard={data.leaderboard} playerMatches={data.player_matches} pairStats={data.pair_stats} vsStats={data.vs_stats} players={data.players} />

      <SectionTitle id="sec-profile">Player Profile & Green Towel</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <PlayerScatter playerMatches={data.player_matches} leaderboard={data.leaderboard} />
        <GreenJackets greenJackets={data.green_jackets} holidays={data.holidays} />
      </div>

      <SectionTitle id="sec-partnerships">Best Partnerships</SectionTitle>
      <PartnershipStats playerMatches={data.player_matches} leaderboard={data.leaderboard} />

      <SectionTitle id="sec-wins">Biggest Wins</SectionTitle>
      <BiggestWins playerMatches={data.player_matches} holidays={data.holidays} />

      <SectionTitle id="sec-birdies">Birdies</SectionTitle>
      <BirdiesChart leaderboard={data.leaderboard} birdieByHoliday={data.birdie_by_holiday} holidays={data.holidays} />

      <SectionTitle id="sec-awards">Award Leaderboards</SectionTitle>
      <AwardLeaderboards leaderboard={data.leaderboard} awards={data.awards} />

      <SectionTitle id="sec-dotd">Holiday Awards & Dick of the Day</SectionTitle>
      <Awards awards={data.awards} />

      <div style={{
        marginTop: 60, paddingTop: 24, borderTop: `1px solid ${G.border}`,
        fontSize: 12, color: G.muted, textAlign: 'center', letterSpacing: 0.3,
      }}>
        Each card has an ⬇ Export button to save as a PNG for printing.
      </div>
    </div>
  )
}
