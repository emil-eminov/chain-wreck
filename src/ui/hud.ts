/**
 * DOM overlay rather than in-canvas UI.
 *
 * Buttons are the one part of this game that must feel native on a phone, and
 * the browser already does hit targets, focus and text rendering better than a
 * few hundred lines of canvas code would.
 */

export interface HudCallbacks {
  readonly onRotate: (deltaDegrees: number) => void
  readonly onUndo: () => void
  readonly onFire: () => void
  readonly onCancelAim: () => void
  readonly onRetry: () => void
  readonly onNext: () => void
}

export interface Hud {
  setLevel(name: string, index: number, total: number): void
  setPhase(phase: string): void
  setParts(remaining: number, total: number): void
  setResult(stars: number, partsUsed: number, par: number, won: boolean): void
  hideResult(): void
  setStats(text: string): void
  root: HTMLElement
}

const STYLE = `
.hud { position: fixed; inset: 0; pointer-events: none; font: 600 16px/1.3 system-ui, -apple-system, sans-serif;
  color: #f6efe4; user-select: none; -webkit-user-select: none; }
.hud button { pointer-events: auto; font: inherit; border: 0; border-radius: 14px; padding: 14px 18px;
  background: #f5c518; color: #241a12; box-shadow: 0 4px 0 #b8940f; touch-action: manipulation; }
.hud button:active { transform: translateY(3px); box-shadow: 0 1px 0 #b8940f; }
.hud button.ghost { background: rgba(246,239,228,0.14); color: #f6efe4; box-shadow: none; }
.hud button[disabled] { opacity: 0.35; }
.hud .top { position: absolute; top: env(safe-area-inset-top, 12px); left: 0; right: 0; display: flex;
  justify-content: space-between; align-items: flex-start; padding: 12px 16px; }
.hud .title { font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.75; }
.hud .stats { font: 500 12px/1.4 ui-monospace, monospace; opacity: 0.55; text-align: right; white-space: pre; }
.hud .bar { position: absolute; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 12px) + 12px);
  display: flex; gap: 10px; align-items: center; justify-content: center; padding: 0 16px; flex-wrap: wrap; }
.hud .parts { pointer-events: none; background: rgba(0,0,0,0.35); border-radius: 14px; padding: 12px 16px; }
.hud .hint { position: absolute; left: 0; right: 0; bottom: 50%; text-align: center; font-size: 18px;
  opacity: 0.8; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
.hud .card { position: absolute; inset: 0; display: none; place-content: center; justify-items: center; gap: 18px;
  background: rgba(20,14,10,0.72); pointer-events: auto; }
.hud .card.show { display: grid; }
.hud .stars { font-size: 44px; letter-spacing: 6px; }
.hud .verdict { font-size: 26px; }
.hud .detail { opacity: 0.7; font-weight: 500; }
.hud .row { display: flex; gap: 12px; }
`

export function createHud(parent: HTMLElement, callbacks: HudCallbacks): Hud {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.append(style)

  const root = document.createElement('div')
  root.className = 'hud'
  root.innerHTML = `
    <div class="top">
      <div class="title" data-title>Level</div>
      <div class="stats" data-stats></div>
    </div>
    <div class="hint" data-hint></div>
    <div class="bar" data-bar>
      <div class="parts" data-parts>Ramp 1</div>
      <button class="ghost" data-rot-ccw aria-label="Rotate anticlockwise">&#8630;</button>
      <button class="ghost" data-rot-cw aria-label="Rotate clockwise">&#8631;</button>
      <button class="ghost" data-undo>Undo</button>
      <button data-fire>Fire</button>
      <button class="ghost" data-cancel hidden>Cancel</button>
    </div>
    <div class="card" data-card>
      <div class="stars" data-card-stars></div>
      <div class="verdict" data-card-verdict></div>
      <div class="detail" data-card-detail></div>
      <div class="row">
        <button class="ghost" data-card-retry>Retry</button>
        <button data-card-next>Next</button>
      </div>
    </div>`
  parent.append(root)

  const pick = <T extends HTMLElement>(name: string): T => root.querySelector<T>(`[data-${name}]`)!

  const title = pick('title')
  const stats = pick('stats')
  const hint = pick('hint')
  const parts = pick('parts')
  const fire = pick<HTMLButtonElement>('fire')
  const cancel = pick<HTMLButtonElement>('cancel')
  const undo = pick<HTMLButtonElement>('undo')
  const card = pick('card')

  pick<HTMLButtonElement>('rot-ccw').onclick = () => callbacks.onRotate(-15)
  pick<HTMLButtonElement>('rot-cw').onclick = () => callbacks.onRotate(15)
  undo.onclick = () => callbacks.onUndo()
  fire.onclick = () => callbacks.onFire()
  cancel.onclick = () => callbacks.onCancelAim()
  pick<HTMLButtonElement>('card-retry').onclick = () => callbacks.onRetry()
  pick<HTMLButtonElement>('card-next').onclick = () => callbacks.onNext()

  return {
    root,
    setLevel(name, index, total) {
      title.textContent = `${index + 1}/${total}  ${name}`
    },
    setPhase(phase) {
      const aiming = phase === 'AIM'
      cancel.hidden = !aiming
      fire.hidden = aiming
      undo.hidden = aiming
      // No text longer than three words in the early levels (SPEC 2.4).
      hint.textContent = phase === 'BUILD' ? 'Drag to place' : aiming ? 'Drag to aim' : ''
    },
    setParts(remaining, total) {
      parts.textContent = `Ramp ${remaining}/${total}`
      undo.disabled = remaining >= total
    },
    setResult(starCount, partsUsed, par, won) {
      card.classList.add('show')
      pick('card-stars').textContent = won ? '★'.repeat(starCount) + '☆'.repeat(3 - starCount) : ''
      pick('card-verdict').textContent = won ? 'Wrecked' : 'Try again'
      pick('card-detail').textContent = won ? `${partsUsed} part${partsUsed === 1 ? '' : 's'} used, par ${par}` : ''
      pick<HTMLButtonElement>('card-next').hidden = !won
    },
    hideResult() {
      card.classList.remove('show')
    },
    setStats(text) {
      stats.textContent = text
    },
  }
}
