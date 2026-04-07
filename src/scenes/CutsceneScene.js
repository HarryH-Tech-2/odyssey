import * as THREE from 'three';
import { GameScene } from '../engine/SceneManager.js';

export class CutsceneScene extends GameScene {
  constructor(renderer, input, sceneManager) {
    super(renderer, input, sceneManager);
    this.steps = [];
    this.currentStep = 0;
    this.stepTime = 0;
    this.overlay = document.getElementById('cutscene-overlay');
    this.textEl = document.getElementById('cutscene-text');
  }

  setSteps(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.stepTime = 0;
  }

  async enter(data) {
    this.overlay.classList.remove('hidden');
    this.currentStep = 0;
    this.stepTime = 0;
    this._enterStep(0);
  }

  async exit() {
    this.overlay.classList.add('hidden');
    this.textEl.classList.remove('visible');
  }

  _enterStep(idx) {
    if (idx >= this.steps.length) {
      this._onComplete();
      return;
    }
    const step = this.steps[idx];
    this.stepTime = 0;

    if (step.text) {
      this.textEl.textContent = step.text;
      this.textEl.classList.add('visible');
    } else {
      this.textEl.classList.remove('visible');
    }

    if (step.onEnter) step.onEnter();
  }

  _onComplete() {
    // Override in subclass
  }

  update(dt) {
    if (this.currentStep >= this.steps.length) return;

    this.stepTime += dt;
    const step = this.steps[this.currentStep];
    const t = Math.min(this.stepTime / step.duration, 1);
    const ease = t * t * (3 - 2 * t);

    if (step.cameraStart && step.cameraEnd) {
      this.camera.position.lerpVectors(step.cameraStart, step.cameraEnd, ease);
    }
    if (step.lookAt) {
      this.camera.lookAt(step.lookAt);
    }
    if (step.lookAtStart && step.lookAtEnd) {
      const target = new THREE.Vector3().lerpVectors(step.lookAtStart, step.lookAtEnd, ease);
      this.camera.lookAt(target);
    }

    if (step.onUpdate) step.onUpdate(dt, t, ease);

    if (this.input.justPressed('Space')) {
      this._advanceStep();
    }

    if (this.stepTime >= step.duration) {
      this._advanceStep();
    }
  }

  _advanceStep() {
    const step = this.steps[this.currentStep];
    if (step && step.onExit) step.onExit();
    this.textEl.classList.remove('visible');
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      setTimeout(() => this._enterStep(this.currentStep), 200);
    } else {
      this._onComplete();
    }
  }
}
