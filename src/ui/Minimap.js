export class Minimap {
  constructor() {
    this.container = document.getElementById('minimap');
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 160;
    this.canvas.style.borderRadius = '50%';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.markers = [];
    this.questTarget = null;
  }

  setMarkers(markers) {
    this.markers = markers;
  }

  setQuestTarget(marker) {
    this.questTarget = marker;
  }

  update(playerX, playerZ, playerHeading, viewRadius = 500) {
    const ctx = this.ctx;
    const cx = 80, cy = 80, r = 75;

    ctx.clearRect(0, 0, 160, 160);

    // Water background with gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#0e3d6b');
    grad.addColorStop(1, '#071e3a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Grid lines for depth
    ctx.strokeStyle = 'rgba(100,180,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let ring = 20; ring < r; ring += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerHeading);

    // Draw island markers
    for (const marker of this.markers) {
      const dx = (marker.x - playerX) / viewRadius * r;
      const dz = (marker.z - playerZ) / viewRadius * r;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > r + 5) {
        // Draw at edge when out of range
        const angle = Math.atan2(dz, dx);
        const edgeX = Math.cos(angle) * (r - 8);
        const edgeY = Math.sin(angle) * (r - 8);

        ctx.fillStyle = 'rgba(240,194,127,0.4)';
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Island blob with glow
        const glowGrad = ctx.createRadialGradient(dx, dz, 0, dx, dz, marker.size + 4);
        glowGrad.addColorStop(0, marker.color || '#f0c27f');
        glowGrad.addColorStop(0.5, 'rgba(240,194,127,0.3)');
        glowGrad.addColorStop(1, 'rgba(240,194,127,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(dx, dz, marker.size + 4, 0, Math.PI * 2);
        ctx.fill();

        // Solid island
        ctx.fillStyle = '#4a8741';
        ctx.beginPath();
        ctx.arc(dx, dz, marker.size || 4, 0, Math.PI * 2);
        ctx.fill();

        // Sandy edge
        ctx.strokeStyle = '#c4943a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dx, dz, marker.size || 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Quest target direction arrow
    if (this.questTarget) {
      const qx = (this.questTarget.x - playerX) / viewRadius * r;
      const qz = (this.questTarget.z - playerZ) / viewRadius * r;
      const angle = Math.atan2(qz, qx);

      // Pulsing arrow at edge of minimap
      const arrowDist = r - 14;
      const ax = Math.cos(angle) * arrowDist;
      const ay = Math.sin(angle) * arrowDist;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);

      // Arrow shape
      ctx.fillStyle = '#ff6b35';
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Distance text
      const distToQuest = Math.sqrt(
        (this.questTarget.x - playerX) ** 2 +
        (this.questTarget.z - playerZ) ** 2
      );
      const distLabel = distToQuest > 100
        ? `${Math.round(distToQuest)}m`
        : 'Near';

      ctx.save();
      ctx.rotate(playerHeading); // Undo rotation for text
      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(distLabel, 0, r - 4);
      ctx.restore();
    }

    ctx.restore();

    // Player indicator (always center, pointing up)
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx, cy + 1);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border ring
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal direction labels
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerHeading);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -r + 10);
    ctx.fillText('S', 0, r - 4);
    ctx.fillText('E', r - 8, 3);
    ctx.fillText('W', -r + 8, 3);
    ctx.restore();
  }
}
