export class Compass {
  constructor() {
    this.element = document.getElementById('compass');
  }

  update(heading, objectiveName, objectiveAngle) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    const cardinal = dirs[idx];

    let text = cardinal;
    if (objectiveName) {
      const relAngle = objectiveAngle - heading;
      const arrowIdx = Math.round(((relAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
      const arrows = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
      text = `${arrows[arrowIdx]} ${objectiveName}  \u00B7  ${cardinal}`;
    }

    this.element.textContent = text;
  }
}
