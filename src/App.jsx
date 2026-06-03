import React, { useState, useRef, useCallback, useLayoutEffect } from 'react'

// ─── X（ポスト）共有設定 ─────────────────────────────────
//   投稿文に URL を含めたくなったら SHARE_URL に設定（空文字なら URL 行は出ない）
const SHARE_URL  = ''                        // ← URLを入れたい場合のみ設定
const SHARE_HASH = '#FF14 #CCキャラカード'    // ← ハッシュタグ
const SHARE_NOUN = 'CCキャラカード'           // ← 「○○を作りました！」の○○

const JOB_LIST = {
  タンク: ['ナイト', '戦士', '暗黒騎士', 'ガンブレイカー'],
  ヒーラー: ['白魔道士', '学者', '占星術師', '賢者'],
  近接DPS: ['モンク', '竜騎士', '忍者', '侍', 'リーパー', 'ヴァイパー'],
  遠隔DPS: ['吟遊詩人', '機工士', '踊り子'],
  魔法DPS: ['黒魔道士', '召喚士', '赤魔道士', 'ピクトマンサー'],
}
const ALL_JOBS = Object.values(JOB_LIST).flat()
const PLAYSTYLE_LIST = ['ターゲッター', 'サポート重視', '火力重視', 'オールラウンダー', 'クリスタルを運びます！', '粘り型']
const SNS_LIST = ['X', 'YouTube', 'Twitch']
const RANK_LIST = ['アルテマ', 'オメガ', 'クリスタル', 'ダイヤモンド', 'プラチナ', 'ゴールド', 'シルバー', 'ブロンズ']
const RANK_CONFIG = {
  アルテマ:    { icon: '🌟', fill: '#bd3636', top: '#d44f4f', right: '#982626', left: '#7c1d1d', stroke: '#e88282' },
  オメガ:      { icon: '⚡', fill: '#a05aa0', top: '#b873b8', right: '#7e468e', left: '#683a74', stroke: '#cf9ccf' },
  クリスタル:  { icon: '💎', fill: '#5a96b5', top: '#78b0c8', right: '#467a96', left: '#3a657d', stroke: '#a0c4d6' },
  ダイヤモンド:{ icon: '🔷', fill: '#7e96a8', top: '#9fb6c4', right: '#5e7689', left: '#4a6072', stroke: '#bcccd6' },
  プラチナ:    { icon: '🩶', fill: '#98a6b0', top: '#b8c4cc', right: '#7a8893', left: '#67737d', stroke: '#d2dce2' },
  ゴールド:    { icon: '🥇', fill: '#c79e4a', top: '#dcbb6e', right: '#a17f30', left: '#856825', stroke: '#e6cd8e' },
  シルバー:    { icon: '🥈', fill: '#b5b0a4', top: '#cecabd', right: '#928d82', left: '#7c776d', stroke: '#dcd8cd' },
  ブロンズ:    { icon: '🥉', fill: '#b07a4e', top: '#c2956c', right: '#8e5f33', left: '#744d29', stroke: '#d2a87e' },
}

// ランクのダイヤ型アイコン（案B：ダイヤ全体をランク色で塗り分け）
// size を指定すると正方形のSVGを返す。DOMプレビュー・フォームの両方で使用。
function RankDiamond({ rank, size = 28 }) {
  const c = RANK_CONFIG[rank]
  if (!c) return null
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }} aria-label={rank}>
      <polygon points="24,4 44,20 24,44 4,20" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
      <polygon points="24,9 38,20 24,21 10,20" fill={c.top} />
      <polygon points="24,21 38,20 24,39" fill={c.right} />
      <polygon points="24,21 10,20 24,39" fill={c.left} />
    </svg>
  )
}
const DC_SERVERS = {
  Mana:      ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandemonium', 'Titan'],
  Gaia:      ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Meteor:    ['Berias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
}
const emptyPlayer = {
  firstName: '', lastName: '', nickname: '', server: '',
  mainJob: '', subJobs: [], highestRank: '', playstyle: [],
  team: '', screenshotDataUrl: '', freeText: '', sns: [],
  showLogo: true,    // 陣営ロゴ（ASTRA/UMBRA）の表示ON/OFF
}

// カード寸法の基準（4:5 / Xタイムライン最適）
// 論理サイズ CARD_W×CARD_H を表示に使い、出力はscaleで高解像度化
const CARD_W = 432          // 論理幅
const CARD_H = 540          // 論理高さ（4:5）
const CARD_SCALE = 2.5      // 出力 = 1080×1350
const SS_HEIGHT = 180       // スクショエリア高さ（4:5・情報エリアにゆとり）


// ─── 陣営カラー（CCチームカードの ASTRA / UMBRA を踏襲）──────────
//   ASTRA = 白基調 × 青文字 / UMBRA = 黒基調 × 赤文字
const ASTRA_COLOR = '#1c7fc4'   // accent（青）
const UMBRA_COLOR = '#e5352a'   // accent（赤・公式UMBRAバー準拠の鮮やかな朱赤）

// テーマキーは 'umbra'（ダーク相当）/ 'astra'（ライト相当）の2系統。
//   ThemeToggle では UMBRA→ASTRA の順で並べる（ダーク/シンプルのボタン枠を踏襲）。
const THEME = {
  // ── UMBRA：黒基調 × 赤文字（旧 dark 相当）──
  umbra: {
    faction: 'UMBRA', factionJp: 'ウンブラ', light: false,
    // 背景：公式バー準拠の深紅をより黒に寄せて引き締める
    cardBg: '#080303', pageBg: '#030101',
    label: 'rgba(255,110,100,0.5)', value: 'rgba(255,234,232,0.88)',
    activeTag: UMBRA_COLOR, activeTagMainText: '#080303',
    inactiveTagBg: 'rgba(255,255,255,0.05)', inactiveTagBorder: 'rgba(229,53,42,0.24)',
    inactiveTagText: 'rgba(255,196,190,0.5)',
    border: 'rgba(229,53,42,0.26)', sectionBg: 'rgba(229,53,42,0.07)',
    inputBg: 'rgba(255,255,255,0.06)', inputBorder: 'rgba(229,53,42,0.3)',
    inputText: 'rgba(255,234,232,0.9)', buttonBg: UMBRA_COLOR, buttonText: '#080303',
    accentColor: UMBRA_COLOR,
    rankBadgeBg: 'rgba(8,2,2,0.8)',
    playerNameColor: '#fef0ee',
    noteBg: 'rgba(229,53,42,0.06)', noteBorder: 'rgba(229,53,42,0.22)',
    selectBg: 'rgba(255,255,255,0.06)', selectBorder: 'rgba(229,53,42,0.3)',
    selectText: 'rgba(255,234,232,0.88)', selectHover: 'rgba(229,53,42,0.15)',
    selectActive: 'rgba(229,53,42,0.26)', dropdownBg: '#160606',
    dropdownBorder: 'rgba(229,53,42,0.34)', groupLabel: 'rgba(255,110,100,0.58)',
    deleteBg: 'rgba(255,70,70,0.14)', deleteBorder: 'rgba(255,70,70,0.42)', deleteText: '#ff8a82',
    themeBtnActiveBg: 'rgba(229,53,42,0.24)', themeBtnInactiveBg: 'transparent',
    themeBtnActiveText: '#ff6e64', themeBtnInactiveText: 'rgba(255,255,255,0.35)',
    themeBtnBorder: 'rgba(229,53,42,0.3)',
    // ヘッダーの陣営ロゴ表記用
    logoColor: UMBRA_COLOR, headerSub: 'rgba(255,110,100,0.62)',
  },
  // ── ASTRA：白基調 × 青文字（旧 simple / light 相当）──
  astra: {
    faction: 'ASTRA', factionJp: 'アストラ', light: true,
    cardBg: '#f4f8fc', pageBg: '#e7eef5',
    label: 'rgba(28,90,140,0.42)', value: '#103a5c',
    activeTag: ASTRA_COLOR, activeTagMainText: '#ffffff',
    inactiveTagBg: 'rgba(28,127,196,0.05)', inactiveTagBorder: 'rgba(28,127,196,0.2)',
    inactiveTagText: 'rgba(28,90,140,0.42)',
    border: 'rgba(28,127,196,0.22)', sectionBg: 'rgba(255,255,255,0.7)',
    inputBg: 'rgba(255,255,255,0.92)', inputBorder: 'rgba(28,127,196,0.24)',
    inputText: '#103a5c', buttonBg: ASTRA_COLOR, buttonText: '#ffffff',
    accentColor: ASTRA_COLOR,
    rankBadgeBg: 'rgba(255,255,255,0.94)',
    playerNameColor: '#103a5c',
    noteBg: 'rgba(255,255,255,0.85)', noteBorder: 'rgba(28,127,196,0.18)',
    selectBg: 'rgba(255,255,255,0.92)', selectBorder: 'rgba(28,127,196,0.24)',
    selectText: '#103a5c', selectHover: 'rgba(28,127,196,0.1)',
    selectActive: 'rgba(28,127,196,0.18)', dropdownBg: '#f3f9fe',
    dropdownBorder: 'rgba(28,127,196,0.3)', groupLabel: 'rgba(28,127,196,0.6)',
    deleteBg: 'rgba(220,50,50,0.07)', deleteBorder: 'rgba(220,50,50,0.25)', deleteText: '#cc4444',
    themeBtnActiveBg: 'rgba(28,127,196,0.16)', themeBtnInactiveBg: 'transparent',
    themeBtnActiveText: '#1c7fc4', themeBtnInactiveText: 'rgba(0,0,0,0.32)',
    themeBtnBorder: 'rgba(28,127,196,0.24)',
    logoColor: ASTRA_COLOR, headerSub: 'rgba(28,90,140,0.6)',
  },
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Saira+Condensed:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Oswald', 'Noto Sans JP', sans-serif; }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes dropDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    input, textarea { font-family: 'Noto Sans JP', sans-serif; }
  `}</style>
)

function ThemeToggle({ theme, onToggle }) {
  const t = THEME[theme]
  return (
    <div style={{
      display: 'flex', background: t.inactiveTagBg,
      border: `1px solid ${t.themeBtnBorder}`, borderRadius: '24px', padding: '3px', gap: '2px',
    }}>
      {[
        { key: 'umbra', label: 'UMBRA' },
        { key: 'astra', label: 'ASTRA' },
      ].map(({ key, label }) => (
        <button key={key} onClick={() => onToggle(key)} style={{
          padding: '5px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
          fontSize: '12px', fontFamily: "'Oswald',sans-serif", fontWeight: 600, letterSpacing: '0.08em', whiteSpace: 'nowrap',
          background: theme === key ? t.themeBtnActiveBg : t.themeBtnInactiveBg,
          color: theme === key ? t.themeBtnActiveText : t.themeBtnInactiveText,
          transition: 'all 0.2s ease',
        }}>{label}</button>
      ))}
    </div>
  )
}

function CustomSelect({ value, onChange, options, placeholder, theme }) {
  const t = THEME[theme]
  const [open, setOpen] = useState(false)
  const ref = useRef()

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler)
    }
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const selectedLabel = (() => {
    for (const g of options) {
      if (g.items) { const f = g.items.find(i => i.value === value); if (f) return f.label }
      else if (g.value === value) return g.label
    }
    return null
  })()

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: t.selectBg, border: `1px solid ${open ? t.accentColor + '88' : t.selectBorder}`,
        borderRadius: '8px', padding: '9px 36px 9px 12px', color: selectedLabel ? t.selectText : t.label,
        fontSize: '14px', fontFamily: "'Noto Sans JP',sans-serif", cursor: 'pointer',
        display: 'flex', alignItems: 'center', transition: 'border-color 0.15s', position: 'relative',
      }}>
        <span style={{ flex: 1, textAlign: 'left' }}>{selectedLabel || placeholder}</span>
        <span style={{
          position: 'absolute', right: '12px', color: t.accentColor, fontSize: '11px',
          transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.2s',
        }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: t.dropdownBg, border: `1px solid ${t.dropdownBorder}`,
          borderRadius: '10px', animation: 'dropDown 0.15s ease',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxHeight: '260px', overflowY: 'auto',
        }}>
          {options.map((g, gi) => g.items ? (
            <div key={gi}>
              <div style={{ padding: '5px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: t.groupLabel, textTransform: 'uppercase', fontFamily: "'Oswald',sans-serif", textAlign: 'left' }}>
                {g.label}
              </div>
              {g.items.map((item, ii) => {
                const active = item.value === value
                return (
                  <div key={ii} onClick={() => { onChange(item.value); setOpen(false) }}
                    style={{ padding: '5px 12px 5px 16px', fontSize: '13px', fontFamily: "'Noto Sans JP',sans-serif", cursor: 'pointer', background: active ? t.selectActive : 'transparent', color: active ? t.accentColor : t.selectText, fontWeight: active ? 600 : 400, textAlign: 'left' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.selectHover }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >{active ? '✓ ' : ''}{item.label}</div>
                )
              })}
            </div>
          ) : (
            <div key={gi} onClick={() => { onChange(g.value); setOpen(false) }}
              style={{ padding: '9px 14px', fontSize: '13px', fontFamily: "'Noto Sans JP',sans-serif", cursor: 'pointer', background: g.value === value ? t.selectActive : 'transparent', color: g.value === value ? t.accentColor : t.selectText, textAlign: 'left' }}
              onMouseEnter={e => { if (g.value !== value) e.currentTarget.style.background = t.selectHover }}
              onMouseLeave={e => { if (g.value !== value) e.currentTarget.style.background = 'transparent' }}
            >{g.value === value ? '✓ ' : ''}{g.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children, theme }) {
  const t = THEME[theme]
  return (
    <div style={{
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em',
      color: t.label, textTransform: 'uppercase', marginBottom: '8px',
      textAlign: 'left', fontFamily: "'Oswald',sans-serif",
    }}>{children}</div>
  )
}

function PlayerCard({ player, theme, cardRef }) {
  const t = THEME[theme]
  const rank = player.highestRank === '__none__' ? '' : player.highestRank
  const ac = t.accentColor

  const sectionLabel = {
    fontFamily: "'Oswald',sans-serif", fontSize: '11px', fontWeight: 600,
    letterSpacing: '0.15em', color: t.label, textTransform: 'uppercase',
    marginBottom: '2px', textAlign: 'left',
  }
  const tagBase = {
    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: '20px',
    fontSize: '9px', fontWeight: 500, fontFamily: "'Noto Sans JP',sans-serif",
    border: '1px solid', margin: '2px', whiteSpace: 'nowrap', minWidth: '34px', justifyContent: 'center',
  }
  const activeTag   = { ...tagBase, background: ac + '22', borderColor: ac + '88', color: ac }
  const inactiveTag = { ...tagBase, background: t.inactiveTagBg, borderColor: t.inactiveTagBorder, color: t.inactiveTagText }
  const mainTag     = { ...tagBase, background: ac + '55', borderColor: ac, color: t.light ? ac : '#fff', fontWeight: 700 }

  return (
    <div ref={cardRef} style={{
      width: `${CARD_W}px`, height: `${CARD_H}px`, background: t.cardBg, position: 'relative',
      overflow: 'hidden', flexShrink: 0, animation: 'fadeUp 0.5s ease',
      fontFamily: "'Oswald','Noto Sans JP',sans-serif",
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px', zIndex: 10,
        background: `linear-gradient(90deg, transparent, ${ac}, ${ac}bb, ${ac}, transparent)`,
        backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite',
      }} />

      {/* スクショ（画像は必須。未設定時は背景色のみのフォールバック） */}
      <div style={{ position: 'relative', height: `${SS_HEIGHT}px`, overflow: 'hidden' }}>
        {player.screenshotDataUrl ? (
          <img data-screenshot src={player.screenshotDataUrl} alt="ss"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: t.cardBg }} />
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', pointerEvents: 'none',
          background: `linear-gradient(to top, ${t.cardBg} 0%, ${t.cardBg}cc 30%, transparent 100%)`,
        }} />

        {/* 上部ヘッダー：陣営ロゴ（左）のみ */}
        {player.showLogo && (
          <div style={{
            position: 'absolute', top: '12px', left: '16px', pointerEvents: 'none',
            fontSize: '20px', fontWeight: 700, letterSpacing: '0.04em',
            color: t.logoColor, fontFamily: "'Oswald',sans-serif", opacity: 0.5, lineHeight: 1,
          }}>{t.faction}</div>
        )}

        <div style={{ position: 'absolute', bottom: '12px', left: '18px', right: '20px', textAlign: 'left' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: t.accentColor, fontWeight: 500, marginBottom: '1px', textTransform: 'uppercase', fontFamily: "'Oswald',sans-serif" }}>Crystal Conflict Player</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: t.playerNameColor, lineHeight: 1.0, fontFamily: "'Oswald',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.firstName || 'First'} {player.lastName || 'Last'}
          </div>
          {player.nickname && <div style={{ fontSize: '13px', color: t.value, marginTop: '1px', fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.nickname}</div>}
        </div>
        {rank && (
          <div style={{
            position: 'absolute', top: '14px', right: '14px', background: t.rankBadgeBg,
            border: `1px solid ${ac}66`, borderRadius: '10px', padding: '6px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '56px',
          }}>
            <RankDiamond rank={rank} size={22} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: ac, letterSpacing: '0.05em', fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: 'nowrap' }}>{rank}</span>
          </div>
        )}
      </div>

      {/* 情報エリア */}
      <div style={{ height: `${CARD_H - SS_HEIGHT}px`, padding: '8px 16px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ background: t.sectionBg, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '0' }}>
          {[{ label: 'SERVER', value: player.server || '—' }, { label: 'TEAM', value: player.team || '—' }].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, borderLeft: i === 1 ? `1px solid ${t.border}` : 'none', paddingLeft: i === 1 ? '12px' : '0', marginLeft: i === 1 ? '12px' : '0', textAlign: 'left' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', color: t.label, textTransform: 'uppercase', fontFamily: "'Oswald',sans-serif", marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: t.value, fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={sectionLabel}>Jobs</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-2px' }}>
            {ALL_JOBS.map(job => {
              const isMain = job === player.mainJob
              const isSub = player.subJobs.includes(job)
              return <span key={job} style={isMain ? mainTag : isSub ? activeTag : inactiveTag}>{isMain ? '★ ' : ''}{job}</span>
            })}
          </div>
        </div>
        <div>
          <div style={sectionLabel}>Play Style</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-2px' }}>
            {PLAYSTYLE_LIST.map(ps => <span key={ps} style={player.playstyle.includes(ps) ? activeTag : inactiveTag}>{ps}</span>)}
          </div>
        </div>
        <div>
          <div style={sectionLabel}>Note</div>
          <div style={{
            background: t.noteBg, border: `1px solid ${t.noteBorder}`, borderRadius: '8px',
            padding: '6px 10px', fontSize: '11px', color: player.freeText ? t.value : t.label,
            fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.5, height: '58px', overflow: 'hidden', textAlign: 'left',
          }}>{player.freeText || ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {SNS_LIST.map(s => {
            const snsTag = { ...(player.sns.includes(s) ? activeTag : inactiveTag), padding: '1px 6px', fontSize: '9px' }
            return <span key={s} style={snsTag}>{s}</span>
          })}
        </div>
        <div style={{ marginTop: '4px', borderTop: `1px solid ${t.border}`, paddingTop: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: ac, textTransform: 'uppercase' }}>CC Player Card</div>
          <div style={{ fontSize: '9px', color: t.label, marginTop: '1px', letterSpacing: '0.05em', lineHeight: 1.5 }}>
            FINAL FANTASY XIV<br />© SQUARE ENIX
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerForm({ onSubmit, theme, onToggleTheme, initialData }) {
  const t = THEME[theme]
  const [form, setForm] = useState(() => {
    const d = { ...initialData }
    if (d.mainJob && Array.isArray(d.subJobs)) {
      d.subJobs = d.subJobs.filter(j => j !== d.mainJob)
    }
    return d
  })
  const fileRef = useRef()
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const toggleArr = (key, val) => setForm(f => {
    const arr = f[key]
    return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
  })
  // メインジョブ設定時：そのジョブが使用ジョブに含まれていたら除外
  const setMainJob = (val) => setForm(f => ({
    ...f, mainJob: val, subJobs: f.subJobs.filter(j => j !== val),
  }))
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => set('screenshotDataUrl', ev.target.result)
    reader.readAsDataURL(file)
  }

  const inputStyle = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: '8px', padding: '9px 12px', color: t.inputText,
    fontSize: '14px', fontFamily: "'Noto Sans JP',sans-serif", outline: 'none',
  }
  const tagBtn = (active) => ({
    display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: '20px',
    fontSize: '13px', fontWeight: 500, fontFamily: "'Noto Sans JP',sans-serif",
    border: `1px solid ${active ? t.activeTag + '88' : t.inactiveTagBorder}`,
    background: active ? t.activeTag + '22' : t.inactiveTagBg,
    color: active ? t.activeTag : t.inactiveTagText,
    cursor: 'pointer', margin: '3px', transition: 'all 0.15s ease',
  })

  const serverOptions = Object.entries(DC_SERVERS).map(([dc, servers]) => ({
    label: dc, items: servers.map(s => ({ label: `${s} (${dc})`, value: `${s} (${dc})` }))
  }))
  const jobOptions = Object.entries(JOB_LIST).map(([role, jobs]) => ({
    label: role, items: jobs.map(j => ({ label: j, value: j }))
  }))
  const rankOptions = [
    ...RANK_LIST.map(r => ({
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          <RankDiamond rank={r} size={16} />{r}
        </span>
      ),
      value: r,
    })),
    { label: 'ランク非表示', value: '__none__' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, padding: '24px 16px 40px', color: t.value }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: t.label, textTransform: 'uppercase', marginBottom: '2px' }}>CC Player Card</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: t.value, fontFamily: "'Noto Sans JP',sans-serif" }}>プロフィール編集</div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 表示オプション：陣営ロゴ表示 */}
          <div onClick={() => set('showLogo', !form.showLogo)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px', borderRadius: '8px', cursor: 'pointer',
            border: `1px solid ${form.showLogo ? t.accentColor : t.inputBorder}`,
            background: form.showLogo ? t.accentColor + '15' : 'transparent', transition: 'all 0.15s ease',
          }}>
            <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: '13px', color: t.value }}>
              陣営ロゴを表示<span style={{ color: t.label, fontSize: '11px' }}>（{t.faction}）</span>
            </span>
            <span style={{ position: 'relative', width: '40px', height: '22px', borderRadius: '11px', background: form.showLogo ? t.accentColor : t.inputBorder, transition: 'background 0.15s ease', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: '2px', left: form.showLogo ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease' }} />
            </span>
          </div>

          {/* 名前 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <SectionLabel theme={theme}>ファーストネーム</SectionLabel>
              <input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First Name" />
            </div>
            <div>
              <SectionLabel theme={theme}>ラストネーム</SectionLabel>
              <input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last Name" />
            </div>
          </div>

          {/* 呼び名 */}
          <div>
            <SectionLabel theme={theme}>呼び名</SectionLabel>
            <input style={inputStyle} value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="" />
          </div>

          {/* サーバー */}
          <div>
            <SectionLabel theme={theme}>サーバー</SectionLabel>
            <CustomSelect value={form.server} onChange={v => set('server', v)} options={serverOptions} placeholder="選択してください" theme={theme} />
          </div>

          {/* 最高ランク */}
          <div>
            <SectionLabel theme={theme}>最高ランク</SectionLabel>
            <CustomSelect value={form.highestRank} onChange={v => set('highestRank', v)} options={rankOptions} placeholder="選択してください" theme={theme} />
          </div>

          {/* メインジョブ */}
          <div>
            <SectionLabel theme={theme}>メインジョブ</SectionLabel>
            <CustomSelect value={form.mainJob} onChange={v => setMainJob(v)} options={jobOptions} placeholder="選択" theme={theme} />
          </div>

          {/* 使用ジョブ */}
          <div>
            <SectionLabel theme={theme}>使用ジョブ（複数選択可）</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-3px' }}>
              {ALL_JOBS.filter(j => j !== form.mainJob).map(j => (
                <button key={j} onClick={() => toggleArr('subJobs', j)} style={tagBtn(form.subJobs.includes(j))}>{j}</button>
              ))}
            </div>
          </div>

          {/* プレイスタイル */}
          <div>
            <SectionLabel theme={theme}>プレイスタイル</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-3px' }}>
              {PLAYSTYLE_LIST.map(ps => (
                <button key={ps} onClick={() => toggleArr('playstyle', ps)} style={tagBtn(form.playstyle.includes(ps))}>{ps}</button>
              ))}
            </div>
          </div>

          {/* チーム */}
          <div>
            <SectionLabel theme={theme}>チーム</SectionLabel>
            <input style={inputStyle} value={form.team} onChange={e => set('team', e.target.value)} placeholder="チーム名（任意）" />
          </div>

          {/* スクショ */}
          <div>
            <SectionLabel theme={theme}>スクリーンショット画像（必須）</SectionLabel>
            <div style={{
              background: t.accentColor + '12', border: `1px solid ${t.accentColor}40`,
              borderRadius: '8px', padding: '8px 12px', marginBottom: '8px',
              fontSize: '12px', color: t.value, fontFamily: "'Noto Sans JP',sans-serif",
              display: 'flex', alignItems: 'flex-start', gap: '8px',
            }}>
              <span style={{ flexShrink: 0 }}>📐</span>
              <span style={{ lineHeight: 1.6, textAlign: 'left', flex: 1 }}>
                推奨サイズ：<span style={{ whiteSpace: 'nowrap' }}>横幅1280px以上</span>・<span style={{ whiteSpace: 'nowrap' }}>横長（4:3〜16:9）</span><br />
                形式：<span style={{ whiteSpace: 'nowrap' }}>JPG / PNG</span>
              </span>
            </div>
            {form.screenshotDataUrl ? (
              <div>
                {/* カードと同じ比率でプレビュー */}
                <div style={{
                  width: '100%', aspectRatio: `${CARD_W} / ${SS_HEIGHT}`, borderRadius: '10px',
                  overflow: 'hidden', marginBottom: '8px', border: `1px solid ${t.border}`,
                }}>
                  <img src={form.screenshotDataUrl} alt="preview" style={{
                    width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block',
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => fileRef.current.click()} style={{
                    padding: '10px', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                    borderRadius: '8px', color: t.value, fontSize: '13px', cursor: 'pointer',
                    fontFamily: "'Noto Sans JP',sans-serif",
                  }}>画像を変更</button>
                  <button onClick={() => set('screenshotDataUrl', '')} style={{
                    padding: '10px', background: t.deleteBg, border: `1px solid ${t.deleteBorder}`,
                    borderRadius: '8px', color: t.deleteText, fontSize: '13px', cursor: 'pointer',
                    fontFamily: "'Noto Sans JP',sans-serif",
                  }}>削除</button>
                </div>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} style={{
                border: `2px dashed ${t.inactiveTagBorder}`, borderRadius: '10px',
                padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '32px' }}>🖼️</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: t.value, fontFamily: "'Noto Sans JP',sans-serif" }}>クリックしてスクショを選択</span>
                <span style={{ fontSize: '11px', color: t.accentColor, fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.5 }}>横向きのスクショを入れると映えます ✨</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {/* NOTE */}
          <div>
            <SectionLabel theme={theme}>NOTE（大会履歴・活動内容・一言など）</SectionLabel>
            <textarea
              style={{ ...inputStyle, height: '92px', resize: 'none', lineHeight: 1.7 }}
              value={form.freeText}
              onChange={e => set('freeText', e.target.value.slice(0, 120))}
              placeholder={'例）くりこん杯 3位\n週末メインでプレイ中\n気軽に絡んでください！'}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: t.label, marginTop: '2px' }}>{form.freeText.length} / 120</div>
          </div>

          {/* SNS */}
          <div>
            <SectionLabel theme={theme}>SNS</SectionLabel>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SNS_LIST.map(s => (
                <button key={s} onClick={() => toggleArr('sns', s)} style={tagBtn(form.sns.includes(s))}>{s}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { if (form.screenshotDataUrl) onSubmit(form) }}
            disabled={!form.screenshotDataUrl}
            style={{
            width: '100%', padding: '14px',
            background: form.screenshotDataUrl ? t.buttonBg : t.inactiveTagBg,
            color: form.screenshotDataUrl ? t.buttonText : t.label,
            border: form.screenshotDataUrl ? 'none' : `1px solid ${t.inactiveTagBorder}`,
            borderRadius: '10px', fontSize: '16px', fontWeight: 700,
            fontFamily: "'Oswald',sans-serif", letterSpacing: '0.08em',
            cursor: form.screenshotDataUrl ? 'pointer' : 'not-allowed', marginTop: '4px',
          }}>カードを表示 →</button>
          {!form.screenshotDataUrl && (
            <div style={{ textAlign: 'center', fontSize: '11px', color: t.accentColor, fontFamily: "'Noto Sans JP',sans-serif", paddingTop: '6px' }}>
              スクリーンショット画像を選択するとカードを表示できます
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: '11px', color: t.label, paddingTop: '4px', lineHeight: 1.6 }}>
            FINAL FANTASY XIV<br />© SQUARE ENIX
          </div>
        </div>
      </div>
    </div>
  )
}

function CardView({ player, theme, onEdit }) {
  const t = THEME[theme]
  const cardRef = useRef()
  const [generating, setGenerating] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [cardImgSrc, setCardImgSrc] = useState(null)
  // プレビュー時、画面高さにカード全体が収まるよう縮小率を算出
  const [previewScale, setPreviewScale] = useState(1)
  useLayoutEffect(() => {
    const calc = () => {
      // 上下パディング(24+40)＋ボタン領域(約70)＋余白を確保した実効高さ
      const reserve = 24 + 40 + 70 + 24
      const avail = window.innerHeight - reserve
      const s = Math.min(1, avail / CARD_H)
      setPreviewScale(s > 0.3 ? s : 0.3)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [showSave])

  // X（旧Twitter）へのポスト：投稿文を入れた状態でintentを開く
  const handlePostToX = useCallback(() => {
    const name = ((player.firstName || '') + ' ' + (player.lastName || '')).trim()
    const nameLine = name ? `${name}の${SHARE_NOUN}を作りました！` : `${SHARE_NOUN}を作りました！`
    const lines = [nameLine, '', SHARE_HASH]
    if (SHARE_URL) lines.push(SHARE_URL)
    const text = lines.join('\n')
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [player])

  const handleRenderCard = useCallback(async () => {
    setGenerating(true)
    setCardImgSrc(null)

    try {
      await document.fonts.ready

      const S = CARD_SCALE
      const W = CARD_W, H = CARD_H   // 論理サイズ（出力は W*S × H*S = 1080×1350）
      const SS_H = SS_HEIGHT         // スクショエリア
      const cv = document.createElement('canvas')
      cv.width = W * S; cv.height = H * S
      const ctx = cv.getContext('2d')
      ctx.scale(S, S)

      const t = THEME[theme]
      const ac = t.accentColor

      // ── ヘルパー ──────────────────────────────────────
      // fill には色文字列・CanvasGradient どちらも渡せる
      const fillRect = (x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h) }
      const roundRect = (x, y, w, h, r, fill, stroke) => {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
        ctx.closePath()
        if (fill)  { ctx.fillStyle = fill; ctx.fill() }
        if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
      }
      const txt = (str, x, y, font, color, align = 'left', baseline = 'alphabetic', maxW = null) => {
        ctx.font = font; ctx.fillStyle = color
        ctx.textAlign = align; ctx.textBaseline = baseline
        let s = String(str)
        if (maxW && ctx.measureText(s).width > maxW) {
          // maxW に収まるまで末尾を削り「…」を付ける
          while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
          s = s + '…'
        }
        ctx.fillText(s, x, y)
      }
      const loadImg = (src) => new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src
      })

      // タグ描画（DOM tagBase準拠: padding 1px 8px, fontSize 9px, border 1px,
      //   margin 2px(=外側に左右2px,上下2px), minWidth 34px, borderRadius 20px）
      // 実効タグ高さ=17px、行ピッチ=17+4=21px、タグ間=4px
      const TAG_H = 17, TAG_PITCH = 21, TAG_GAP = 4, TAG_PAD = 8, TAG_MINW = 34
      const drawTags = (tags, startY) => {
        let tx = 16, ty = startY
        tags.forEach(({ label, type, small }) => {
          const fw = type === 'main' ? 700 : 500
          const fs = small ? 9 : 9
          const hpad = small ? 6 : TAG_PAD
          ctx.font = `${fw} ${fs}px "Noto Sans JP"`
          const tw = Math.max(ctx.measureText(label).width + hpad * 2, TAG_MINW)
          if (tx + tw > W - 16) { tx = 16; ty += TAG_PITCH }
          let bg, border, fg
          if (type === 'main')     { bg = ac + '55'; border = ac; fg = t.light ? ac : '#ffffff' }
          else if (type === 'sub') { bg = ac + '22';       border = ac + '88'; fg = ac }
          else                     { bg = t.inactiveTagBg; border = t.inactiveTagBorder; fg = t.inactiveTagText }
          roundRect(tx, ty, tw, TAG_H, TAG_H / 2, bg, border)
          ctx.font = `${fw} ${fs}px "Noto Sans JP"`
          ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(label, tx + tw / 2, ty + TAG_H / 2 + 0.5)
          tx += tw + TAG_GAP
        })
        return ty + TAG_H  // 最終行 bottom
      }

      // ── 背景 ──────────────────────────────────────────
      fillRect(0, 0, W, H, t.cardBg)

      // ── スクショエリア ────────────────────────────────
      // 画像は必須（送信時にバリデート済み）。万一未設定でもクラッシュしないよう
      // カード背景で塗りつぶすだけのフォールバックを置く。
      if (player.screenshotDataUrl) {
        const img = await loadImg(player.screenshotDataUrl)
        const srcR = img.width / img.height, tgtR = W / SS_H
        let sx, sy, sw, sh
        // DOM は objectPosition: "center top" → 横は中央寄せ、縦は上端固定
        if (srcR > tgtR) { sh = img.height; sw = sh * tgtR; sy = 0; sx = (img.width - sw) / 2 }
        else             { sw = img.width;  sh = sw / tgtR;  sx = 0; sy = 0 }
        // ※縦長画像（else分岐）は sy=0（上端固定）で DOM の center-top と一致
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, SS_H)
      } else {
        fillRect(0, 0, W, SS_H, t.cardBg)
      }

      // フェードオーバーレイ（DOM: height100, to-top, cardBg→cardBgcc(30%)→transparent）
      // ※ canvas で 'transparent' を終点に使うと「透明な黒(rgba(0,0,0,0))」へ補間され、
      //   中間色に黒が混ざる。ライトモードでは白→黒のにじみになるため、
      //   終点を「cardBg と同色でアルファ0(=末尾'00')」にして黒混入を防ぐ。
      const fadeGrad = ctx.createLinearGradient(0, SS_H, 0, SS_H - 100)
      fadeGrad.addColorStop(0, t.cardBg)
      fadeGrad.addColorStop(0.3, t.cardBg + 'cc')
      fadeGrad.addColorStop(1, t.cardBg + '00')
      fillRect(0, SS_H - 100, W, 100, fadeGrad)

      // ── 上部ヘッダー：陣営ロゴ（左）のみ ──
      // ランク非表示(__none__)/未選択はバッジを出さない（ヘッダー判定より前に確定させる）
      const rank = player.highestRank === '__none__' ? '' : player.highestRank
      ctx.textBaseline = 'alphabetic'
      if (player.showLogo) {
        ctx.save(); ctx.globalAlpha = 0.5
        txt(t.faction, 16, 30, '700 20px "Oswald"', t.logoColor, 'left')
        ctx.restore()
      }

      // プレイヤー名（DOM: bottom12px, left18px）
      ctx.textBaseline = 'alphabetic'
      const nameBottom = SS_H - 12
      // 名前・呼び方の右限界（ランクバッジがある場合はその左まで）
      const nameLeft = 18
      const nameRightLimit = rank ? W - 84 - 8 : W - 18
      const nameMaxW = nameRightLimit - nameLeft
      txt('CRYSTAL CONFLICT PLAYER', nameLeft, nameBottom - 30, '500 10px "Oswald"', ac)
      const fullName = ((player.firstName || 'First') + ' ' + (player.lastName || 'Last')).trim()
      txt(fullName, nameLeft, nameBottom, '700 28px "Oswald"', t.playerNameColor, 'left', 'alphabetic', nameMaxW)
      if (player.nickname) txt(player.nickname, nameLeft, nameBottom + 14, '13px "Noto Sans JP"', t.value, 'left', 'alphabetic', nameMaxW)

      // ランクバッジ（DOM: top14, right14, padding 6px10px, minWidth56）
      if (rank) {
        roundRect(W - 84, 14, 70, 56, 10, t.rankBadgeBg, ac + '66')
        // ダイヤ型アイコン（案B・くすませて小さめ）：DOM の 22px に合わせて描画。中心 (W-49)
        const rc = RANK_CONFIG[rank]
        if (rc) {
          const D = 22                    // アイコン描画サイズ
          const ox = (W - 49) - D / 2     // 左上x
          const oy = 22                   // 左上y（縮小分だけ下げて上下バランスを保つ）
          const sc = D / 48               // viewBox48 → D へのスケール
          const P = (x, y) => [ox + x * sc, oy + y * sc]
          const poly = (pts, fill, stroke) => {
            ctx.beginPath()
            pts.forEach(([px, py], i) => {
              const [cx, cy] = P(px, py)
              if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy)
            })
            ctx.closePath()
            if (fill) { ctx.fillStyle = fill; ctx.fill() }
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5 * sc; ctx.stroke() }
          }
          poly([[24,4],[44,20],[24,44],[4,20]], rc.fill, rc.stroke)   // 外形
          poly([[24,9],[38,20],[24,21],[10,20]], rc.top)              // 上面
          poly([[24,21],[38,20],[24,39]], rc.right)                   // 右下
          poly([[24,21],[10,20],[24,39]], rc.left)                    // 左下
        }
        txt(rank, W - 49, 62, '700 11px "Noto Sans JP"', ac, 'center', 'alphabetic')
      }

      // トップアクセントライン
      // ※ 両端の 'transparent'(=透明な黒) を ac 同色の透明(末尾'00')にして黒混入を防ぐ
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0)
      lineGrad.addColorStop(0, ac + '00'); lineGrad.addColorStop(0.5, ac); lineGrad.addColorStop(1, ac + '00')
      fillRect(0, 0, W, 2, lineGrad)

      // ── 情報エリア (300〜800px / padding 8px 16px 10px) ──
      // CSS space-between 相当: 各セクション高さを計測し、余白を均等分配
      const INFO_TOP = SS_H + 8           // padding-top 8px
      const INFO_BOTTOM = H - 10          // padding-bottom 10px
      const LABEL_H = 13 + 2              // セクションラベル高さ+marginBottom
      const stH = 46, noteH = 58

      // タグ行数から高さを計測するヘルパー（描画せず高さのみ）
      const measureTagsH = (tags) => {
        const pad = 8, minw = 34
        let tx = 16, rows = 1
        tags.forEach(({ label, type, small }) => {
          // drawTags と同じ weight を使って幅を計測（main=700, それ以外=500）
          const fw = type === 'main' ? 700 : 500
          const hpad = small ? 6 : pad
          ctx.font = `${fw} 9px "Noto Sans JP"`
          const tw = Math.max(ctx.measureText(label).width + hpad * 2, minw)
          if (tx + tw > W - 16) { tx = 16; rows++ }
          tx += tw + 4
        })
        return rows * TAG_H + (rows - 1) * (TAG_PITCH - TAG_H)  // = rows*17 + (rows-1)*4
      }

      const jobTags = ALL_JOBS.map(j => ({
        label: j === player.mainJob ? '★ ' + j : j,
        type: j === player.mainJob ? 'main' : player.subJobs.includes(j) ? 'sub' : 'inactive'
      }))
      const psTags = PLAYSTYLE_LIST.map(ps => ({
        label: ps, type: player.playstyle.includes(ps) ? 'sub' : 'inactive'
      }))
      const snsTags = SNS_LIST.map(s => ({
        label: s, type: player.sns.includes(s) ? 'sub' : 'inactive', small: true
      }))

      // 各セクションの高さ
      const jobsH = LABEL_H + measureTagsH(jobTags)
      const psH   = LABEL_H + measureTagsH(psTags)
      const noteSecH = LABEL_H + noteH
      const snsH  = measureTagsH(snsTags)
      const footerH = 1 + 6 + 11 + 12 + 11  // 線 + paddingTop6 + テキスト3行ぶん（CARD名 + FF14 + ©）
      const footerMarginTop = 4

      // セクションは6ブロック: SERVER/TEAM, JOBS, PLAY STYLE, NOTE, SNS, フッター
      const blockHeights = [stH, jobsH, psH, noteSecH, snsH, footerMarginTop + footerH]
      const totalContent = blockHeights.reduce((a, b) => a + b, 0)
      const available = INFO_BOTTOM - INFO_TOP
      const gapCount = blockHeights.length - 1
      // 余白を均等分配。コンテンツがはみ出す場合は最低2pxでクランプ
      const gap = Math.max(2, (available - totalContent) / gapCount)

      let cy = INFO_TOP

      // 値フィット描画
      const colInnerW = (W - 32) / 2 - 24
      const fitValue = (str, x, y) => {
        let fs = 13
        ctx.font = `600 ${fs}px "Noto Sans JP"`
        while (ctx.measureText(str).width > colInnerW && fs > 9) {
          fs -= 0.5
          ctx.font = `600 ${fs}px "Noto Sans JP"`
        }
        // 最小フォントでも収まらない場合は末尾を省略（DOMの ellipsis に合わせる）
        txt(str, x, y, `600 ${fs}px "Noto Sans JP"`, t.value, 'left', 'alphabetic', colInnerW)
      }
      const drawSectionLabel = (label) => {
        ctx.textBaseline = 'alphabetic'
        txt(label, 16, cy + 10, '600 11px "Oswald"', t.label)
        cy += LABEL_H
      }

      // ① SERVER / TEAM
      roundRect(16, cy, W - 32, stH, 8, t.sectionBg, t.border)
      ctx.textBaseline = 'alphabetic'
      txt('SERVER', 26, cy + 14, '700 9px "Oswald"', t.label)
      fitValue(player.server || '—', 26, cy + 31)
      ctx.strokeStyle = t.border; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(W / 2, cy + 8); ctx.lineTo(W / 2, cy + stH - 8); ctx.stroke()
      txt('TEAM', W / 2 + 12, cy + 14, '700 9px "Oswald"', t.label)
      fitValue(player.team || '—', W / 2 + 12, cy + 31)
      cy += stH + gap

      // ② JOBS
      drawSectionLabel('JOBS')
      cy = drawTags(jobTags, cy) + gap

      // ③ PLAY STYLE
      drawSectionLabel('PLAY STYLE')
      cy = drawTags(psTags, cy) + gap

      // ④ NOTE
      drawSectionLabel('NOTE')
      roundRect(16, cy, W - 32, noteH, 8, t.noteBg, t.noteBorder)
      if (player.freeText) {
        ctx.font = '11px "Noto Sans JP"'
        ctx.fillStyle = t.value; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        const lines = []
        let line = ''
        for (const ch of player.freeText) {
          if (ch === '\n') { lines.push(line); line = '' }
          else if (ctx.measureText(line + ch).width > W - 64) { lines.push(line); line = ch }
          else line += ch
        }
        lines.push(line)
        lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 26, cy + 17 + i * 16))
      }
      cy += noteH + gap

      // ⑤ SNS
      cy = drawTags(snsTags, cy) + gap

      // ⑥ フッター
      cy += footerMarginTop
      ctx.strokeStyle = t.border; ctx.lineWidth = 1; ctx.textBaseline = 'alphabetic'
      ctx.beginPath(); ctx.moveTo(16, cy); ctx.lineTo(W - 16, cy); ctx.stroke()
      cy += 6
      txt('CC PLAYER CARD', 16, cy + 11, '700 11px "Oswald"', ac)
      txt('FINAL FANTASY XIV', 16, cy + 23, '9px "Oswald"', t.label)
      txt('© SQUARE ENIX', 16, cy + 34, '9px "Oswald"', t.label)

      const dataUrl = cv.toDataURL('image/png')
      setCardImgSrc(dataUrl)
      setShowSave(true)
    } catch (err) {
      console.error('render error:', err)
      alert('画像生成に失敗しました。再試行してください。')
    } finally {
      setGenerating(false)
    }
  }, [player, theme])

  // 自動生成なし：ユーザーがボタンを押したときのみ生成

  if (showSave && cardImgSrc) {
    return (
      <div style={{ minHeight: '100vh', background: t.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 40px' }}>
        <img src={cardImgSrc} alt="Generated card" style={{
          width: `${CARD_W}px`, maxWidth: '100%', display: 'block',
          borderRadius: '4px', border: `1px solid ${t.border}`, animation: 'fadeIn 0.4s ease',
        }} />
        <div style={{
          width: `${CARD_W}px`, maxWidth: '100%', marginTop: '12px',
          background: t.accentColor + '12', border: `1px solid ${t.accentColor}35`,
          borderRadius: '8px', padding: '12px 14px', textAlign: 'center',
          color: t.value, fontFamily: "'Noto Sans JP',sans-serif", fontSize: '12px', fontWeight: 600, lineHeight: 1.8,
        }}>
          <div style={{ color: t.accentColor, fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
            ✅ カードが完成しました！
          </div>
          👆 上の画像を保存してください<br />
          <span style={{ fontSize: '11px', fontWeight: 400, color: t.label }}>
            📱 スマホ：長押し →「写真に追加」<br />
            💻 PC：右クリック →「名前を付けて保存」
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => { setShowSave(false); setCardImgSrc(null) }} style={{
            padding: '7px 14px', background: t.inactiveTagBg, border: `1px solid ${t.inactiveTagBorder}`,
            borderRadius: '20px', color: t.value, fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', fontFamily: "'Noto Sans JP',sans-serif",
          }}>← 戻る</button>
          <button onClick={handleRenderCard} disabled={generating} style={{
            padding: '7px 14px', background: t.inactiveTagBg, border: `1px solid ${t.inactiveTagBorder}`,
            borderRadius: '20px', color: t.value, fontSize: '12px',
            cursor: generating ? 'wait' : 'pointer', fontFamily: "'Noto Sans JP',sans-serif",
            opacity: generating ? 0.7 : 1,
          }}>{generating ? '生成中...' : '↺ 再生成'}</button>
        </div>

        {/* Xでポスト（控えめ） */}
        <button onClick={handlePostToX} style={{
          marginTop: '14px', padding: '8px 18px',
          background: 'transparent', border: `1px solid ${t.inactiveTagBorder}`,
          borderRadius: '20px', color: t.value, cursor: 'pointer',
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: '13px', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          transition: 'all 0.15s ease',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 900 }}>𝕏</span>
          ポストする
        </button>
        <div style={{
          marginTop: '7px', textAlign: 'center',
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: '11px', fontWeight: 500,
          color: t.value, opacity: 0.7,
        }}>
          ※投稿画面で保存した画像を添付してください
        </div>
        <div style={{
          width: `${CARD_W}px`, maxWidth: '100%', marginTop: '10px',
          textAlign: 'center', fontFamily: "'Noto Sans JP',sans-serif", fontSize: '11px',
          color: t.label,
        }}>
          不具合・ご要望は{' '}
          <span style={{ whiteSpace: 'nowrap' }}>
            <a href="https://x.com/reno_ff14pvp" target="_blank" rel="noopener noreferrer"
              style={{ color: t.accentColor, textDecoration: 'none', fontWeight: 600 }}>
              @reno_ff14pvp
            </a>
            {' '}までDMでお知らせください 🙏
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 40px' }}>
      {/* プレビュー：生成完了前のみ表示 */}
      {!showSave && (
        <>
          <div style={{
            width: CARD_W * previewScale, height: CARD_H * previewScale,
            overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <PlayerCard player={player} theme={theme} cardRef={cardRef} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={onEdit} style={{
              padding: '10px 20px', background: t.inactiveTagBg, border: `1px solid ${t.inactiveTagBorder}`,
              borderRadius: '8px', color: t.value, fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Oswald',sans-serif",
            }}>← 編集に戻る</button>
            <button onClick={handleRenderCard} disabled={generating} style={{
              padding: '10px 20px', background: t.buttonBg, border: 'none', borderRadius: '8px',
              color: t.buttonText, fontSize: '14px', fontWeight: 700,
              cursor: generating ? 'wait' : 'pointer', fontFamily: "'Oswald',sans-serif",
              opacity: generating ? 0.7 : 1,
            }}>{generating ? '⏳ 生成中...' : '🖼️ カードを生成'}</button>
          </div>
          {generating && (
            <div style={{
              marginTop: '14px', padding: '10px 18px',
              background: t.accentColor + '15', border: `1px solid ${t.accentColor}40`,
              borderRadius: '8px', textAlign: 'center',
              color: t.label, fontFamily: "'Noto Sans JP',sans-serif", fontSize: '12px', lineHeight: 1.8,
            }}>
              ⏳ 生成中…しばらくお待ちください
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function App() {
  const [view, setView]     = useState('form')
  const [player, setPlayer] = useState(emptyPlayer)
  const [theme, setTheme]   = useState('umbra')
  return (
    <>
      <GlobalStyle />
      {view === 'form' ? (
        <PlayerForm
          onSubmit={(data) => { setPlayer(data); setView('card') }}
          theme={theme}
          onToggleTheme={(t) => setTheme(t)}
          initialData={player}
        />
      ) : (
        <CardView player={player} theme={theme} onEdit={() => setView('form')} />
      )}
    </>
  )
}
