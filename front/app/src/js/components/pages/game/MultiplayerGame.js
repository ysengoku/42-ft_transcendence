import * as THREE from 'three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '/node_modules/three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';
import pedro from '/3d_models/pedro.glb?url';
import cactus from '/3d_models/cactus.glb?url';
import bullet from '/3d_models/bullet.glb?url';
import fence from '/3d_models/fence.glb?url';
import couch from '/3d_models/sofa.glb?url';
import chair from '/3d_models/chair.glb?url';
import dressing from '/3d_models/dressing.glb?url';
import groundtexture from '/img/ground_texture.png?url';
import coin from '/3d_models/coin.glb?url';
import cardboard from '/3d_models/cardboard.glb?url';
import cardboard2 from '/3d_models/cardboard2.glb?url';
import cardboard3 from '/3d_models/cardboard3.glb?url';
import table from '/3d_models/table.glb?url';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';
import './components/index';
import { OVERLAY_TYPE, BUFF_TYPE } from './components/index';

/* eslint no-var: "off" */
/* eslint-disable new-cap */

/**
 * Standardized error logging utility
 */
const GameLogger = {
  error: (context, message, error = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[MultiplayerGame:${context}] ERROR: ${message}`, error || '');
    }
  },
  warn: (context, message) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[MultiplayerGame:${context}] WARNING: ${message}`);
    }
  },
  info: (context, message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MultiplayerGame:${context}] INFO: ${message}`);
    }
  },
  debug: (context, message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MultiplayerGame:${context}] DEBUG: ${message}`);
    }
  },
};

/**
 * MultiplayerGame Component - 3D Multiplayer Pong Game Implementation
 *
 * This class implements a 3D multiplayer pong game using Three.js with the following features:
 * - Real-time multiplayer with WebSocket connections
 * - Client-side prediction and server reconciliation
 * - Advanced 3D models and animations for players and environment
 * - Physics-based ball movement and collision detection
 * - Power-ups and buffs system
 * - Responsive UI with timer, scoreboard, and life points
 * - Rich desert environment with cacti, hills, and atmospheric effects
 */
export class MultiplayerGame extends HTMLElement {
  // Private fields for game configuration and state
  #navbarHeight = 64; // Height of the navigation bar
  #ktx2Loader = null; // KTX2 texture loader for optimized textures
  #pongSocket = null; // WebSocket connection for multiplayer
  #animationId = null; // Animation frame request ID
  #resizeHandler = null; // Window resize event handler
  #state = {
    gameOptions: {},
    user: null,
  };

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  constructor() {
    super();

    // Predefined rotation angles for player models
    this.modelRotation = [
      // Player 1 rotations: [table, couch, chair, dressing]
      [this.degreesToRadians(235), this.degreesToRadians(-90), this.degreesToRadians(235), this.degreesToRadians(-90)],
      // Player 2 rotations: [table, couch, chair, dressing]
      [this.degreesToRadians(55), this.degreesToRadians(90), this.degreesToRadians(55), this.degreesToRadians(90)],
    ];

    // Initialize UI element references
    this.timerElement = null; // Game timer display
    this.buffIconElement = null; // Power-up indicator
    this.scoreElement = null; // Scoreboard component
    this.lifePointElement = null; // Life points display
    this.overlay = null; // Game overlay for messages
  }

  async setParam(param) {
    const user = await auth.getUser();
    if (!user) {
      return;
    }
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    const navbar = document.querySelector('.navbar');
    this.#navbarHeight = navbar ? navbar.offsetHeight : 64;

    // Initialize UI elements using helper method
    this.createUIElement('scoreElement', 'game-scoreboard');

    // Create game timer with error handling
    const timerWrapper = document.getElementById('game-timer-wrapper');
    if (timerWrapper) {
      this.createUIElement('timerElement', 'game-timer', null, timerWrapper);
      GameLogger.debug('UIInit', 'Timer appended to wrapper');
    } else {
      GameLogger.warn('UIInit', 'Timer wrapper not found, creating timer in game element');
      this.createUIElement('timerElement', 'game-timer');
    }

    this.createUIElement('buffIconElement', 'game-buff-icon');
    this.createUIElement('lifePointElement', 'game-life-point');

    this.#state.gameId = param.id;
    await this.render();
  }

  /**
   * Called when the element is removed from the DOM
   * Handles cleanup of resources and event listeners
   */
  disconnectedCallback() {
    this.cleanup();
  }

  /**
   * Shared material system for memory optimization
   * Reuses materials to reduce GPU memory usage
   */
  initSharedMaterials() {
    this.sharedMaterials = {
      // Common materials used throughout the scene
      hillMaterial: new THREE.MeshPhongMaterial({ color: 0x3a251a }),
      cactusBaseMaterial: new THREE.MeshPhongMaterial({ color: 0x228b22 }),
      shadowMaterial: new THREE.ShadowMaterial({ opacity: 0.3 }),

      // Get or create shared material (optimized factory pattern)
      get: (type, options = {}) => {
        const key = `${type}_${JSON.stringify(options)}`;
        if (!this.sharedMaterials[key]) {
          const materialFactories = {
            phong: () => new THREE.MeshPhongMaterial(options),
            basic: () => new THREE.MeshBasicMaterial(options),
            lambert: () => new THREE.MeshLambertMaterial(options),
          };
          this.sharedMaterials[key] = (materialFactories[type] || materialFactories.phong)();
        }
        return this.sharedMaterials[key];
      },

      // Dispose all shared materials
      dispose: () => {
        Object.values(this.sharedMaterials).forEach((material) => {
          if (material && material.dispose) {
            material.dispose();
          }
        });
        this.sharedMaterials = null;
      },
    };

    GameLogger.info('MaterialSystem', 'Shared material system initialized');
  }

  /**
   * Performance optimization system for 3D rendering
   * Manages object visibility and frustum culling
   */
  initRenderOptimizations(camera, scene) {
    this.renderOptimizer = {
      frustum: new THREE.Frustum(),
      cameraMatrix: new THREE.Matrix4(),
      staticObjects: [], // Objects that don't move (cacti, hills, walls)
      dynamicObjects: [], // Objects that move (players, ball, coin)
      lastCullCheck: 0,
      cullInterval: 100, // Check visibility every 100ms instead of every frame

      // Helper function to extract all meshes from an object
      extractMeshes: (object) => {
        const meshes = [];
        object.traverse((child) => {
          if (child.isMesh && child.geometry) {
            meshes.push(child);
          }
        });
        return meshes;
      },

      // Register static objects for culling
      registerStatic: (object, type = 'static') => {
        const meshes = this.renderOptimizer.extractMeshes(object);
        meshes.forEach((mesh) => {
          this.renderOptimizer.staticObjects.push({ object: mesh, type, lastVisible: true });
        });
      },

      // Register dynamic objects for culling
      registerDynamic: (object, type = 'dynamic') => {
        const meshes = this.renderOptimizer.extractMeshes(object);
        meshes.forEach((mesh) => {
          this.renderOptimizer.dynamicObjects.push({ object: mesh, type, lastVisible: true });
        });
      },

      // Perform frustum culling
      updateVisibility: (camera, forceUpdate = false) => {
        const now = performance.now();
        if (!forceUpdate && now - this.renderOptimizer.lastCullCheck < this.renderOptimizer.cullInterval) {
          return;
        }

        this.renderOptimizer.lastCullCheck = now;
        this.renderOptimizer.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.renderOptimizer.frustum.setFromProjectionMatrix(this.renderOptimizer.cameraMatrix);

        // Cull static objects (less frequently)
        this.renderOptimizer.staticObjects.forEach((item) => {
          const wasVisible = item.lastVisible;
          const isVisible = this.renderOptimizer.frustum.intersectsObject(item.object);

          if (wasVisible !== isVisible) {
            item.object.visible = isVisible;
            item.lastVisible = isVisible;
          }
        });

        // Always check dynamic objects (they move frequently)
        this.renderOptimizer.dynamicObjects.forEach((item) => {
          item.object.visible = this.renderOptimizer.frustum.intersectsObject(item.object);
        });
      },

      // Get performance stats
      getStats: () => {
        const staticVisible = this.renderOptimizer.staticObjects.filter((item) => item.lastVisible).length;
        const staticTotal = this.renderOptimizer.staticObjects.length;
        const dynamicVisible = this.renderOptimizer.dynamicObjects.filter((item) => item.object.visible).length;
        const dynamicTotal = this.renderOptimizer.dynamicObjects.length;

        return {
          staticVisible,
          staticTotal,
          dynamicVisible,
          dynamicTotal,
          totalVisible: staticVisible + dynamicVisible,
          totalObjects: staticTotal + dynamicTotal,
        };
      },
    };

    GameLogger.info('RenderOptimizer', 'Frustum culling system initialized');
  }

  /**
   * Comprehensive cleanup of all game resources
   */
  cleanup() {
    GameLogger.info('Cleanup', 'Starting comprehensive multiplayer cleanup...');

    try {
      // Cancel animation frame
      if (this.#animationId) {
        cancelAnimationFrame(this.#animationId);
        this.#animationId = null;
        GameLogger.debug('Cleanup', 'Animation frame cancelled');
      }

      // Remove event listeners
      if (this.onDocumentKeyDown) {
        document.removeEventListener('keydown', this.onDocumentKeyDown, true);
        this.onDocumentKeyDown = null;
        GameLogger.debug('Cleanup', 'Keydown listener removed');
      }
      if (this.onDocumentKeyUp) {
        document.removeEventListener('keyup', this.onDocumentKeyUp, true);
        this.onDocumentKeyUp = null;
        GameLogger.debug('Cleanup', 'Keyup listener removed');
      }
      if (this.#resizeHandler) {
        window.removeEventListener('resize', this.#resizeHandler);
        this.#resizeHandler = null;
        GameLogger.debug('Cleanup', 'Resize listener removed');
      }

      // Close WebSocket connection
      if (this.#pongSocket) {
        GameLogger.info('Network', 'Closing WebSocket connection');
        this.#pongSocket.close();
        this.#pongSocket = null;
        GameLogger.debug('Cleanup', 'WebSocket connection closed');
      }

      // Clean up UI elements
      this.cleanupUIElements();
    } catch (error) {
      GameLogger.error('Cleanup', 'Error during initial cleanup phase', error);
    }

    try {
      // Dispose Three.js objects properly
      this.disposeThreeJS();

      // Dispose shared materials
      if (this.sharedMaterials) {
        this.sharedMaterials.dispose();
        GameLogger.debug('Cleanup', 'Shared materials disposed');
      }

      // Clean up loaders
      if (this.#ktx2Loader) {
        this.#ktx2Loader.dispose();
        this.#ktx2Loader = null;
        GameLogger.debug('Cleanup', 'KTX2 loader disposed');
      }
      if (this.loaderModel) {
        this.loaderModel = null;
        GameLogger.debug('Cleanup', 'Model loader cleared');
      }

      GameLogger.info('Cleanup', 'Multiplayer cleanup completed successfully');
    } catch (error) {
      GameLogger.error('Cleanup', 'Error during final cleanup phase', error);
    }
  }

  /**
   * Comprehensive Three.js object disposal to prevent memory leaks
   */
  disposeThreeJS() {
    try {
      GameLogger.info('Cleanup', 'Starting Three.js object disposal...');

      // Dispose all registered objects in render optimizer
      if (this.renderOptimizer) {
        [...this.renderOptimizer.staticObjects, ...this.renderOptimizer.dynamicObjects].forEach((item) => {
          this.disposeObject3D(item.object);
        });

        // Clear optimizer arrays
        this.renderOptimizer.staticObjects = [];
        this.renderOptimizer.dynamicObjects = [];
        this.renderOptimizer = null;
        GameLogger.debug('Cleanup', 'Render optimizer disposed');
      }

      // Dispose scene objects if scene exists
      if (this.scene) {
        this.scene.traverse((object) => {
          this.disposeObject3D(object);
        });

        this.scene.clear();
        this.scene = null;
        GameLogger.debug('Cleanup', 'Scene disposed');
      }

      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer.domElement.remove();
        this.renderer = null;
        GameLogger.debug('Cleanup', 'Renderer disposed');
      }

      GameLogger.info('Cleanup', 'Three.js disposal completed');
    } catch (error) {
      GameLogger.error('Cleanup', 'Error during Three.js disposal', error);
    }
  }

  /**
   * Dispose individual Three.js object and its resources
   * @param {THREE.Object3D} object - Object to dispose
   */
  disposeObject3D(object) {
    if (!object) return;

    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose();
    }

    // Dispose material(s)
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(object.material);
      }
    }

    // Dispose textures
    if (object.material?.map) object.material.map.dispose();
    if (object.material?.normalMap) object.material.normalMap.dispose();
    if (object.material?.bumpMap) object.material.bumpMap.dispose();
    if (object.material?.envMap) object.material.envMap.dispose();
  }

  /**
   * Dispose Three.js material and its textures
   * @param {THREE.Material} material - Material to dispose
   */
  disposeMaterial(material) {
    if (!material) return;

    // Dispose all textures in material
    Object.keys(material).forEach((key) => {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    });

    material.dispose();
  }

  /**
   * Clean up UI elements to prevent memory leaks
   */
  cleanupUIElements() {
    const uiElements = ['scoreElement', 'timerElement', 'buffIconElement', 'lifePointElement', 'overlay'];

    uiElements.forEach((elementName) => {
      if (this[elementName]) {
        if (this[elementName].parentNode) {
          this[elementName].parentNode.removeChild(this[elementName]);
        }
        this[elementName] = null;
        GameLogger.debug('Cleanup', `${elementName} cleaned up`);
      }
    });
  }

  safeSend(message) {
    if (this.#pongSocket && this.#pongSocket.readyState === WebSocket.OPEN) {
      this.#pongSocket.send(message);
    }
  }

  /**
   * Create and configure the WebGL renderer with error handling
   * @returns {THREE.WebGLRenderer} Configured renderer instance
   */
  async createRenderer() {
    try {
      // Test WebGL support before creating renderer
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) {
        throw new Error('WebGL not supported');
      }

      // Create renderer with optimized settings
      const renderer = new THREE.WebGLRenderer({
        alpha: true, // Enable transparency
        antialias: true, // Smooth edges
        powerPreference: 'high-performance', // Use dedicated GPU if available
      });

      // Handle WebGL context loss/restore events
      renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.handleError('WEBGL_CONTEXT_LOST');
      });

      renderer.domElement.addEventListener('webglcontextrestored', () => {
        window.location.reload(); // Reload page to restore context
      });

      return renderer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle various game errors with appropriate user feedback
   * @param {string} errorType - Type of error that occurred
   * @param {Error} error - Optional error object
   */
  handleError(errorType, error = null) {
    GameLogger.error(`Game Error [${errorType}]:`, '', error);

    // Hide game UI when error occurs
    this.hideGameUI();

    // Define user-friendly error messages
    const errorMessages = {
      WEBGL_NOT_SUPPORTED: {
        title: 'Graphics Error',
        message: "Your device doesn't support WebGL. Please update your browser or graphics drivers.",
      },
      WEBGL_CONTEXT_LOST: {
        title: 'Graphics Context Lost',
        message: 'The graphics context was lost. The page will reload automatically.',
      },
      MODEL_LOADING_FAILED: {
        title: 'Loading Error',
        message: 'Failed to load 3D models. Please check your internet connection.',
      },
      GAME_INIT_FAILED: {
        title: 'Game Failed to Load',
        message: 'The game encountered an error while loading. Please try refreshing the page.',
      },
    };

    const config = errorMessages[errorType] || {
      title: 'Unknown Error',
      message: 'An unexpected error occurred. Please refresh the page.',
    };

    // Show error overlay with reload option
    this.overlay?.show(OVERLAY_TYPE.ERROR, {
      ...config,
      actions: [
        {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      ],
    });

    // Auto-reload for context loss after 3 seconds
    if (errorType === 'WEBGL_CONTEXT_LOST') {
      setTimeout(() => window.location.reload(), 3000);
    }
  }

  /**
   * Load and configure a 3D model with fallback handling
   * @param {string} modelName - Path to the model file
   * @param {number} posX - X position
   * @param {number} posY - Y position
   * @param {number} posZ - Z position
   * @param {number} scaleX - X scale
   * @param {number} scaleY - Y scale
   * @param {number} scaleZ - Z scale
   * @returns {THREE.Object3D} Loaded model or fallback
   */
  async createModelLoader(modelName, posX, posY, posZ, scaleX, scaleY, scaleZ) {
    try {
      // Load GLTF model with progress tracking
      const gltf = await new Promise((resolve, reject) => {
        this.loaderModel.load(
          modelName,
          resolve,
          (progress) => {
            GameLogger.debug(
              'ModelLoader',
              `Loading ${modelName}: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`,
            );
          },
          reject,
        );
      });

      // Validate loaded model
      if (!gltf?.scene) {
        throw new Error(`Invalid GLTF file: ${modelName}`);
      }

      const model = gltf.scene;
      // Configure shadows for all meshes
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      // Create container and apply transformations
      const modelGenerated = new THREE.Object3D();
      model.position.set(posX, posY, posZ);
      model.scale.set(scaleX, scaleY, scaleZ);
      modelGenerated.add(model);

      GameLogger.info('ModelLoader', `Successfully loaded model: ${modelName}`);
      return modelGenerated;
    } catch (error) {
      GameLogger.warn('ModelLoader', `Failed to load model ${modelName}, using fallback`, error);
      return this.createFallbackModel(posX, posY, posZ, scaleX, scaleY, scaleZ);
    }
  }

  /**
   * Create a simple fallback model when GLTF loading fails
   * @param {number} posX - X position
   * @param {number} posY - Y position
   * @param {number} posZ - Z position
   * @param {number} scaleX - X scale
   * @param {number} scaleY - Y scale
   * @param {number} scaleZ - Z scale
   * @returns {THREE.Object3D} Basic cube model
   */
  createFallbackModel(posX, posY, posZ, scaleX, scaleY, scaleZ) {
    // Create a simple gray cube as fallback
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);

    // Apply transformations and shadow settings
    mesh.position.set(posX, posY, posZ);
    mesh.scale.set(scaleX, scaleY, scaleZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const container = new THREE.Object3D();
    container.add(mesh);
    return container;
  }

  /**
   * Load texture with fallback protection
   * @param {string} texturePath - Path to the texture file
   * @param {number} fallbackColor - Fallback color as hex (default: brown for ground)
   * @returns {THREE.Texture|THREE.MeshPhongMaterial} Loaded texture or fallback material
   */
  async createTextureLoader(texturePath, fallbackColor) {
    try {
      // Load texture with progress tracking
      const texture = await new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          texturePath,
          resolve,
          (progress) => {
            GameLogger.debug(
              'TextureLoader',
              `Loading ${texturePath}: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`,
            );
          },
          reject,
        );
      });

      // Validate loaded texture
      if (!texture) {
        throw new Error(`Invalid texture file: ${texturePath}`);
      }

      // Configure texture settings
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(100, 100); // Tile the texture

      GameLogger.info('TextureLoader', `Successfully loaded texture: ${texturePath}`);
      return texture;
    } catch (error) {
      GameLogger.warn('TextureLoader', `Failed to load texture ${texturePath}, using fallback color`, error);
      return this.createFallbackTexture(fallbackColor);
    }
  }

  /**
   * Create a fallback texture when texture loading fails
   * @param {number} fallbackColor - Fallback color as hex
   * @returns {THREE.MeshPhongMaterial} Solid color material
   */
  createFallbackTexture(fallbackColor) {
    GameLogger.warn('TextureLoader', `Creating fallback texture with color: #${fallbackColor.toString(16)}`);
    return new THREE.MeshPhongMaterial({ color: fallbackColor });
  }

  /**
   * Create optimized fallback player model when pedro model fails to load
   * @param {number} posX - X position for the player
   * @param {number} posZ - Z position for the player
   * @returns {THREE.Object3D} Simple geometric player representation
   */
  createFallbackPlayerModel(posX, posZ) {
    GameLogger.warn('PlayerModel', 'Creating fallback player model');

    // Create a capsule-like player representation
    const playerModel = new THREE.Object3D();

    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(1, 1, 8, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.75, 0);
    body.castShadow = true;
    body.receiveShadow = true;

    // Assemble the player model
    playerModel.add(body);

    // Apply scaling and positioning
    playerModel.scale.set(0.5, 0.5, 0.5);
    playerModel.position.set(posX, 0, posZ);

    // Set rotation based on position (same logic as pedro model)
    if (posZ < 0) {
      playerModel.rotation.y = this.degreesToRadians(55);
      playerModel.position.z = posZ - 1;
      playerModel.position.x += 1;
    } else {
      playerModel.rotation.y = this.degreesToRadians(235);
      playerModel.position.z = posZ + 1;
      playerModel.position.x -= 1;
    }

    return playerModel;
  }

  /**
   * Load pedro player model with optimized fallback protection
   * @param {number} posX - X position for the player
   * @param {number} posZ - Z position for the player
   * @param {THREE.Scene} scene - Scene to add the model to
   * @returns {Promise<Object>} Player model object with animation support
   */
  async loadPedroModelWithFallback(posX, posZ, scene) {
    const gltfStore = { mixer: null, action: new Array(8).fill(null) };
    let playerGlb;

    try {
      GameLogger.info('PlayerModel', 'Loading pedro model...');

      // Load with 8-second timeout
      const gltf = await Promise.race([
        new Promise((resolve, reject) => this.loaderModel.load(pedro, resolve, undefined, reject)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
      ]);

      if (gltf?.scene && gltf?.animations?.length > 0) {
        GameLogger.info('PlayerModel', 'Pedro model loaded successfully');

        // Setup pedro model
        playerGlb = new THREE.Object3D();
        const model = gltf.scene;

        // Configure shadows
        model.traverse((node) => node.isMesh && (node.castShadow = true));

        // Setup animations
        gltfStore.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((anim, i) => {
          if (i < 8) {
            try {
              gltfStore.action[i] = gltfStore.mixer.clipAction(anim, model);
              // Configure specific durations
              if (i === 1) {
                gltfStore.action[i].setLoop(THREE.LoopOnce, 1);
                gltfStore.action[i].setDuration(0.4);
              } else if ([0, 5, 6, 7].includes(i)) {
                gltfStore.action[i].setDuration(0.18);
              }
            } catch (error) {
              GameLogger.warn('PlayerModel', `Animation ${i} setup failed`, error);
            }
          }
        });

        // Start idle animation
        if (gltfStore.action[2]) gltfStore.action[2].play();

        model.position.set(posX, 0, 0);
        model.scale.set(0.5, 0.5, 0.5);
        playerGlb.add(model);
      } else {
        throw new Error('Invalid model data');
      }
    } catch (error) {
      GameLogger.warn('PlayerModel', 'Using fallback model', error);
      playerGlb = this.createFallbackPlayerModel(posX, posZ);
    }

    // Position player based on side
    if (posZ < 0) {
      playerGlb.rotation.y = this.degreesToRadians(55);
      playerGlb.position.z = posZ - 1;
      playerGlb.position.x += 1;
    } else {
      playerGlb.rotation.y = this.degreesToRadians(235);
      playerGlb.position.z = posZ + 1;
      playerGlb.position.x -= 1;
    }

    scene.add(playerGlb);
    return { playerGlb, gltfStore, currentAction: 2 };
  }

  /**
   * Handle optimized animation transitions for player models
   * @param {Object} ourBumper - Player object
   * @param {number} currentAction - Current animation index
   * @param {number} nextAction - Next animation index
   * @param {number} fadeTime - Transition duration
   */
  handleAnimations(ourBumper, currentAction, nextAction, fadeTime) {
    if (!ourBumper?.playerGlb || currentAction === nextAction) return;

    const ourBumperIndex = ourBumper.dirZ < 1 ? 0 : 1;

    // Handle animations if pedro model is loaded
    if (this.isAnimationSystemReady(ourBumper)) {
      try {
        const { action } = ourBumper.gltfStore;
        if (action[currentAction]) action[currentAction].fadeOut(fadeTime);
        if (action[nextAction]) {
          action[nextAction].reset().fadeIn(fadeTime).play();
        }
      } catch (error) {
        GameLogger.warn('Animation', `Animation transition failed: ${error.message}`);
      }
    }

    // Update action state and rotation
    ourBumper.currentAction = nextAction;
    if (this.modelRotation) {
      try {
        ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][ourBumper.modelChoosen || 0];
      } catch (error) {
        GameLogger.warn('Animation', 'Rotation update failed', error);
      }
    }
  }

  /**
   * Check if animation system is ready and pedro model loaded
   * @param {Object} bumper - Player object to check
   * @returns {boolean} True if animations are available
   */
  isAnimationSystemReady(bumper) {
    return bumper?.gltfStore?.mixer && bumper.gltfStore.action;
  }

  /**
   * Create keydown event handler for multiplayer game controls
   * @param {Object} clientState - Client state object
   * @returns {Function} Event handler function
   */
  createOnDocumentKeyDown(clientState) {
    return (e) => {
      const tag = e.target.tagName.toLowerCase();
      // Ignore key events on form elements
      if (tag === 'input' || tag === 'textarea') {
        return;
      }
      if (e.defaultPrevented) {
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (clientState.bumper?.dirZ > 0) clientState.movesLeft = true;
        else clientState.movesRight = true;
        // Handle animations for player models
        this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 0, 0.1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (clientState.bumper?.dirZ > 0) clientState.movesRight = true;
        else clientState.movesLeft = true;
        // Handle animations for player models
        this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 5, 0.1);
      }

      e.preventDefault();
    };
  }

  /**
   * Create keyup event handler for multiplayer game controls
   * @param {Object} clientState - Client state object
   * @returns {Function} Event handler function
   */
  createOnDocumentKeyUp(clientState) {
    return (e) => {
      if (e.defaultPrevented) {
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (clientState.bumper?.dirZ > 0) clientState.movesLeft = false;
        else clientState.movesRight = false;
        // Return to idle animation
        this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 2, 0.5);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (clientState.bumper?.dirZ > 0) clientState.movesRight = false;
        else clientState.movesLeft = false;
        // Return to idle animation
        this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 2, 0.5);
      }

      e.preventDefault();
    };
  }

  /**
   * Helper method to create UI elements with optional configuration
   * @param {string} propName - Property name to store the element
   * @param {string} tagName - HTML tag name to create
   * @param {Function} configCallback - Optional configuration function
   * @param {HTMLElement} parent - Parent element (defaults to this)
   */
  createUIElement(propName, tagName, configCallback = null, parent = this) {
    if (!this[propName]) {
      this[propName] = document.createElement(tagName);

      // Apply configuration if provided
      if (configCallback) {
        configCallback(this[propName]);
      }

      // Append to specified parent or default to game element
      if (parent && parent !== this) {
        if (!parent.querySelector(tagName)) {
          parent.appendChild(this[propName]);
        }
      } else {
        this.appendChild(this[propName]);
      }

      GameLogger.debug('UIInit', `Created ${propName}`);
    }
  }

  /**
   * Hide all game UI elements (used during errors or game end)
   */
  hideGameUI() {
    GameLogger.info('UI', 'Hiding game UI');

    const elements = [
      { element: this.scoreElement, name: 'scoreElement' },
      { element: this.timerElement, name: 'timerElement' },
      { element: this.buffIconElement, name: 'buffIconElement' },
      { element: this.lifePointElement, name: 'lifePointElement' },
    ];

    elements.forEach(({ element, name }) => {
      if (element) {
        element.style.display = 'none';
        GameLogger.debug('UI', `Hidden ${name}`);
      }
    });
  }

  /**
   * Show all game UI elements
   */
  showGameUI() {
    GameLogger.info('UI', 'Showing game UI');

    const elements = [
      { element: this.scoreElement, name: 'scoreElement' },
      { element: this.timerElement, name: 'timerElement' },
      { element: this.buffIconElement, name: 'buffIconElement' },
      { element: this.lifePointElement, name: 'lifePointElement' },
    ];

    elements.forEach(({ element, name }) => {
      if (element) {
        element.style.display = '';
        GameLogger.debug('UI', `Shown ${name}`);
      }
    });
  }

  /**
   * Initialize 3D model loaders with optimization support
   * @param {THREE.WebGLRenderer} renderer - WebGL renderer instance
   */
  async initLoaders(renderer) {
    try {
      GameLogger.info('LoaderInit', 'Initializing 3D model loaders...');

      // Set up KTX2 loader for compressed textures
      this.#ktx2Loader = new KTX2Loader().setTranscoderPath('/libs/basis/').detectSupport(renderer);
      GameLogger.debug('LoaderInit', 'KTX2 loader configured');

      // Wait for MeshOpt decoder to be ready
      await MeshoptDecoder.ready;
      GameLogger.debug('LoaderInit', 'MeshOpt decoder ready');

      // Configure GLTF loader with optimizations
      this.loaderModel = new GLTFLoader();
      this.loaderModel.setKTX2Loader(this.#ktx2Loader);
      this.loaderModel.setMeshoptDecoder(MeshoptDecoder);

      GameLogger.info('LoaderInit', 'All 3D loaders initialized successfully');
    } catch (error) {
      GameLogger.error('LoaderInit', 'Failed to initialize 3D loaders', error);
      throw new Error(`Failed to initialize 3D loaders: ${error.message}`);
    }
  }

  /**
   * Main multiplayer game logic and 3D scene initialization
   * Sets up the advanced 3D scene, physics, networking, and game loop
   * @returns {Array} Game components [camera, renderer, animate]
   */
  async game() {
    // MULTIPLAYER GAME CONSTANTS
    const WALL_LEFT_X = 10; // Left wall position
    const WALL_RIGHT_X = -WALL_LEFT_X; // Right wall position
    const WALL_WIDTH_HALF = 0.5; // Half wall thickness
    const BUMPER_LENGTH_HALF = 2.5; // Half bumper length
    const BUMPER_WIDTH_HALF = 0.5; // Half bumper width
    const BUMPER_SPEED_PER_SECOND = 15.0; // Bumper movement speed
    const BALL_INITIAL_VELOCITY = 0.25; // Initial ball velocity
    const SPEED_DECREASE_ENEMY_FACTOR = 0.5; // Speed reduction factor for debuffs
    const handleAnimations = this.handleAnimations.bind(this);
    const renderOptimizer = this.renderOptimizer;

    // Network simulation constants
    const SERVER_TICK_RATE = 30;
    const SERVER_TICK_INTERVAL = 1.0 / SERVER_TICK_RATE;

    // Initialize advanced WebGL renderer
    const renderer = await this.createRenderer();
    if (!renderer) {
      throw new Error('Failed to create WebGL renderer');
    }

    // Configure renderer settings
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true; // Enable shadow rendering
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better quality
    renderer.setClearColor(0x8e4f5e, 1); // Set background color
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    // Scene setup with atmospheric effects
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8e4f5e, 0.008); // Add distance fog for depth

    await this.initLoaders(renderer);
    // const loader = new GLTFLoader();

    // Camera configuration for optimal multiplayer game view
    var camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);

    // Initialize performance optimization systems early
    this.initSharedMaterials();
    this.initRenderOptimizations(camera, scene);

    // Advanced lighting setup for realistic rendering

    // Main sun light (key light)
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    sunLight.position.set(25, 35, -50);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    // High resolution shadow map for quality
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -60;

    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.3);

    // Fill light to soften shadows
    const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.4);
    fillLight.position.set(30, 20, -10);
    fillLight.castShadow = false;

    // Add all lights to scene
    scene.add(sunLight);
    scene.add(sunLight.target);
    scene.add(ambientLight);
    scene.add(fillLight);

    // Math constants
    const pi = Math.PI;
    const degreesToRadians = this.degreesToRadians;

    // Helper function for model creation and scene addition
    const modelCreate = async (posX, posY, posZ, scaleX, scaleY, scaleZ, modelName) => {
      const modelGenerated = await this.createModelLoader(modelName, posX, posY, posZ, scaleX, scaleY, scaleZ);
      scene.add(modelGenerated);
      return modelGenerated;
    };

    const cardboardModels = [];
    const cardboardModelStates = [cardboard, cardboard2, cardboard3];

    // Environment setup - Background elements for immersive experience

    // Create desert landscape with cacti
    const cacti = [];
    const placedCacti = []; // Track positions to avoid overlap
    const minDistance = 8; // Minimum distance between cacti

    // Factory function for creating randomly rotated cacti
    const CactusFactory = async (posX, posY, posZ) => {
      const cactusGlb = await modelCreate(posZ, posY, posX, 1.8, 1.8, 1.8, cactus);
      cactusGlb.rotateY(degreesToRadians(Math.random() * 360)); // Random rotation
      return { cactusGlb };
    };

    // Generate safe positions for cacti (avoiding play area and other cacti)
    const getSafeCactusPosition = () => {
      let x;
      let z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 140;
        attempts++;
        if (attempts > 50) break; // Prevent infinite loops
      } while (
        // Avoid the playing field area
        (x > -13.65 && x < 13.65 && z > -15 && z < 15) ||
        // Maintain minimum distance from other cacti
        placedCacti.some((cactus) => Math.sqrt((x - cactus.x) ** 2 + (z - cactus.z) ** 2) < minDistance)
      );
      return { x, z };
    };

    // Create desert landscape with fewer cacti for multiplayer performance
    const cactusPromises = [];
    for (let index = 0; index < 30; index++) {
      // Reduced from 60 for better multiplayer performance
      const pos = getSafeCactusPosition();
      placedCacti.push(pos);
      cactusPromises.push(CactusFactory(pos.x, 0, pos.z));
    }

    // Load all cacti in parallel
    try {
      const loadedCacti = await Promise.all(cactusPromises);
      loadedCacti.forEach((cactus, index) => {
        cacti[index] = cactus;
        if (this.renderOptimizer && cactus.cactusGlb) {
          this.renderOptimizer.registerStatic(cactus.cactusGlb, 'cactus');
        }
      });
    } catch (error) {
      GameLogger.warn('CactusFactory', `Some cacti failed to load: ${error}`);
    }

    // Create layered hills for background depth
    const createHill = (posX, posZ, width, height) => {
      // Create hill base (wider, shorter)
      const baseGeometry = new THREE.CylinderGeometry(width * 1.5, width * 2, height * 0.3, 8);
      const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x3a251a });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.set(posX, -height * 0.1, posZ);
      base.receiveShadow = true;
      scene.add(base);

      // Create hill top (narrower, taller)
      const hillGeometry = new THREE.CylinderGeometry(width * 0.8, width, height, 8);
      const hillMaterial = new THREE.MeshPhongMaterial({ color: 0x3a251a });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(posX, height * 0.3, posZ);
      hill.receiveShadow = true;
      scene.add(hill);

      // Register static objects for frustum culling
      if (this.renderOptimizer) {
        this.renderOptimizer.registerStatic(base, 'hill_base');
        this.renderOptimizer.registerStatic(hill, 'hill_top');
      }

      return hill;
    };

    // Place hills at various positions for scenic background
    createHill(-180, 250, 60, 25);
    createHill(150, 280, 70, 30);
    createHill(-100, 300, 50, 20);
    createHill(280, 200, 80, 35);
    createHill(-250, 220, 65, 22);
    createHill(-180, -250, 60, 25);
    createHill(150, -280, 70, 30);
    createHill(-100, -300, 50, 20);
    createHill(280, -200, 80, 35);
    createHill(-250, -220, 65, 22);

    // Create ground plane with protected texture loading
    const createGroundPlane = async () => {
      // Load ground texture with fallback protection
      const groundMaterial = await this.createTextureLoader(groundtexture, 0xaf7a43); // Brown fallback color

      // Create ground geometry
      const groundGeometry = new THREE.PlaneGeometry(2000, 2000);

      // Create ground mesh with either texture or fallback material
      let ground;
      if (groundMaterial.isTexture) {
        // If texture loaded successfully, create material with texture
        const material = new THREE.MeshPhongMaterial({
          map: groundMaterial,
          color: 0xd4a574, // Desert sand color
          depthWrite: true,
        });
        ground = new THREE.Mesh(groundGeometry, material);
      } else {
        // If fallback material, use it directly
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
      }

      // Configure ground properties
      ground.rotateX(-pi / 2); // Rotate to be horizontal
      ground.receiveShadow = true; // Allow shadows to be cast on ground

      scene.add(ground);
      // Register ground for frustum culling
      if (this.renderOptimizer) {
        this.renderOptimizer.registerStatic(ground, 'ground');
      }
      GameLogger.info('Ground', 'Ground plane created successfully');
      return ground;
    };

    // Create the ground plane
    await createGroundPlane();

    // Enhanced coin with 3D model (with fallback to geometry)
    const Coin = await (async (posX, posY, posZ) => {
      // Try to load 3D coin model
      const CoinGlb = await modelCreate(0, 0, 0, 0.45, 0.45, 0.45, coin);
      CoinGlb.position.set(posX, posY, posZ);

      const cylinderUpdate = new THREE.Vector3(posX, posY, posZ);
      const velocity = new THREE.Vector3(0.01 * this.#state.gameOptions.game_speed, 0, 0);
      let lenghtHalf = 0.25;

      return {
        get lenghtHalf() {
          return lenghtHalf;
        },
        set lenghtHalf(newLenghtHalf) {
          lenghtHalf = newLenghtHalf;
        },
        cylinderMesh: CoinGlb,
        cylinderUpdate,
        velocity,
      };
    })(-100.0, 1, 0);

    // Enhanced ball with 3D model (with fallback to geometry)
    const Ball = await (async (posX, posY, posZ) => {
      // Try to load 3D bullet model for the ball
      const bulletGlb = await modelCreate(posX, posY, posZ, 1, 1, 1, bullet);
      bulletGlb.rotateX(pi / 2);

      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * this.#state.gameOptions.game_speed);
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);

      return {
        bulletGlb, // Keep original property name for compatibility
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 0, 0);

    // Create boundary fences around the playing field
    const WallFactory = async (posX, posY, posZ) => {
      const fenceGlb = await modelCreate(posX, posY, posZ, 0.8, 0.5, 1, fence);
      fenceGlb.rotateY(-pi / 2); // Rotate to face inward

      if (this.renderOptimizer && fenceGlb) {
        this.renderOptimizer.registerStatic(fenceGlb, 'wall');
      }
      return { fenceGlb };
    };

    // Place fences along both goal lines
    await Promise.all([
      WallFactory(0, 1.3, 9.65), // Top center
      WallFactory(6, 1.3, 9.65), // Top right
      WallFactory(-6, 1.3, 9.65), // Top left
      WallFactory(6, 1.3, -9.65), // Bottom right
      WallFactory(-6, 1.3, -9.65), // Bottom left
      WallFactory(0, 1.3, -9.65), // Bottom center
    ]);

    // Enhanced Bumper Factory with multiple furniture models (exactly like Game.js)
    // This will be called after game options are received
    const BumperFactory = async (posX, posY, posZ) => {
      const isGameCool = this.#state.gameOptions.cool_mode;

      let _ = {};
      let modelsGlb;

      const tableGlb = await modelCreate(0.04, 0.45, 0, 0.48, 0.5, 0.5, table);
      if (isGameCool == true) {
        const dressingGlb = await modelCreate(0.3, 0, 0, 0.7, 0.3031, 0.6788, dressing);
        const couchGlb = await modelCreate(0.5, -2.0795, -7.8925, 1.4, 1, 1.23, couch);
        const chairGlb = await modelCreate(-0.1, 0.42, -0.1, 1.35, 0.9, 1.2, chair);
        if (posZ < 0) {
          couchGlb.rotation.x = pi / 2;
          couchGlb.rotation.y = -pi / 2;
          chairGlb.rotation.z = pi;
        } else {
          couchGlb.rotation.x = -pi / 2;
          couchGlb.rotation.y = pi / 2;
        }
        couchGlb.rotation.z = pi;
        chairGlb.rotation.x = -pi / 2;
        dressingGlb.rotation.z = -pi / 2;
        dressingGlb.rotation.y = -pi / 2;
        modelsGlb = [tableGlb, couchGlb, chairGlb, dressingGlb];
      } else modelsGlb = [tableGlb];

      // Create player model with animation
      const playerModelData = await this.loadPedroModelWithFallback(posX, posZ, scene);
      const playerGlb = playerModelData.playerGlb;

      // Update gltfStore with loaded data
      _ = playerModelData.gltfStore;

      if (posZ < 0) {
        tableGlb.rotation.z = pi;
      }

      modelsGlb.forEach((element) => {
        element.castShadow = true;
        element.receiveShadow = true;
        element.position.x = posX;
        element.position.y = posY;
        element.position.z = posZ;
        element.visible = false;
      });
      tableGlb.rotation.x = -pi / 2;
      modelsGlb[0].visible = true;

      const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
      const dirZ = -Math.sign(posZ);
      let lenghtHalf = BUMPER_LENGTH_HALF;
      let modelChoosen = 0;
      let widthHalf = BUMPER_WIDTH_HALF;
      let controlReverse = false;
      let speed = BUMPER_SPEED_PER_SECOND;
      let score = 0;
      let currentAction = 2;

      return {
        modelsGlb,
        tableGlb,
        cubeUpdate,
        playerGlb,
        gltfStore: _,
        cubeMesh: tableGlb, // For compatibility with existing code

        get speed() {
          return speed;
        },
        set speed(newSpeed) {
          speed = newSpeed;
        },
        get modelChoosen() {
          return modelChoosen;
        },
        set modelChoosen(newModelChoosen) {
          modelChoosen = newModelChoosen;
        },
        get currentAction() {
          return currentAction;
        },
        set currentAction(newCurrentAction) {
          currentAction = newCurrentAction;
        },
        get score() {
          return score;
        },
        set score(newScore) {
          score = newScore;
        },
        get controlReverse() {
          return controlReverse;
        },
        set controlReverse(newControlReverse) {
          controlReverse = newControlReverse;
        },
        get lenghtHalf() {
          return lenghtHalf;
        },
        set lenghtHalf(newLenghtHalf) {
          lenghtHalf = newLenghtHalf;
        },
        get widthHalf() {
          return widthHalf;
        },
        set widthHalf(newWidthHalf) {
          widthHalf = newWidthHalf;
        },
        get dirZ() {
          return dirZ;
        },
      };
    };

    // Bumpers will be created after game options are received
    let Bumpers = null;

    // Register dynamic objects for optimized rendering
    if (this.renderOptimizer) {
      // Register ball as dynamic object
      this.renderOptimizer.registerDynamic(Ball.bulletGlb, 'ball');

      // Register coin as dynamic object
      this.renderOptimizer.registerDynamic(Coin.cylinderMesh, 'coin');
    }

    // Enhanced playing field - already created above with textured ground

    const clock = new THREE.Clock();
    let accumulator = 0.0;

    const ENTITY_INTERPOLATION_DELAY = 50;

    // used as keys for interpolation buffer
    const ENTITY_KEYS = {
      PLAYER: 'player',
      OPPONENT: 'opponent',
      BALL: 'ball',
      COIN: 'coin',
    };

    const serverState = {
      bumper_1: { x: 0, z: -9, score: 0, buff_or_debuff_target: false, move_id: -1, timestamp: -1 },
      bumper_2: { x: 0, z: 9, score: 0, buff_or_debuff_target: false, move_id: -1, timestamp: -1 },
      ball: {
        x: 0,
        z: 0,
        velocity: { x: 0, z: 0 },
        temporal_speed: { x: 1, z: 1 },
      },
      coin: { x: -100, z: 1 },
      current_buff_or_debuff: 0,
      current_buff_or_debuff_remaining_time: 0.0,
      is_someone_scored: false,
      elapsed_seconds: 0,
      time_limit_reached: false,
    };

    // stores information that is either specific to the player, or necessary for the correct rendering
    const clientState = {
      playerId: '',
      playerNumber: -1,
      enemyNumber: -1,
      bumper: null,
      movesLeft: false,
      movesRight: false,
      enemyBumper: null,
      pendingInputs: [],
      inputSequenceNumber: 0,
      playerInterpolationBuffer: [], // Simple array for player positions
      esntitiesInterpolationBuffer: [], // Circular buffer for entities
    };

    const Buff = {
      NO_BUFF: 0,
      CONTROL_REVERSE_ENEMY: 1,
      SPEED_DECREASE_ENEMY: 2,
      SHORTEN_ENEMY: 3,
      ELONGATE_PLAYER: 4,
      ENLARGE_PLAYER: 5,
    };

    this.#pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');

    const applyInputToBumper = (input, bumper, deltaTime) => {
      if (!input.action) return;

      let movement = 0;
      if (
        (input.action === 'move_left' && !bumper.controlReverse) ||
        (input.action === 'move_right' && bumper.controlReverse)
      ) {
        movement = bumper.speed * deltaTime;
      } else if (
        (input.action === 'move_right' && !bumper.controlReverse) ||
        (input.action === 'move_left' && bumper.controlReverse)
      ) {
        movement = -bumper.speed * deltaTime;
      }

      const newX = bumper.cubeUpdate.x + movement;
      const leftLimit = WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lenghtHalf;
      const rightLimit = WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lenghtHalf;
      const finalX = Math.max(leftLimit, Math.min(rightLimit, newX));

      bumper.cubeUpdate.x = finalX;
    };

    const sendCurrentInput = (timestamp) => {
      let action = null;
      if (clientState.movesLeft && !clientState.movesRight) {
        action = 'move_left';
      } else if (clientState.movesRight && !clientState.movesLeft) {
        action = 'move_right';
      }
      if (action) {
        const sequenceNumber = ++clientState.inputSequenceNumber;
        const input = {
          sequenceNumber,
          action,
          timestamp: timestamp,
        };

        clientState.pendingInputs.push(input);

        this.safeSend(
          JSON.stringify({
            action: action,
            move_id: sequenceNumber,
            player_id: clientState.playerId,
            timestamp: timestamp,
          }),
        );
      }
    };

    // player and server entities interpolation buffer are updated separately:
    // server entities when state form server arrives
    // player entitiy when player moves
    function updateEntitiesInterpolationBuffer(timestamp) {
      const opponent = clientState.enemyNumber === 1 ? serverState.bumper_1.x : serverState.bumper_2.x;
      const ball = { x: serverState.ball.x, z: serverState.ball.z };
      const coin = serverState.coin ? { x: serverState.coin.x, z: serverState.coin.z } : null;

      const bufferEntry = {
        opponent,
        ball,
        coin,
        timestamp,
      };

      clientState.esntitiesInterpolationBuffer.push(bufferEntry);

      if (clientState.esntitiesInterpolationBuffer.length > 10) {
        clientState.esntitiesInterpolationBuffer.shift();
      }
    }

    function updatePlayerBuffer(playerPosition, timestamp) {
      const bufferEntry = {
        position: playerPosition,
        timestamp,
      };

      clientState.playerInterpolationBuffer.push(bufferEntry);

      if (clientState.playerInterpolationBuffer.length > 10) {
        clientState.playerInterpolationBuffer.shift();
      }
    }

    function getInterpolated(entityKey, renderTime) {
      let interpolationBuffer;

      if (entityKey === ENTITY_KEYS.PLAYER) {
        interpolationBuffer = clientState.playerInterpolationBuffer;
      } else {
        interpolationBuffer = clientState.esntitiesInterpolationBuffer;
      }

      if (interpolationBuffer.length < 2) {
        if (interpolationBuffer.length === 0) return null;
        return entityKey === ENTITY_KEYS.PLAYER ? interpolationBuffer[0].position : interpolationBuffer[0][entityKey];
      }

      let fromEntry = null;
      let toEntry = null;

      for (let i = 0; i < interpolationBuffer.length - 1; i++) {
        if (interpolationBuffer[i].timestamp <= renderTime && interpolationBuffer[i + 1].timestamp >= renderTime) {
          fromEntry = interpolationBuffer[i];
          toEntry = interpolationBuffer[i + 1];
          break;
        }
      }

      if (!fromEntry || !toEntry) {
        const closestIndex = interpolationBuffer.length - 2;
        if (closestIndex >= 0) {
          fromEntry = interpolationBuffer[closestIndex];
          toEntry = interpolationBuffer[closestIndex + 1];
        } else {
          return entityKey === ENTITY_KEYS.PLAYER
            ? interpolationBuffer[interpolationBuffer.length - 1].position
            : interpolationBuffer[interpolationBuffer.length - 1][entityKey];
        }
      }

      const fromPosition = entityKey === ENTITY_KEYS.PLAYER ? fromEntry.position : fromEntry[entityKey];
      const toPosition = entityKey === ENTITY_KEYS.PLAYER ? toEntry.position : toEntry[entityKey];

      // coin can be null
      if (fromPosition === null && toPosition === null) {
        return null;
      }
      if (fromPosition === null) {
        return toPosition;
      }
      if (toPosition === null) {
        return fromPosition;
      }

      const timeDiff = toEntry.timestamp - fromEntry.timestamp;
      if (timeDiff === 0) {
        return toPosition;
      }

      const alpha = Math.max(0, Math.min(1, (renderTime - fromEntry.timestamp) / timeDiff));

      // bumper positions are stored as numbers, ball and coin as objects
      if (typeof fromPosition === 'number') {
        return fromPosition + (toPosition - fromPosition) * alpha;
      } else {
        return {
          x: fromPosition.x + (toPosition.x - fromPosition.x) * alpha,
          z: fromPosition.z + (toPosition.z - fromPosition.z) * alpha,
        };
      }
    }

    const updateLifePointUI = (data) => {
      if (data.bumper_1.score != serverState.bumper_1.score) {
        const playerNumberToUpdate = clientState.playerNumber === 1 ? 1 : 0;
        this.lifePointElement?.updatePoint(
          playerNumberToUpdate,
          20 - (20 / this.#state.gameOptions.score_to_win) * data.bumper_1.score,
        );
      }
      if (data.bumper_2.score != serverState.bumper_2.score) {
        const playerNumberToUpdate = clientState.playerNumber === 2 ? 1 : 0;
        this.lifePointElement?.updatePoint(
          playerNumberToUpdate,
          20 - (20 / this.#state.gameOptions.score_to_win) * data.bumper_2.score,
        );
      }
    };

    const updateScoreUI = (data) => {
      if (data.bumper_1.score != serverState.bumper_1.score) {
        this.scoreElement?.updateScore(0, data.bumper_1.score);
      }
      if (data.bumper_2.score != serverState.bumper_2.score) {
        this.scoreElement?.updateScore(1, data.bumper_2.score);
      }
    };

    const updateTimerUI = (elapsedSeconds) => {
      if (serverState.elapsed_seconds === elapsedSeconds) {
        return;
      }
      this.timerElement?.updateRemainingTime(this.#state.gameOptions.time_limit * 60 - elapsedSeconds);
    };

    function updateServerState(data) {
      if (!data) {
        return;
      }
      serverState.bumper_1.x = data.bumper_1.x;
      serverState.bumper_1.z = data.bumper_1.z;
      serverState.bumper_1.score = data.bumper_1.score;
      serverState.bumper_1.buff_or_debuff_target = data.bumper_1.buff_or_debuff_target;
      serverState.bumper_1.move_id = data.bumper_1.move_id;
      serverState.bumper_1.timestamp = data.bumper_1.timestamp;

      serverState.bumper_2.x = data.bumper_2.x;
      serverState.bumper_2.z = data.bumper_2.z;
      serverState.bumper_2.score = data.bumper_2.score;
      serverState.bumper_2.buff_or_debuff_target = data.bumper_2.buff_or_debuff_target;
      serverState.bumper_2.move_id = data.bumper_2.move_id;
      serverState.bumper_2.timestamp = data.bumper_2.timestamp;

      serverState.ball.x = data.ball.x;
      serverState.ball.z = data.ball.z;
      serverState.ball.velocity.x = data.ball.velocity.x;
      serverState.ball.velocity.z = data.ball.velocity.z;
      serverState.ball.temporal_speed.x = data.ball.temporal_speed.x;
      serverState.ball.temporal_speed.z = data.ball.temporal_speed.z;

      if (data.coin) {
        serverState.coin.x = data.coin.x;
        serverState.coin.z = data.coin.z;
      }

      serverState.current_buff_or_debuff = data.current_buff_or_debuff;
      serverState.current_buff_or_debuff_remaining_time = data.current_buff_or_debuff_remaining_time;
      serverState.is_someone_scored = data.is_someone_scored;
      serverState.elapsed_seconds = data.elapsed_seconds;
      serverState.time_limit_reached = data.time_limit_reached;
    }

    // applies position received from the server, then applies not yet processed inputs
    function reconcileWithServer() {
      if (!clientState.bumper || clientState.playerNumber <= 0) return;

      const myBumperData = clientState.playerNumber === 1 ? serverState.bumper_1 : serverState.bumper_2;
      const lastProcessedMoveId = myBumperData.move_id;

      clientState.bumper.cubeUpdate.x = myBumperData.x;

      // Remove processed inputs and re-apply unprocessed ones
      let i = 0;
      while (i < clientState.pendingInputs.length) {
        const input = clientState.pendingInputs[i];
        if (input.sequenceNumber <= lastProcessedMoveId) {
          clientState.pendingInputs.splice(i, 1);
        } else {
          applyInputToBumper(input, clientState.bumper, SERVER_TICK_INTERVAL);
          i++;
        }
      }
    }

    // Safe model switching with bounds checking to prevent crashes
    const safeModelSwitch = (targetPlayer, newModelIndex) => {
      if (targetPlayer.modelChoosen == newModelIndex) return;

      if (!targetPlayer.modelsGlb || newModelIndex >= targetPlayer.modelsGlb.length) {
        GameLogger.warn(
          'ModelSwitch',
          `Model index ${newModelIndex} out of bounds (array length: ${targetPlayer.modelsGlb?.length}), falling back to index 0`,
        );
        newModelIndex = 0; // Fallback to table model
      }

      // Hide current model
      if (targetPlayer.modelsGlb[targetPlayer.modelChoosen]) {
        targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = false;
      }

      // Switch to new model
      targetPlayer.modelChoosen = newModelIndex;

      // Show new model
      if (targetPlayer.modelsGlb[targetPlayer.modelChoosen]) {
        targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = true;
      }
    };

    // Reset all buff effects when buffs expire
    const resetAllBuffEffects = () => {
      if (!Bumpers) return;
      for (let i = 0; i < Bumpers.length; i++) {
        const bumper = Bumpers[i];

        // Reset control and speed effects
        bumper.controlReverse = false;
        bumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;

        // Reset size effects
        bumper.lenghtHalf = BUMPER_LENGTH_HALF;
        bumper.widthHalf = BUMPER_WIDTH_HALF;

        // Reset model back to table (index 0) with safe switching
        safeModelSwitch(bumper, 0);

        // Reset position if it was modified by buffs
        if (bumper.playerGlb && bumper.cubeUpdate) {
          if (bumper.dirZ < 0) {
            bumper.playerGlb.position.z = bumper.cubeUpdate.z + 1;
            bumper.playerGlb.position.x = bumper.cubeUpdate.x - 1;
          } else {
            bumper.playerGlb.position.z = bumper.cubeUpdate.z - 1;
            bumper.playerGlb.position.x = bumper.cubeUpdate.x + 1;
          }
        }
      }
    };

    const applyBuffEffects = () => {
      if (!Bumpers) return;

      if (serverState.current_buff_or_debuff === Buff.NO_BUFF) {
        resetAllBuffEffects();
        this.buffIconElement?.hide();
        return;
      }
      let targetPlayer = null;
      let isUserAffected = false;
      if (serverState.bumper_1.buff_or_debuff_target) {
        targetPlayer = Bumpers[0];
        isUserAffected = clientState.playerNumber === 1 ? true : false;
      } else if (serverState.bumper_2.buff_or_debuff_target) {
        targetPlayer = Bumpers[1];
        isUserAffected = clientState.playerNumber === 2 ? true : false;
      }

      if (targetPlayer) {
        switch (serverState.current_buff_or_debuff) {
          case Buff.CONTROL_REVERSE_ENEMY:
            targetPlayer.controlReverse = true;
            isUserAffected
              ? this.buffIconElement?.show(BUFF_TYPE.SWITCH)
              : this.buffIconElement?.show(BUFF_TYPE.SWITCH, true);
            break;
          case Buff.SPEED_DECREASE_ENEMY:
            targetPlayer.speed =
              BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed * SPEED_DECREASE_ENEMY_FACTOR;
            isUserAffected
              ? this.buffIconElement?.show(BUFF_TYPE.SLOW)
              : this.buffIconElement?.show(BUFF_TYPE.SLOW, true);
            break;
          case Buff.SHORTEN_ENEMY:
            safeModelSwitch(targetPlayer, 2); // Switch to chair model (index 2)
            targetPlayer.lenghtHalf = 1.25;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.SHORT);
            }
            break;
          case Buff.ELONGATE_PLAYER:
            safeModelSwitch(targetPlayer, 1); // Switch to couch model (index 1)
            targetPlayer.lenghtHalf = 5;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.LONG);
            }
            break;
          case Buff.ENLARGE_PLAYER:
            safeModelSwitch(targetPlayer, 3); // Switch to dressing model (index 3)
            targetPlayer.widthHalf = 1.5;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.LARGE);
            }
            break;
        }
      }
    };

    this.#pongSocket.addEventListener('open', () => {
      GameLogger.info('Success! :3 ');
    });

    let data;
    this.#pongSocket.addEventListener('message', async (e) => {
      data = JSON.parse(e.data);
      switch (data.action) {
        case 'state_updated':
          updateTimerUI(data.state.elapsed_seconds);
          if (
            data.state.is_someone_scored ||
            data.state.bumper_1.score !== serverState.bumper_1.score ||
            data.state.bumper_2.score !== serverState.bumper_2.score
          ) {
            updateScoreUI(data.state);
            updateLifePointUI(data.state);
          }
          updateServerState(data.state);
          reconcileWithServer();
          applyBuffEffects();
          updateEntitiesInterpolationBuffer(Date.now());
          break;
        case 'player_joined':
          log.info('Player joined', data);
          clientState.playerId = data.player_id;
          clientState.playerNumber = data.player_number;
          clientState.enemyNumber = data.player_number == 1 ? 2 : 1;

          clientState.playerNumber === 1
            ? this.scoreElement?.setNames(data.name, data.opponents_name)
            : this.scoreElement?.setNames(data.opponents_name, data.name);
          this.timerElement?.setInitialTimeLimit(data.settings.time_limit * 60);
          this.timerElement?.render();

          // Set game options first
          this.#state.gameOptions = data.settings;
          const gameSpeed = {
            slow: 0.75,
            medium: 1.0,
            fast: 1.25,
          };

          this.#state.gameOptions.game_speed = gameSpeed[data.settings.game_speed];

          // Now create bumpers with the correct game options
          if (!Bumpers) {
            Bumpers = await Promise.all([BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)]);
          }
          if (this.renderOptimizer) {
            if (Bumpers[0].playerGlb) {
              this.renderOptimizer.registerDynamic(Bumpers[0].playerGlb, 'player1');
            }
            if (Bumpers[1].playerGlb) {
              this.renderOptimizer.registerDynamic(Bumpers[1].playerGlb, 'player2');
            }
            Bumpers.forEach((bumper, index) => {
              bumper.modelsGlb.forEach((model, modelIndex) => {
                this.renderOptimizer.registerDynamic(model, `furniture_p${index}_${modelIndex}`);
              });
            });
            GameLogger.info(
              'RenderOptimizer',
              `Registered ${this.renderOptimizer.getStats().totalObjects} objects for culling`,
            );
          }
          clientState.bumper = Bumpers[clientState.playerNumber - 1];
          clientState.enemyBumper = Bumpers[clientState.enemyNumber - 1];

          // Set camera position based on player position
          if (Bumpers[clientState.playerNumber - 1].dirZ < 0) {
            camera.position.set(0, 12, 20);
          } else {
            camera.position.set(0, 12, -20);
          }
          camera.lookAt(new THREE.Vector3(0, 0, 0));

          // Create cardboard models if not already created
          if (cardboardModels.length === 0) {
            const cardboardRotationY = Bumpers[clientState.playerNumber - 1].dirZ < 0 ? -(pi / 2) : pi / 2;

            for (let i = 0; i <= 2; i++) {
              const cardboardGlb = await modelCreate(-15, 0, 0, 1.6, 1.6, 2.2, cardboardModelStates[i]);
              cardboardGlb.rotateY(cardboardRotationY);
              cardboardModels.push(cardboardGlb);
            }
            // Initially show only the first cardboard sign
            if (this.renderOptimizer) {
              this.renderOptimizer.registerStatic(cardboardModels[0], 'cardboard0');
              this.renderOptimizer.registerStatic(cardboardModels[1], 'cardboard1');
              this.renderOptimizer.registerStatic(cardboardModels[2], 'cardboard2');
            }
            cardboardModels[1].visible = false;
            cardboardModels[2].visible = false;
          }

          // Update bumper speeds with game speed multiplier
          if (clientState.bumper) {
            clientState.bumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;
          }
          if (clientState.enemyBumper) {
            clientState.enemyBumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;
          }
          GameLogger.debug('clientState', clientState.bumper.speed);
          break;
        case 'game_started':
          GameLogger.info('Game started', data);
          this.overlay.hide();
          break;
        case 'game_paused':
          GameLogger.info('Game paused', data);
          this.overlay.show(OVERLAY_TYPE.PAUSE, data);
          break;
        case 'game_unpaused':
          GameLogger.info('Game unpaused', data);
          this.overlay.hide();
          break;
        case 'game_cancelled':
          GameLogger.info('Game cancelled', data);
          this.overlay.show(OVERLAY_TYPE.CANCEL, data);
          if (data.tournament_id) {
            router.redirect(`tournament/${data.tournament_id}`);
          }
          break;
        case 'player_won':
        case 'player_resigned':
          GameLogger.info('Game_over', data);
          const scoringData = {
            bumper_1: {
              score: data.winner.player_number === 1 ? data.winner.score : data.loser.score,
            },
            bumper_2: {
              score: data.winner.player_number === 2 ? data.winner.score : data.loser.score,
            },
          };
          updateScoreUI(scoringData);
          updateLifePointUI(scoringData);
          this.overlay.show(OVERLAY_TYPE.GAMEOVER, data);
          break;
        default:
          break;
      }
    });

    this.#pongSocket.addEventListener('close', (event) => {
      GameLogger.info('PONG socket was nice! :3', event.code);
      this.#pongSocket = null;
      switch (event.code) {
        case 3100:
        case 3002:
          showToastNotification('This game does not exist or has ended.', TOAST_TYPES.ERROR);
          break;
        case 3003:
          showToastNotification('Your are already in a game.', TOAST_TYPES.ERROR);
          break;
        default:
          return;
      }
      setTimeout(() => {
        router.redirect('/home');
      }, 1500);
    });

    function predictPlayerPosition() {
      const playerBumper = clientState.bumper;
      let movement = 0;
      if (
        (clientState.movesLeft && !playerBumper.controlReverse) ||
        (clientState.movesRight && playerBumper.controlReverse)
      ) {
        movement = playerBumper.speed * SERVER_TICK_INTERVAL;
      } else if (
        (clientState.movesRight && !playerBumper.controlReverse) ||
        (clientState.movesLeft && playerBumper.controlReverse)
      ) {
        movement = -playerBumper.speed * SERVER_TICK_INTERVAL;
      }
      let newX = playerBumper.cubeUpdate.x + movement;
      const leftLimit = WALL_RIGHT_X + WALL_WIDTH_HALF + playerBumper.lenghtHalf;
      const rightLimit = WALL_LEFT_X - WALL_WIDTH_HALF - playerBumper.lenghtHalf;
      newX = Math.max(leftLimit, Math.min(rightLimit, newX));

      return newX;
    }

    /**
     * Updates player model position accounting for active buffs/debuffs
     * Handles visual positioning offsets for different buff states
     * @param {Object} bumper - Player bumper object
     * @param {number} playerVisualX - Target X position
     * @param {number} playerVisualZ - Target Z position
     */
    function updatePlayerModelPos(bumper, playerVisualX, playerVisualZ) {
      const isDebuffActive =
        serverState.current_buff_or_debuff !== Buff.NO_BUFF &&
        (serverState.bumper_1.buff_or_debuff_target || serverState.bumper_2.buff_or_debuff_target);

      if (bumper.playerGlb.position.z < 0) {
        bumper.playerGlb.position.x = playerVisualX + 1;
      } else {
        bumper.playerGlb.position.x = playerVisualX - 1;
      }
      if (isDebuffActive) {
        if (serverState.bumper_2.buff_or_debuff_target && bumper == Bumpers[1]) {
          if (serverState.current_buff_or_debuff == Buff.SHORTEN_ENEMY) {
            bumper.playerGlb.position.x += 1;
            bumper.playerGlb.position.z = playerVisualZ + 0.4;
          } else if (serverState.current_buff_or_debuff == Buff.ELONGATE_PLAYER) {
            bumper.playerGlb.position.x += 7.2;
            bumper.playerGlb.position.z = playerVisualZ + 0.7;
          } else if (serverState.current_buff_or_debuff == Buff.ENLARGE_PLAYER) bumper.playerGlb.position.x += 5;
        } else if (serverState.bumper_1.buff_or_debuff_target && bumper == Bumpers[0]) {
          if (serverState.current_buff_or_debuff == Buff.SHORTEN_ENEMY) {
            bumper.playerGlb.position.x -= 1;
            bumper.playerGlb.position.z = playerVisualZ - 0.4;
          } else if (serverState.current_buff_or_debuff == Buff.ELONGATE_PLAYER) {
            bumper.playerGlb.position.x -= 7.2;
            bumper.playerGlb.position.z = playerVisualZ - 0.7;
          } else if (serverState.current_buff_or_debuff == Buff.ENLARGE_PLAYER) bumper.playerGlb.position.x -= 5;
        }
      }
    }

    /**
     * Interpolates entity positions for smooth multiplayer rendering
     * Uses client-side prediction with server reconciliation
     * @param {number} renderTime - Current render timestamp
     */
    function interpolateEntities(renderTime) {
      const interpolatedBallPos = getInterpolated(ENTITY_KEYS.BALL, renderTime);
      if (interpolatedBallPos !== null) {
        // Update both possible ball mesh references
        if (Ball.bulletGlb) {
          Ball.bulletGlb.position.set(interpolatedBallPos.x, 1, interpolatedBallPos.z);
        }
      } else {
        if (Ball.bulletGlb) {
          Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
        }
      }

      const interpolatedCoinPos = getInterpolated(ENTITY_KEYS.COIN, renderTime);
      if (interpolatedCoinPos !== null) {
        Coin.cylinderMesh.position.set(interpolatedCoinPos.x, 1, interpolatedCoinPos.z);
      } else {
        Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
      }

      const interpolatedOpponentPos = getInterpolated(ENTITY_KEYS.OPPONENT, renderTime);
      if (interpolatedOpponentPos !== null && clientState.enemyBumper.playerGlb) {
        if (clientState.enemyBumper.cubeUpdate.x - interpolatedOpponentPos < 0) {
          handleAnimations(clientState.enemyBumper, clientState.enemyBumper.currentAction, 0, 0.1);
        } else if (clientState.enemyBumper.cubeUpdate.x - interpolatedOpponentPos == 0) {
          handleAnimations(clientState.enemyBumper, clientState.enemyBumper.currentAction, 2, 0.5);
        } else {
          handleAnimations(clientState.enemyBumper, clientState.enemyBumper.currentAction, 5, 0.1);
        }
        clientState.enemyBumper.cubeUpdate.x = interpolatedOpponentPos;
        updatePlayerModelPos(clientState.enemyBumper, interpolatedOpponentPos, clientState.enemyBumper.cubeUpdate.z);
      }
      // Update enemy bumper position (both table and player models)
      if (
        clientState.enemyBumper.modelsGlb &&
        clientState.enemyBumper.modelsGlb[clientState.enemyBumper.modelChoosen || 0]
      ) {
        clientState.enemyBumper.modelsGlb[clientState.enemyBumper.modelChoosen || 0].position.set(
          clientState.enemyBumper.cubeUpdate.x,
          clientState.enemyBumper.cubeUpdate.y,
          clientState.enemyBumper.cubeUpdate.z,
        );
      }
      // Fallback to cubeMesh for compatibility
      if (clientState.enemyBumper.cubeMesh) {
        clientState.enemyBumper.cubeMesh.position.set(
          clientState.enemyBumper.cubeUpdate.x,
          clientState.enemyBumper.cubeUpdate.y,
          clientState.enemyBumper.cubeUpdate.z,
        );
      }

      // Update player bumper position (with debuff-aware positioning)
      const interpolatedPlayerPos = getInterpolated(ENTITY_KEYS.PLAYER, renderTime);
      const playerBumper = clientState.bumper;
      const playerVisualX = interpolatedPlayerPos !== null ? interpolatedPlayerPos : playerBumper.cubeUpdate.x;
      const playerVisualZ = playerBumper.cubeUpdate.z;

      // Don't overwrite debuff-specific positioning during active buffs

      updatePlayerModelPos(playerBumper, playerVisualX, playerVisualZ);

      if (playerBumper.modelsGlb && playerBumper.modelsGlb[playerBumper.modelChoosen || 0]) {
        playerBumper.modelsGlb[playerBumper.modelChoosen || 0].position.set(
          playerVisualX,
          playerBumper.cubeUpdate.y,
          playerBumper.cubeUpdate.z,
        );
      }
      // Fallback to cubeMesh for compatibility
      if (playerBumper.cubeMesh) {
        playerBumper.cubeMesh.position.set(playerVisualX, playerBumper.cubeUpdate.y, playerBumper.cubeUpdate.z);
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      if (!clientState.bumper) {
        return;
      }
      const delta = clock.getDelta();
      accumulator += delta;
      const deltaAnimation = Math.min(delta, 0.1);

      const timestamp = Date.now();

      // client-side prediction code: it simulates movement at the same tick rate as the server
      while (accumulator >= SERVER_TICK_INTERVAL) {
        sendCurrentInput(timestamp);
        if (!(clientState.movesLeft && clientState.movesRight)) {
          const newX = predictPlayerPosition();
          clientState.bumper.cubeUpdate.x = newX;
          updatePlayerBuffer(newX, timestamp);
        }
        accumulator -= SERVER_TICK_INTERVAL;
      }

      interpolateEntities(timestamp - ENTITY_INTERPOLATION_DELAY);

      // Update all mixers for both bumpers
      if (Bumpers && Bumpers[0]?.gltfStore?.mixer) {
        Bumpers[0].gltfStore.mixer.update(deltaAnimation);
      }
      if (Bumpers && Bumpers[1]?.gltfStore?.mixer) {
        Bumpers[1].gltfStore.mixer.update(deltaAnimation);
      }
      // Performance optimization: Update object visibility with frustum culling
      if (renderOptimizer) {
        renderOptimizer.updateVisibility(camera);
      }
      renderer.render(scene, camera);
    }

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(clientState);
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(clientState);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, animate, scene];
  }

  /**
   * Initialize and render the multiplayer game
   * Sets up UI, 3D scene, and starts the game loop
   */
  async render() {
    try {
      GameLogger.info('Initialization', 'Starting multiplayer game render...');

      this.classList.add('position-relative');
      this.overlay = document.createElement('game-overlay');
      this.overlay.gameType = 'multiplayer';
      this.appendChild(this.overlay);
      GameLogger.debug('Initialization', 'Game overlay created');

      const navbarHeight = this.#navbarHeight;
      const [camera, renderer, animate, scene] = await this.game();
      GameLogger.debug('Initialization', 'Game components initialized');

      // Store scene for cleanup
      this.scene = scene;

      // Store resize handler for proper cleanup
      this.#resizeHandler = () => {
        renderer.setSize(window.innerWidth, window.innerHeight - navbarHeight);
        const rendererWidth = renderer.domElement.offsetWidth;
        const rendererHeight = renderer.domElement.offsetHeight;
        camera.aspect = rendererWidth / rendererHeight;
        camera.updateProjectionMatrix();
      };

      window.addEventListener('resize', this.#resizeHandler);
      animate();

      this.overlay?.show('pending');
      GameLogger.info('Initialization', 'Multiplayer game render completed successfully');
    } catch (error) {
      GameLogger.error('Initialization', 'Multiplayer game render failed', error);
      if (error.message.includes('WebGL')) {
        this.handleError('WEBGL_NOT_SUPPORTED', error);
      } else {
        this.handleError('GAME_INIT_FAILED', error);
      }
    }
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
