export class HealthBar {
  constructor() {
    this.healthFill = document.querySelector('.health-fill');
    this.staminaFill = document.querySelector('.stamina-fill');
  }

  setHealth(ratio) {
    this.healthFill.style.width = `${ratio * 100}%`;
  }

  setStamina(ratio) {
    this.staminaFill.style.width = `${ratio * 100}%`;
  }
}
