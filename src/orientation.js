const HANDHELD_QUERY = '(pointer: coarse) and (hover: none)';

function handheld() {
  const touch = navigator.maxTouchPoints > 0 || matchMedia(HANDHELD_QUERY).matches;
  const shortEdge = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  return touch && (matchMedia(HANDHELD_QUERY).matches || shortEdge <= 1200);
}

function portrait() {
  const media = matchMedia('(orientation: portrait)');
  if (typeof media.matches === 'boolean') return media.matches;
  return screen.orientation?.type?.startsWith('portrait') ?? innerHeight >= innerWidth;
}

export class OrientationGuard {
  constructor() {
    this.blocked = null;
    this.listener = null;
    this.element = document.createElement('div');
    this.element.id = 'orientation-lock';
    this.element.className = 'orientation-lock';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-live', 'assertive');
    this.element.setAttribute('aria-label', '请横屏游玩');
    this.element.innerHTML = '<div class="orientation-lock__panel"><div class="orientation-lock__device" aria-hidden="true"><i></i><b></b></div><h1>请横屏游玩</h1><p>夜行赛道为手机和平板优化了横向视野</p><small>请旋转设备到横屏，横屏后会自动继续</small><button type="button" data-action="fullscreen" class="primary fullscreen-button">全屏游玩</button><p class="orientation-lock__status" data-fullscreen-status role="status" aria-live="polite"></p></div>';
    document.body.append(this.element);
    this.check = this.check.bind(this);
    window.addEventListener('resize', this.check, {passive: true});
    window.addEventListener('orientationchange', this.check, {passive: true});
    screen.orientation?.addEventListener?.('change', this.check, {passive: true});
    this.check();
  }

  onChange(listener) {
    this.listener = listener;
    listener(this.blocked);
  }

  check() {
    const next = handheld() && portrait();
    if (next === this.blocked) return;
    this.blocked = next;
    this.element.classList.toggle('is-visible', next);
    this.element.setAttribute('aria-hidden', String(!next));
    document.documentElement.classList.toggle('orientation-locked', next);
    this.listener?.(next);
  }

  requestLandscapeLock() {
    if (!handheld()) return;
    const lock = screen.orientation?.lock;
    if (typeof lock === 'function') {
      try { return Promise.resolve(lock.call(screen.orientation, 'landscape')).then(() => this.check()).catch(() => {}); }
      catch { /* Unsupported browser lock keeps the portrait guard in place. */ }
    }
  }
}
