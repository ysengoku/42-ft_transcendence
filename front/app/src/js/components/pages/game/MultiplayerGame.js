import * as THREE from 'three';
// import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '/node_modules/three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';
import pedro from '/3d_models/pleasehelpme.glb?url';
import cactus from '/3d_models/cactus1.glb?url';
import bullet from '/3d_models/bullet.glb?url';
import fence from '/3d_models/fence.glb?url';
import couch from '/3d_models/sofa.glb?url';
import chair from '/3d_models/chair.glb?url';
import dressing from '/3d_models/dressing.glb?url';
import ground_texture from '/img/ground_texture.png?url';
import coin from '/3d_models/coin.glb?url';
import carboard from '/3d_models/carboard.glb?url';
import carboard2 from '/3d_models/carboard2.glb?url';
import carboard3 from '/3d_models/carboard3.glb?url';
import table from '/3d_models/table.glb?url';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';
import { sessionExpiredToast } from '@utils';
import './components/index';
import { OVERLAY_TYPE, BUFF_TYPE } from './components/index';
import { DEFAULT_AVATAR } from '@env';

/* eslint no-var: "off" */

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
  #blobURL = null; // Blob URL for web workers
  #state = {
    userPlayerName: 'You',
    opponentPlayerName: 'Opponent',
    gameOptions: {},
    user: null,
  };

  constructor() {
    super();

    // Initialize UI element references
    this.timerElement = null; // Game timer display
    this.buffIconElement = null; // Power-up indicator
    this.scoreElement = null; // Scoreboard component
    this.lifePointElement = null; // Life points display
    this.overlay = null; // Game overlay for messages

    // Predefined rotation angles for player models
    this.modelRotation = [
      [this.degreesToRadians(235), this.degreesToRadians(-90)], // Player 1 rotations
      [this.degreesToRadians(55), this.degreesToRadians(90)], // Player 2 rotations
    ];
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

    this.scoreElement = document.createElement('game-scoreboard');
    this.appendChild(this.scoreElement);
    this.timerElement = document.createElement('game-timer');
    document.getElementById('game-timer-wrapper')?.appendChild(this.timerElement);
    this.buffIconElement = document.createElement('game-buff-icon');
    this.appendChild(this.buffIconElement);
    this.lifePointElement = document.createElement('game-life-point');
    this.appendChild(this.lifePointElement);

    this.#state.gameId = param.id;
    await this.render();
  }

  setQueryParam(query) {
    this.#state.userPlayerName = query.get('userPlayerName') || 'You';
    this.#state.opponentPlayerName = query.get('opponentPlayerName') || 'Opponent';
  }

  /**
   * Called when the element is removed from the DOM
   * Handles cleanup of resources and event listeners
   */
  disconnectedCallback() {
    this.cleanup();
  }

  /**
   * Comprehensive cleanup of all game resources
   */
  cleanup() {
    // Cancel animation frame
    if (this.#animationId) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }

    // Remove event listeners
    if (this.onDocumentKeyDown) {
      document.removeEventListener('keydown', this.onDocumentKeyDown, true);
      this.onDocumentKeyDown = null;
    }
    if (this.onDocumentKeyUp) {
      document.removeEventListener('keyup', this.onDocumentKeyUp, true);
      this.onDocumentKeyUp = null;
    }
    if (this.#resizeHandler) {
      window.removeEventListener('resize', this.#resizeHandler);
      this.#resizeHandler = null;
    }

    // Close WebSocket connection
    if (this.#pongSocket) {
      console.log('Closing pongSocket');
      this.#pongSocket.close();
      this.#pongSocket = null;
    }

    // Clean up blob URL
    if (this.#blobURL) {
      URL.revokeObjectURL(this.#blobURL);
      this.#blobURL = null;
    }

    // Dispose Three.js objects properly
    this.disposeThreeJS();

    // Clean up loaders
    if (this.#ktx2Loader) {
      this.#ktx2Loader.dispose();
      this.#ktx2Loader = null;
    }
    if (this.loaderModel) {
      this.loaderModel = null;
    }
  }

  /**
   * Dispose of all Three.js resources to prevent memory leaks
   */
  disposeThreeJS() {
    if (!this.scene) return;

    // Dispose all scene objects recursively
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(object.material);
        }
      }
    });

    // Clear scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.scene = null;
  }

  /**
   * Dispose of a Three.js material and its textures
   */
  disposeMaterial(material) {
    if (!material) return;

    // Dispose textures
    Object.keys(material).forEach((key) => {
      const value = material[key];
      if (value && typeof value.dispose === 'function') {
        value.dispose();
      }
    });

    material.dispose();
  }

  /**
   * Handle smooth animation transitions for player models (exactly matching Game.js)
   * @param {Object} ourBumper - Player object
   * @param {number} currentAction - Current animation index
   * @param {number} nextAction - Next animation index
   * @param {number} fadeTime - Transition duration
   */
  handleAnimations(ourBumper, currentAction, nextAction, fadeTime) {
    const ourBumperIndex = ourBumper.dirZ < 1 ? 0 : 1;

    // Change actions with smooth transitions (exactly like Game.js)
    if (currentAction != nextAction && ourBumper.gltfStore?.action) {
      if (ourBumper.gltfStore.action[currentAction]) {
        ourBumper.gltfStore.action[currentAction].fadeOut(fadeTime);
      }
      if (ourBumper.gltfStore.action[nextAction]) {
        ourBumper.gltfStore.action[nextAction].reset();
        ourBumper.gltfStore.action[nextAction].fadeIn(fadeTime);
        ourBumper.gltfStore.action[nextAction].play();
      }
      ourBumper.currentAction = nextAction;

      // Update model rotation based on current model and player position (exactly like Game.js)
      if (ourBumper.playerGlb && this.modelRotation) {
        if (ourBumper.modelChoosen == 0) {
          ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][0];
        } else {
          ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][1];
        }
      }
    }
  }

  safeSend(message) {
    if (this.#pongSocket && this.#pongSocket.readyState === WebSocket.OPEN) {
      this.#pongSocket.send(message);
    }
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
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
    console.error(`Game Error [${errorType}]:`, error);

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
   * Hide all game UI elements (used during errors or game end)
   */
  hideGameUI() {
    console.log('Hiding game UI');

    const elements = [
      { element: this.scoreElement, name: 'scoreElement' },
      { element: this.timerElement, name: 'timerElement' },
      { element: this.buffIconElement, name: 'buffIconElement' },
      { element: this.lifePointElement, name: 'lifePointElement' },
    ];

    elements.forEach(({ element, name }) => {
      if (element) {
        element.style.display = 'none';
        console.log(`Hidden ${name}`);
      }
    });
  }

  /**
   * Show all game UI elements
   */
  showGameUI() {
    console.log('Showing game UI');

    const elements = [
      { element: this.scoreElement, name: 'scoreElement' },
      { element: this.timerElement, name: 'timerElement' },
      { element: this.buffIconElement, name: 'buffIconElement' },
      { element: this.lifePointElement, name: 'lifePointElement' },
    ];

    elements.forEach(({ element, name }) => {
      if (element) {
        element.style.display = '';
        console.log(`Shown ${name}`);
      }
    });
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
            console.log(`Loading ${modelName}:`, (progress.loaded / progress.total) * 100 + '%');
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

      return modelGenerated;
    } catch (error) {
      console.warn(`Failed to load model ${modelName}, using fallback:`, error.message);
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
        clientState.movesLeft = true;
        // Handle animations for player models
        if (clientState.bumper?.gltfStore?.action && clientState.bumper?.gltfStore?.action[0]) {
          this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 0, 0.1);
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        clientState.movesRight = true;
        // Handle animations for player models
        if (clientState.bumper?.gltfStore?.action && clientState.bumper?.gltfStore?.action[5]) {
          this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 5, 0.1);
        }
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
        clientState.movesLeft = false;
        // Return to idle animation
        if (clientState.bumper?.gltfStore?.action && clientState.bumper?.gltfStore?.action[2]) {
          this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 2, 0.5);
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        clientState.movesRight = false;
        // Return to idle animation
        if (clientState.bumper?.gltfStore?.action && clientState.bumper?.gltfStore?.action[2]) {
          this.handleAnimations(clientState.bumper, clientState.bumper.currentAction, 2, 0.5);
        }
      }

      e.preventDefault();
    };
  }

  /**
   * Initialize 3D model loaders with optimization support
   * @param {THREE.WebGLRenderer} renderer - WebGL renderer instance
   */
  async initLoaders(renderer) {
    try {
      // Set up KTX2 loader for compressed textures
      this.#ktx2Loader = new KTX2Loader().setTranscoderPath('/libs/basis/').detectSupport(renderer);

      // Wait for MeshOpt decoder to be ready
      await MeshoptDecoder.ready;

      // Configure GLTF loader with optimizations
      this.loaderModel = new GLTFLoader();
      this.loaderModel.setKTX2Loader(this.#ktx2Loader);
      this.loaderModel.setMeshoptDecoder(MeshoptDecoder);
    } catch (error) {
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

    let mixer;
    const normalMaterial = new THREE.MeshNormalMaterial();

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

    // Environment setup - Background elements for immersive experience

    // Create desert landscape with cacti
    const cacti = [];
    const placedCacti = []; // Track positions to avoid overlap
    const minDistance = 8; // Minimum distance between cacti

    // Factory function for creating randomly rotated cacti
    const CactusFactory = async (posX, posY, posZ) => {
      try {
        const cactusGlb = await modelCreate(posZ, posY, posX, 1.8, 1.8, 1.8, cactus);
        cactusGlb.rotateY(degreesToRadians(Math.random() * 360)); // Random rotation
        return { cactusGlb };
      } catch (error) {
        console.warn('Failed to load cactus, using fallback');
        return { cactusGlb: this.createFallbackModel(posZ, posY, posX, 1.8, 1.8, 1.8) };
      }
    };

    // Generate safe positions for cacti (avoiding play area and other cacti)
    const getSafeCactusPosition = () => {
      let x, z;
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
      });
    } catch (error) {
      console.warn('Some cacti failed to load:', error);
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

      return hill;
    };

    // Place hills at various positions for scenic background
    createHill(-180, 250, 60, 25);
    createHill(150, 280, 70, 30);
    createHill(-100, 300, 50, 20);
    createHill(280, 200, 80, 35);
    createHill(-250, 220, 65, 22);

    // Create textured ground plane
    (() => {
      const textureLoader = new THREE.TextureLoader();
      const groundTexture = textureLoader.load(ground_texture);
      // Set texture to repeat for large ground area
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(100, 100);

      const phongMaterial = new THREE.MeshPhongMaterial({
        map: groundTexture,
        color: 0xd4a574, // Desert sand color
        depthWrite: true,
      });

      // Large ground plane to fill the visible area
      const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
      const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
      planeMesh.rotateX(-pi / 2); // Rotate to be horizontal
      planeMesh.receiveShadow = true;
      scene.add(planeMesh);
    })();

    // Enhanced player model with better positioning
    // const playerglb = (() => {
    //   const pedroModel = new THREE.Object3D();
    //   this.loaderModel.load(
    //     pedro,
    //     function (gltf) {
    //       const model = gltf.scene;
    //       model.position.y = 7;
    //       model.position.z = 0;
    //       model.position.x = 0;

    //       // Configure shadows for the model
    //       model.traverse((node) => {
    //         if (node.isMesh) {
    //           node.castShadow = true;
    //           node.receiveShadow = true;
    //         }
    //       });

    //       mixer = new THREE.AnimationMixer(model);
    //       const idleAction = mixer
    //         .clipAction(THREE.AnimationUtils.subclip(gltf.animations[0], 'idle', 0, 221))
    //         .setDuration(6)
    //         .play();
    //       const idleAction2 = mixer
    //         .clipAction(THREE.AnimationUtils.subclip(gltf.animations[1], 'idle', 0, 221))
    //         .setDuration(6)
    //         .play();
    //       idleAction.play();
    //       idleAction2.play();
    //       pedroModel.add(gltf.scene);
    //     },
    //     undefined,
    //     function (error) {
    //       console.error('Failed to load player model:', error);
    //     },
    //   );
    //   pedroModel.scale.set(0.1, 0.1, 0.1);
    //   scene.add(pedroModel);
    //   return pedroModel;
    // })();

    // Enhanced coin with 3D model (with fallback to geometry)
    const Coin = await (async (posX, posY, posZ) => {
      let CoinMesh;
      try {
        // Try to load 3D coin model
        const CoinGlb = await modelCreate(0, 0, 0, 0.45, 0.45, 0.45, coin);
        CoinGlb.position.set(posX, posY, posZ);
        CoinMesh = CoinGlb;
      } catch (error) {
        console.warn('Failed to load coin model, using fallback geometry');
        // Fallback to basic geometry
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1);
        CoinMesh = new THREE.Mesh(cylinderGeometry, normalMaterial);
        CoinMesh.position.set(posX, posY, posZ);
        CoinMesh.rotation.z = -Math.PI / 2;
        CoinMesh.rotation.y = -Math.PI / 2;
        CoinMesh.castShadow = true;
        scene.add(CoinMesh);
      }

      const cylinderUpdate = new THREE.Vector3(posX, posY, posZ);
      const velocity = new THREE.Vector3(0.01, 0, 0);
      let lenghtHalf = 0.25;

      return {
        get lenghtHalf() {
          return lenghtHalf;
        },
        set lenghtHalf(newLenghtHalf) {
          lenghtHalf = newLenghtHalf;
        },
        cylinderMesh: CoinMesh,
        cylinderUpdate,
        velocity,
      };
    })(-100.0, 1, 0);

    // Enhanced ball with 3D model (with fallback to geometry)
    const Ball = await (async (posX, posY, posZ) => {
      let BallMesh;
      try {
        // Try to load 3D bullet model for the ball
        const bulletGlb = await modelCreate(posX, posY, posZ, 1, 1, 1, bullet);
        bulletGlb.rotateX(pi / 2);
        BallMesh = bulletGlb;
      } catch (error) {
        console.warn('Failed to load ball model, using fallback geometry');
        // Fallback to basic sphere
        const sphereGeometry = new THREE.SphereGeometry(0.5);
        BallMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
        BallMesh.position.set(posX, posY, posZ);
        BallMesh.castShadow = true;
        scene.add(BallMesh);
      }

      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * 1);
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);

      return {
        bulletGlb: BallMesh, // Keep original property name for compatibility
        sphereMesh: BallMesh,
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 1, 0);

    // Create boundary fences around the playing field
    const WallFactory = async (posX, posY, posZ) => {
      try {
        const fenceGlb = await modelCreate(posX, posY, posZ, 0.8, 0.5, 1, fence);
        fenceGlb.rotateY(-pi / 2); // Rotate to face inward
        return { fenceGlb };
      } catch (error) {
        console.warn('Failed to load fence, using fallback');
        return { fenceGlb: this.createFallbackModel(posX, posY, posZ, 0.8, 0.5, 1) };
      }
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
    const gameOptions = this.#state.gameOptions;
    console.log(gameOptions.cool_mode);
    const BumperFactory = async (posX, posY, posZ) => {
      let _ = {};
      let modelsGlb;
      let animations = [];
      _.action = [null, null, null, null, null, null, null, null];

      const tableGlb = await modelCreate(0.04, 0.45, 0, 0.48, 0.5, 0.5, table);
      if (gameOptions.cool_mode == true) {
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
      const playerGlb = (() => {
        const pedroModel = new THREE.Object3D();
        this.loaderModel.load(
          pedro,
          function (gltf) {
            gltf.scene.traverse(function (node) {
              if (node.isMesh) {
                node.castShadow = true;
              }
            });
            const model = gltf.scene;
            model.position.y = 0;
            model.position.x = posX;
            _.mixer = new THREE.AnimationMixer(model);
            animations = gltf.animations;
            for (let i = 0; i <= 7; i++) {
              _.action[i] = _.mixer.clipAction(animations[i], model);
            }
            _.action[1].setLoop(THREE.LoopOnce, 1);
            _.action[1].setDuration(0.4);
            _.action[0].setDuration(0.18);
            _.action[7].setDuration(0.18);
            _.action[6].setDuration(0.18);
            _.action[5].setDuration(0.18);
            _.action[2].play();
            pedroModel.add(gltf.scene);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        pedroModel.scale.set(0.5, 0.5, 0.5);
        scene.add(pedroModel);
        return pedroModel;
      })();
      if (posZ < 0) {
        playerGlb.rotation.y = degreesToRadians(55);
        playerGlb.position.z = posZ - 1;
        playerGlb.position.x += 1;
        tableGlb.rotation.z = Math.PI;
      } else {
        playerGlb.rotation.y = degreesToRadians(235);
        playerGlb.position.z = posZ + 1;
        playerGlb.position.x -= 1;
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

    // Create enhanced bumpers with 3D models
    const Bumpers = await Promise.all([BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)]);

    // Create invisible collision walls (visual fences already created above)
    const InvisibleWallFactory = (posX, posY, posZ) => {
      const wallGeometry = new THREE.BoxGeometry(20, 5, 1);
      const wallMaterial = new THREE.MeshBasicMaterial({ visible: false }); // Invisible collision walls
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      wallMesh.position.x = posX;
      wallMesh.position.y = posY;
      wallMesh.position.z = posZ;
      wallMesh.rotation.y = -Math.PI / 2;
      scene.add(wallMesh);

      return {
        wallMesh,
      };
    };
    /* eslint-disable-next-line new-cap */
    const Walls = [
      InvisibleWallFactory(WALL_LEFT_X, BUMPER_LENGTH_HALF, 0),
      InvisibleWallFactory(WALL_RIGHT_X, BUMPER_LENGTH_HALF, 0),
    ];

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
      coin: { x: -9.25, z: 1 },
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
      playerInterpolationBuffer: [],
      esntitiesInterpolationBuffer: [],
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

    const resetAllBuffEffects = () => {
      for (let i = 0; i < Bumpers.length; i++) {
        const bumper = Bumpers[i];

        bumper.controlReverse = false;
        bumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;
        bumper.cubeMesh.scale.x = 1;
        bumper.lenghtHalf = BUMPER_LENGTH_HALF;
        bumper.cubeMesh.scale.z = 1;
        bumper.widthHalf = BUMPER_WIDTH_HALF;
      }
    };

    const decreaseLifePointUI = (data) => {
      const playerMissed = data.bumper_1.score > serverState.bumper_1.score ? 2 : 1;
      const newScore = playerMissed === 1 ? data.bumper_2.score : data.bumper_1.score;
      this.lifePointElement?.updatePoint(playerMissed - 1, 20 - (20 / this.#state.gameOptions.score_to_win) * newScore);
    };

    const updateScoreUI = (data) => {
      data.bumper_1.score > serverState.bumper_1.score
        ? this.scoreElement?.updateScore(0, data.bumper_1.score)
        : this.scoreElement?.updateScore(1, data.bumper_2.score);
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
      // if (data.is_someone_scored) {
      //   updateScoreUI(data);
      //   decreaseLifePointUI(data);
      // }
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
      let removedCount = 0;
      let reappliedCount = 0;
      let i = 0;
      while (i < clientState.pendingInputs.length) {
        const input = clientState.pendingInputs[i];
        if (input.sequenceNumber <= lastProcessedMoveId) {
          clientState.pendingInputs.splice(i, 1);
          removedCount++;
        } else {
          applyInputToBumper(input, clientState.bumper, SERVER_TICK_INTERVAL);
          reappliedCount++;
          i++;
        }
      }
    }

    const applyBuffEffects = () => {
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
            // targetPlayer.cubeMesh.scale.x = 0.5;
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = false;
            targetPlayer.modelChoosen = 2;
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = true;
            // targetPlayer.modelChoosen = 2;
            targetPlayer.lenghtHalf = 1.25;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.SHORT);
            }
            break;
          case Buff.ELONGATE_PLAYER:
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = false;
            targetPlayer.modelChoosen = 1;
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = true;
            // targetPlayer.cubeMesh.scale.x = 2;
            targetPlayer.lenghtHalf = 5;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.LONG);
            }
            break;
          case Buff.ENLARGE_PLAYER:
            // targetPlayer.cubeMesh.scale.z = 3;
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = false;
            targetPlayer.modelChoosen = 3;
            targetPlayer.modelsGlb[targetPlayer.modelChoosen].visible = true;
            targetPlayer.widthHalf = 1.5;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.LARGE);
            }
            break;
        }
      }
    };

    this.#pongSocket.addEventListener('open', () => {
      log.info('Success! :3 ');
    });

    let data;
    this.#pongSocket.addEventListener('message', (e) => {
      data = JSON.parse(e.data);
      switch (data.action) {
        case 'state_updated':
          updateTimerUI(data.state.elapsed_seconds);
          if (data.state.is_someone_scored) {
            updateScoreUI(data.state);
            decreaseLifePointUI(data.state);
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
          clientState.bumper = Bumpers[clientState.playerNumber - 1];
          clientState.enemyBumper = Bumpers[clientState.enemyNumber - 1];
          camera.position.set(0, 15, -20);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          clientState.playerNumber === 1
            ? this.scoreElement?.setNames(this.#state.userPlayerName, this.#state.opponentPlayerName)
            : this.scoreElement?.setNames(this.#state.opponentPlayerName, this.#state.userPlayerName);
          this.timerElement?.setInitialTimeLimit(data.settings.time_limit * 60);
          this.timerElement?.render();
          this.#state.gameOptions = data.settings;
          console.log(this.#state.gameOptions);
          const gameSpeed = {
            slow: 0.75,
            medium: 1.0,
            fast: 1.25,
          };
          this.#state.gameOptions.game_speed = gameSpeed[this.#state.gameOptions.game_speed];
          // Update bumper speeds with game speed multiplier
          if (clientState.bumper) {
            clientState.bumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;
          }
          if (clientState.enemyBumper) {
            clientState.enemyBumper.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed;
          }
          console.log(clientState.bumper.speed);
          break;
        case 'game_started':
          console.log('Game started', data);
          this.overlay.hide();
          break;
        case 'game_paused':
          log.info('Game paused', data);
          this.overlay.show(OVERLAY_TYPE.PAUSE, data);
          break;
        case 'game_unpaused':
          log.info('Game unpaused', data);
          this.overlay.hide();
          break;
        case 'game_cancelled':
          log.info('Game cancelled', data);
          this.overlay.show(OVERLAY_TYPE.CANCEL, data);
          if (data.tournament_id) {
            router.redirect(`tournament/${data.tournament_id}`);
          }
          break;
        case 'player_won':
        case 'player_resigned':
          log.info('Game_over', data);
          this.overlay.show(OVERLAY_TYPE.GAMEOVER, data);
          break;
        default:
          break;
      }
    });

    this.#pongSocket.addEventListener('close', (event) => {
      log.info('PONG socket was nice! :3', event.code);
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

    function interpolateEntities(renderTime) {
      const interpolatedBallPos = getInterpolated(ENTITY_KEYS.BALL, renderTime);
      if (interpolatedBallPos !== null) {
        // Update both possible ball mesh references
        if (Ball.bulletGlb) {
          Ball.bulletGlb.position.set(interpolatedBallPos.x, 1, interpolatedBallPos.z);
        }
        if (Ball.sphereMesh) {
          Ball.sphereMesh.position.set(interpolatedBallPos.x, 1, interpolatedBallPos.z);
        }
      } else {
        if (Ball.bulletGlb) {
          Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
        }
        if (Ball.sphereMesh) {
          Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
        }
      }

      const interpolatedCoinPos = getInterpolated(ENTITY_KEYS.COIN, renderTime);
      if (interpolatedCoinPos !== null) {
        Coin.cylinderMesh.position.set(interpolatedCoinPos.x, 1, interpolatedCoinPos.z);
      } else {
        Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
      }

      const interpolatedOpponentPos = getInterpolated(ENTITY_KEYS.OPPONENT, renderTime);
      if (interpolatedOpponentPos !== null) {
        clientState.enemyBumper.cubeUpdate.x = interpolatedOpponentPos;
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

      // Update player bumper position
      const interpolatedPlayerPos = getInterpolated(ENTITY_KEYS.PLAYER, renderTime);
      const playerBumper = clientState.bumper;
      const playerVisualX = interpolatedPlayerPos !== null ? interpolatedPlayerPos : playerBumper.cubeUpdate.x;

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

    function animate(ms) {
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
          // Update all visible models position
          if (clientState.bumper.modelsGlb && clientState.bumper.modelsGlb[clientState.bumper.modelChoosen || 0]) {
            clientState.bumper.modelsGlb[clientState.bumper.modelChoosen || 0].position.x = newX;
          }
          // Adjust player model position relative to bumper
          let dirZ = clientState.bumper.playerGlb.position.z;
          if (dirZ < 0) {
            clientState.bumper.playerGlb.position.x = newX + 1;
          } else {
            clientState.bumper.playerGlb.position.x = newX - 1;
          }
          updatePlayerBuffer(newX, timestamp);
        }
        accumulator -= SERVER_TICK_INTERVAL;
      }

      interpolateEntities(timestamp - ENTITY_INTERPOLATION_DELAY);

      // Update all mixers for both bumpers
      if (mixer) {
        mixer.update(deltaAnimation);
      }
      if (Bumpers[0]?.gltfStore?.mixer) {
        Bumpers[0].gltfStore.mixer.update(deltaAnimation);
      }
      if (Bumpers[1]?.gltfStore?.mixer) {
        Bumpers[1].gltfStore.mixer.update(deltaAnimation);
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
      this.classList.add('position-relative');
      this.overlay = document.createElement('game-overlay');
      this.overlay.gameType = 'multiplayer';
      this.appendChild(this.overlay);

      const navbarHeight = this.#navbarHeight;
      const [camera, renderer, animate, scene] = await this.game();

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
      animate(0);

      this.overlay?.show('pending');
    } catch (error) {
      if (error.message.includes('WebGL')) {
        this.handleError('WEBGL_NOT_SUPPORTED', error);
      } else {
        this.handleError('GAME_INIT_FAILED', error);
      }
    }
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
