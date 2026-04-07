export class HUD {
  constructor() {
    this.element = document.getElementById('hud');
    this.visible = false;
  }

  show() {
    this.element.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    this.element.classList.add('hidden');
    this.visible = false;
  }

  showInteraction(text) {
    const el = document.getElementById('interaction-prompt');
    el.textContent = text;
    el.classList.remove('hidden');
  }

  hideInteraction() {
    document.getElementById('interaction-prompt').classList.add('hidden');
  }
}
