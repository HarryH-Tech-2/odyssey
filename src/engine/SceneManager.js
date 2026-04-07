export class SceneManager {
  constructor(renderer, input) {
    this.renderer = renderer;
    this.input = input;
    this.scenes = {};
    this.currentScene = null;
    this.currentName = null;
    this.transitioning = false;
  }

  register(name, SceneClass) {
    this.scenes[name] = new SceneClass(this.renderer, this.input, this);
  }

  async switchTo(name, data = {}) {
    if (this.transitioning) return;
    this.transitioning = true;

    if (this.currentScene) {
      await this.currentScene.exit();
    }

    this.currentScene = this.scenes[name];
    this.currentName = name;

    if (this.currentScene) {
      await this.currentScene.enter(data);
    }

    this.transitioning = false;
  }

  update(dt) {
    if (this.currentScene && !this.transitioning) {
      this.currentScene.update(dt);
    }
    this.input.update();
  }

  render() {
    if (this.currentScene && !this.transitioning) {
      this.currentScene.render(this.renderer);
    }
  }

  onResize(width, height) {
    if (this.currentScene && this.currentScene.onResize) {
      this.currentScene.onResize(width, height);
    }
  }
}

export class GameScene {
  constructor(renderer, input, sceneManager) {
    this.renderer = renderer;
    this.input = input;
    this.sceneManager = sceneManager;
    this.scene = null;
    this.camera = null;
  }

  async enter(data) {}
  async exit() {}
  update(dt) {}

  render(renderer) {
    if (this.scene && this.camera) {
      renderer.render(this.scene, this.camera);
    }
  }

  onResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}
