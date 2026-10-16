export class FullscreenController {
  constructor(orientation, onNotice = () => {}, onChange = () => {}) {
    this.orientation = orientation;
    this.onNotice = onNotice;
    this.onChange = onChange;
    this.enabled = true;
    this.pending = false;
    this.message = '';
    const changed = () => {
      this.message = '';
      this.sync();
      this.orientation.check();
      this.onChange();
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('webkitfullscreenchange', changed);
    orientation.element.addEventListener('click', event => {
      if (event.target.closest('[data-action="fullscreen"]')) this.toggle();
    });
  }

  get active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  get supported() {
    return typeof document.documentElement.requestFullscreen === 'function'
      ? document.fullscreenEnabled !== false
      : typeof document.documentElement.webkitRequestFullscreen === 'function'
        && document.webkitFullscreenEnabled !== false;
  }

  configure(settings) {
    this.enabled = settings.fullscreenButton;
    this.sync();
  }

  sync() {
    const active = this.active;
    const supported = this.supported;
    for (const button of document.querySelectorAll('[data-action="fullscreen"]')) {
      button.hidden = !this.enabled;
      button.disabled = this.pending || (!active && !supported);
      button.setAttribute('aria-busy', String(this.pending));
      button.setAttribute('aria-label', active ? '退出全屏' : '全屏游玩');
      const label = button.querySelector('[data-fullscreen-label]') || button;
      label.textContent = this.pending ? '正在切换…' : active ? '退出全屏' : '全屏游玩';
    }
    const message = this.enabled ? this.message || (!supported ? '当前浏览器暂不支持网页全屏，请横屏游玩。' : '') : '';
    const status = this.orientation.element.querySelector('[data-fullscreen-status]');
    status.textContent = message;
    status.hidden = !message;
    document.documentElement.classList.toggle('game-fullscreen', active);
  }

  async toggle() {
    if (this.pending || !this.enabled) return;
    if (!this.active && !this.supported) {
      this.message = '当前浏览器暂不支持网页全屏，请横屏游玩。';
      this.sync();
      this.onNotice(this.message);
      return;
    }
    this.pending = true;
    this.message = '';
    this.sync();
    try {
      if (this.active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit.call(document);
      } else {
        this.orientation.requestLandscapeLock();
        const root = document.documentElement;
        // Keep the request in the user's click turn; the API consumes user activation.
        if (root.requestFullscreen) await root.requestFullscreen({navigationUI: 'hide'});
        else await root.webkitRequestFullscreen();
      }
    } catch {
      this.message = '未能切换全屏，请允许浏览器全屏后重试。仍可横屏游玩。';
      this.onNotice(this.message);
    } finally {
      this.pending = false;
      this.sync();
      this.orientation.check();
    }
  }
}
