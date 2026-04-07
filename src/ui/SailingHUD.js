export class SailingHUD {
  constructor() {
    this.element = document.getElementById('sailing-hud');
    this.windEl = document.getElementById('wind-indicator');
    this.sailEl = document.getElementById('sail-trim');
    this.crewEl = document.getElementById('crew-count');
  }

  show() { this.element.classList.remove('hidden'); }
  hide() { this.element.classList.add('hidden'); }

  update(windAngle, sailTrim, crewCount) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((windAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    this.windEl.textContent = `Wind: ${dirs[idx]}`;
    this.sailEl.textContent = `Sail: ${Math.round(sailTrim * 100)}%`;
    this.crewEl.textContent = `Crew: ${crewCount}`;
  }
}
