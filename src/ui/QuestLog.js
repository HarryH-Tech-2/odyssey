export class QuestLog {
  constructor() {
    this.element = document.getElementById('quest-log');
    this.currentObjective = '';
  }

  setObjective(text) {
    this.currentObjective = text;
    this.element.innerHTML = `<strong>\u25C9 Current Quest</strong><br>${text}`;
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  show() {
    if (this.currentObjective) {
      this.element.classList.remove('hidden');
    }
  }
}
