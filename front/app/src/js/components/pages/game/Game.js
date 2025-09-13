import * as THREE from 'three';
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
import { DEFAULT_GAME_OPTIONS } from '@env';
import { sessionExpiredToast } from '@utils';
import './components/index';
import { OVERLAY_TYPE, BUFF_TYPE } from './components/index';
import { DEFAULT_AVATAR } from '@env';

/* eslint no-var: "off" */

/**
 * Game Component - 3D Pong Game Implementation
 *
 * This class implements a 3D pong game using Three.js with the following features:
 * - Single player (vs AI) and local multiplayer modes
 * - 3D models and animations for players and environment
 * - Physics-based ball movement and collision detection
 * - Power-ups and buffs in cool mode
 * - Responsive UI with timer, scoreboard, and life points
 */
export class Game extends HTMLElement {
  // Private fields for game configuration and state
  #ktx2Loader = null; // KTX2 texture loader for optimized textures
  #navbarHeight = 64; // Height of the navigation bar
  #state = {
    gameOptions: {}, // Game settings (speed, score limit, etc.)
    gameType: '', // Game mode: 'classic' or 'ai'
    user: null,
  };
  #animationId = null; // Animation frame request ID
  #resizeHandler = null; // Window resize event handler
  #blobURL = null; // Blob URL for web workers

  constructor() {
    super();

    // Calculate navbar height for proper canvas sizing
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }

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

  /**
   * Initialize all UI elements for the game
   * Creates scoreboard, timer, buff icons, life points, and overlay
   */
  initializeUIElements() {
    console.log('Initializing UI elements (optimized)');

    // Create scoreboard with appropriate player names
    this.createUIElement('scoreElement', 'game-scoreboard', (element) => {
      if (this.#state.gameType === 'ai') {
        element.setNames('Player1', 'AI player');
      }
    });

    // Create game timer with configured time limit
    if (!this.timerElement) {
      this.timerElement = document.createElement('game-timer');
      const timeLimit = (this.#state.gameOptions.time_limit || 3) * 60; // Convert minutes to seconds
      this.timerElement.setInitialTimeLimit(timeLimit);

      const timerWrapper = document.getElementById('game-timer-wrapper');
      if (timerWrapper) {
        timerWrapper.appendChild(this.timerElement);
        console.log('Timer appended to wrapper');
      } else {
        console.warn('Timer wrapper not found, skipping timer creation');
      }
    }

    this.createUIElement('buffIconElement', 'game-buff-icon');
    this.createUIElement('lifePointElement', 'game-life-point');

    this.createUIElement('overlay', 'game-overlay', (element) => {
      element.gameType = `local-${this.#state.gameType}`;
    });
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

      console.log(`Created ${propName}`);
    }
  }

  /**
   * Called when the element is added to the DOM
   * Handles authentication, initialization, and rendering
   */
  async connectedCallback() {
    try {
      const authStatus = await auth.fetchAuthStatus();
      if (!authStatus.success) {
        if (authStatus.status === 429) {
          return; // Rate limited
        }
        if (authStatus.status === 401) {
          sessionExpiredToast();
        }
        router.redirect('/login');
        return;
      }

      this.#state.user = authStatus.response;
      this.classList.add('position-relative');
      this.style.overflow = 'hidden'; // Prevent scrollbars
      this.style.position = 'relative'; // Allow overlay positioning

      console.log('Game options before UI init:', this.#state.gameOptions);

      this.initializeUIElements();
      await this.render();
    } catch (error) {
      this.handleError('GAME_INIT_FAILED', error);
    }
  }

  /**
   * Parse URL parameters and configure game options
   * @param {URLSearchParams} param - URL search parameters
   */
  setQueryParam(param) {
    // Extract game type from URL parameters
    this.#state.gameType = param.get('type') || 'classic';

    // Parse cool mode setting (enables power-ups and special effects)
    const coolModeParam = param.get('cool_mode');
    const isCoolModeValid = !coolModeParam || coolModeParam === 'any';
    const coolMode = coolModeParam && coolModeParam.toLowerCase().trim() !== 'false';
    this.#state.gameOptions.cool_mode = isCoolModeValid ? DEFAULT_GAME_OPTIONS.coolMode : coolMode;

    // Parse game speed setting (slow, medium, fast)
    const gameSpeed = param.get('game_speed');
    const isGameSpeedValid = !gameSpeed || gameSpeed === 'any' || !['slow', 'medium', 'fast'].includes(gameSpeed);
    this.#state.gameOptions.game_speed = isGameSpeedValid ? DEFAULT_GAME_OPTIONS.gameSpeed : gameSpeed;

    // Parse score limit (3-20 points)
    const scoreToWinParam = param.get('score_to_win');
    const scoreToWin = parseInt(scoreToWinParam);
    const isScoreToWinValid = !scoreToWin || scoreToWin === 'any' || !(scoreToWin >= 3 && scoreToWin <= 20);
    this.#state.gameOptions.score_to_win = isScoreToWinValid ? DEFAULT_GAME_OPTIONS.scoreToWin : scoreToWin;

    // Parse time limit (1-5 minutes)
    const timeLimitParam = param.get('time_limit');
    const timeLimit = parseInt(timeLimitParam);
    const isTimeLimitValid = !timeLimit || timeLimit === 'any' || !(timeLimit >= 1 && timeLimit <= 5);
    this.#state.gameOptions.time_limit = isTimeLimitValid ? DEFAULT_GAME_OPTIONS.timeLimitMinutes : timeLimit;

    // Disable ranked mode for local games
    this.#state.gameOptions.ranked = false;

    console.log('Game type:', this.#state.gameType);
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
   * Handle smooth animation transitions for player models
   * @param {Object} ourBumper - Player object
   * @param {number} currentAction - Current animation index
   * @param {number} nextAction - Next animation index
   * @param {number} fadeTime - Transition duration
   */
  handleAnimations(ourBumper, currentAction, nextAction, fadeTime) {
    const ourBumperIndex = ourBumper.dirZ < 1 ? 0 : 1;

    // Smoothly transition between animations
    if (currentAction != nextAction) {
      ourBumper.gltfStore.action[currentAction].fadeOut(fadeTime);
      ourBumper.gltfStore.action[nextAction].reset();
      ourBumper.gltfStore.action[nextAction].fadeIn(fadeTime);
      ourBumper.gltfStore.action[nextAction].play();
      ourBumper.currentAction = nextAction;

      // Update model rotation based on current model and player position
      if (ourBumper.modelChoosen == 0) ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][0];
      else ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][1];
    }
  }

  /**
   * Create keydown event handler for game controls
   * @param {Object} keyMap - Key state tracking object
   * @param {Array} Workers - Web workers for power-up timers
   * @param {Array} gameStartAndStop - Game loop control functions
   * @param {Object} gameStateContainer - Game state object
   * @param {Object} Timer - Timer object
   * @param {Function} TimerCallBack - Timer callback function
   * @param {Array} Bumpers - Player objects
   * @returns {Function} Event handler function
   */
  createOnDocumentKeyDown(keyMap, Workers, gameStartAndStop, gameStateContainer, Timer, TimerCallBack, Bumpers) {
    return (e) => {
      const keyCode = e.code;
      // Handle Player 1 animations (Arrow keys)
      if (Bumpers[0].gltfStore.action && Bumpers[0].gltfStore.action[0] && Bumpers[0].gltfStore.action[5]) {
        if (keyCode == 'ArrowLeft') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 0, 0.1);
        }
        if (keyCode == 'ArrowRight') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 5, 0.1);
        }
      }
      // Handle key mapping based on game mode
      if (keyCode != 'KeyA' && keyCode != 'KeyD' && this.#state.gameType == 'ai') {
        // In AI mode, only Player 1 controls are active
        keyMap[keyCode] = true;
      } else if (this.#state.gameType != 'ai') {
        // In local multiplayer, both players can control
        keyMap[keyCode] = true;

        // Handle Player 2 animations (WASD keys)
        if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[0] && Bumpers[1].gltfStore.action[5]) {
          if (keyCode == 'KeyA') {
            this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 5, 0.1);
          }
          if (keyCode == 'KeyD') {
            this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 0, 0.1);
          }
        }
      }
      // Handle pause/resume with Escape key
      if (keyCode == 'Escape') {
        if (gameStateContainer.isPaused == false) {
          gameStartAndStop[1]();
          let i = 0;
          if (Workers != null) while (i <= 5) Workers[i++].postMessage([-1, -1, 'pause']);
          clearTimeout(Timer.timeoutId);
          gameStateContainer.isPaused = true;
        } else {
          let i = 0;
          if (Workers != null) while (i <= 5) Workers[i++].postMessage([-1, -1, 'resume']);
          Timer.timeoutId = setTimeout(TimerCallBack, 1000);
          gameStateContainer.isPaused = false;
          gameStartAndStop[0]();
        }
      }
      e.preventDefault();
    };
  }

  /**
   * Create keyup event handler for game controls
   * @param {Object} keyMap - Key state tracking object
   * @param {Array} Bumpers - Player objects
   * @returns {Function} Event handler function
   */
  createOnDocumentKeyUp(keyMap, Bumpers) {
    return (e) => {
      const keyCode = e.code;
      keyMap[keyCode] = false;
      // Return Player 1 to idle animation when keys are released
      if (Bumpers[0].gltfStore.action && Bumpers[0].gltfStore.action[2]) {
        if (keyCode == 'ArrowRight') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
        }
        if (keyCode == 'ArrowLeft') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
        }
      }
      // Return Player 2 to idle animation when keys are released
      if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[2]) {
        if (keyCode == 'KeyA') {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
        }
        if (keyCode == 'KeyD') {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
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
   * Create and configure the WebGL renderer
   * @returns {THREE.WebGLRenderer} Configured renderer instance
   */
  createRenderer() {
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
   * Main game logic and initialization
   * Sets up the 3D scene, physics, controls, and game loop
   * @returns {Promise<Array>} Game components [camera, renderer, start, stop, workers, scene]
   */
  async game() {
    // Extract game configuration
    const gameOptionsQuery = this.#state.gameOptions;
    const isGameAi = this.#state.gameType;

    // GAME CONSTANTS
    // Game boundaries and collision detection
    const BUMPER_1_BORDER = -10; // Player 1 goal line
    const BUMPER_2_BORDER = -BUMPER_1_BORDER; // Player 2 goal line

    const WALL_LEFT_X = 10; // Left wall position
    const WALL_RIGHT_X = -WALL_LEFT_X; // Right wall position
    const WALL_WIDTH_HALF = 0.5; // Half wall thickness

    // Ball physics constants
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const BALL_INITIAL_VELOCITY = 0.25;

    // Physics simulation parameters
    const SUBTICK = 0.05; // Physics timestep
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005; // Speed decay per frame

    // Game configuration from options
    const GAME_TIME = gameOptionsQuery.time_limit;
    const MAX_SCORE = gameOptionsQuery.score_to_win;

    // Set game speed multiplier based on user preference
    let GAME_SPEED;
    switch (gameOptionsQuery.game_speed) {
      case 'slow':
        GAME_SPEED = 0.75;
        break;
      case 'medium':
        GAME_SPEED = 1.0;
        break;
      case 'fast':
        GAME_SPEED = 1.25;
        break;
      default:
        GAME_SPEED = 1.0;
        break;
    }

    const degreesToRadians = this.degreesToRadians;
    const pi = Math.PI;
    let keyMap = []; // Tracks which keys are currently pressed
    const overlayUI = this.overlay;

    const gameStateContainer = (() => {
      let isPaused = false;
      let isGamePlaying = true;
      return {
        get isPaused() {
          return isPaused;
        },
        set isPaused(newIsPaused) {
          isPaused = newIsPaused;
        },
        get isGamePlaying() {
          return isGamePlaying;
        },
        set isGamePlaying(newIsGamePlaying) {
          isGamePlaying = newIsGamePlaying;
        },
      };
    })();

    const buffUI = this.buffIconElement;
    const timerUI = this.timerElement;
    const scoreUI = this.scoreElement;
    const lifePointUI = this.lifePointElement;

    const renderer = this.createRenderer();
    console.log('1')
    if (!renderer) {
      throw new Error('Failed to create WebGL renderer');
    }
    await this.initLoaders(renderer);

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

    // Camera configuration for optimal game view
    const camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    camera.position.set(0, 12, -20); // Position above and behind the playing field
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Lighting setup for realistic rendering
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

    // Helper function for model creation and scene addition
    const modelCreate = async (posX, posY, posZ, scaleX, scaleY, scaleZ, modelName) => {
      const modelGenerated = await this.createModelLoader(modelName, posX, posY, posZ, scaleX, scaleY, scaleZ);
      scene.add(modelGenerated);
      return modelGenerated;
    };

    // Environment setup - Background elements

    // Cardboard signs that change based on score progression
    let carboardModels = [];
    const carboardModelStates = [carboard, carboard2, carboard3];

    for (let i = 0; i <= 2; i++) {
      const carboardGlb = await modelCreate(-15, 0, 0, 1.6, 1.6, 2.2, carboardModelStates[i]);
      carboardGlb.rotateY(pi / 2);
      carboardModels[i] = carboardGlb;
    }
    // Initially show only the first cardboard sign
    carboardModels[1].visible = false;
    carboardModels[2].visible = false;

    // Desert environment - Cactus placement system
    const cacti = [];
    const placedCacti = []; // Track positions to avoid overlap
    const minDistance = 8; // Minimum distance between cacti

    // Factory function for creating randomly rotated cacti
    const CactusFactory = async (posX, posY, posZ) => {
      const cactusGlb = await modelCreate(posZ, posY, posX, 1.8, 1.8, 1.8, cactus);
      cactusGlb.rotateY(degreesToRadians(Math.random() * 360)); // Random rotation
      return {
        cactusGlb,
      };
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

    // Create desert landscape with 60 cacti
    const cactusPromises = [];
    for (let index = 0; index < 60; index++) {
      const pos = getSafeCactusPosition();
      placedCacti.push(pos);
      cactusPromises.push(CactusFactory(pos.x, 0, pos.z));
    }

    // Load all cacti in parallel for better performance
    const loadedCacti = await Promise.all(cactusPromises);
    loadedCacti.forEach((cactus, index) => {
      cacti[index] = cactus;
    });

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

    // Create boundary fences around the playing field
    const WallFactory = async (posX, posY, posZ) => {
      const fenceGlb = await modelCreate(posX, posY, posZ, 0.8, 0.5, 1, fence);
      fenceGlb.rotateY(-pi / 2); // Rotate to face inward
      return {
        fenceGlb,
      };
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

    // MOVING OBJECTS AND GAME ENTITIES

    // Ball creation
    const Ball = await (async (posX, posY, posZ) => {
      const bulletGlb = await modelCreate(posX, posY, posZ, 1, 1, 1, bullet);
      bulletGlb.rotateX(pi / 2);
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * GAME_SPEED);

      return {
        bulletGlb,
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 0, 0);

    // Player / Bumper creation
    const BumperFactory = async (posX, posY, posZ) => {
      let _ = {};
      let modelsGlb;
      let animations = [];
      _.action = [null, null, null, null, null, null, null, null];

      const tableGlb = await modelCreate(0.04, 0.45, 0, 0.48, 0.5, 0.5, table);
      if (gameOptionsQuery.cool_mode == true) {
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
      let lenghtHalf = 2.5;
      let modelChoosen = 0;
      let widthHalf = 0.5;
      let controlReverse = false;
      let speed = 0.25 * GAME_SPEED;
      let score = 0;
      let currentAction = 2;

      return {
        modelsGlb,
        tableGlb,
        cubeUpdate,
        playerGlb,
        gltfStore: _,

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

    const Bumpers = await Promise.all([BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)]);

    // Collisions checks

    let ballSubtickZ;
    let ballSubtickX;
    let lastBumperCollided = 0;

    function isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX) {
      return (
        Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= coin.cylinderUpdate.x + 0.25 &&
        Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= coin.cylinderUpdate.x - 0.25 &&
        Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= coin.cylinderUpdate.z + 0.05 &&
        Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= coin.cylinderUpdate.z - 0.05
      );
    }

    function isCollidedWithBall(bumper, ballSubtickZ, ballSubtickX) {
      return (
        Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= bumper.cubeUpdate.x + bumper.lenghtHalf &&
        Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= bumper.cubeUpdate.x - bumper.lenghtHalf &&
        Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= bumper.cubeUpdate.z + bumper.widthHalf &&
        Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= bumper.cubeUpdate.z - bumper.widthHalf
      );
    }

    function calculateNewDir(bumper) {
      let collisionPosX = bumper.cubeUpdate.x - Ball.sphereUpdate.x;
      let normalizedCollisionPosX = collisionPosX / (BALL_RADIUS + bumper.lenghtHalf);
      let bounceAngleRadians = degreesToRadians(55 * normalizedCollisionPosX);
      Ball.velocity.z = Math.min(1, Math.abs(Ball.velocity.z * 1.025 * Ball.temporalSpeed.z)) * bumper.dirZ;
      Ball.velocity.x = Ball.velocity.z * -Math.tan(bounceAngleRadians) * bumper.dirZ;
      if (
        Ball.sphereUpdate.z - BALL_RADIUS * Ball.velocity.z <= bumper.cubeUpdate.z + bumper.widthHalf &&
        Ball.sphereUpdate.z + BALL_RADIUS * Ball.velocity.z >= bumper.cubeUpdate.z - bumper.widthHalf
      )
        Ball.temporalSpeed.x += TEMPORAL_SPEED_INCREASE;
      Ball.bulletGlb.rotation.y = -degreesToRadians(Ball.temporalSpeed.x);
    }

    function checkWallCollision() {
      let collided = false;
      if (Ball.sphereUpdate.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF) {
        Ball.sphereUpdate.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF;
        Ball.velocity.x *= -1;
        Ball.bulletGlb.rotation.x *= -1;
        collided = true;
      } else if (Ball.sphereUpdate.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF) {
        Ball.sphereUpdate.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF;
        Ball.velocity.x *= -1;
        Ball.bulletGlb.rotation.x *= -1;
        collided = true;
      }
      return collided;
    }

    function checkBumperCollision() {
      let collided = false;
      if (Ball.velocity.z <= 0 && isCollidedWithBall(Bumpers[0], ballSubtickZ, ballSubtickX)) {
        lastBumperCollided = 0;
        isMovementDone = false;
        isCalculationNeeded = true;
        calculateNewDir(Bumpers[0]);
        collided = true;
      } else if (Ball.velocity.z > 0 && isCollidedWithBall(Bumpers[1], ballSubtickZ, ballSubtickX)) {
        lastBumperCollided = 1;
        isMovementDone = true;
        calculateNewDir(Bumpers[1]);
        collided = true;
      }
      return collided;
    }

    const showGameOverOverlay = () => {
      if (Bumpers[0].score === Bumpers[1].score) {
        const playerOneShouldWin = Math.round(Math.random());
        playerOneShouldWin ? (Bumpers[0].score = Infinity) : (Bumpers[1].score = Infinity);
      }
      const winner = {
        number: Bumpers[0].score > Bumpers[1].score ? 1 : 2,
        name: Bumpers[0].score > Bumpers[1].score ? 'Player 1' : 'Player 2',
        avatar: DEFAULT_AVATAR,
      };
      const loser = {
        number: Bumpers[0].score > Bumpers[1].score ? 2 : 1,
        name: Bumpers[0].score > Bumpers[1].score ? 'Player 2' : 'Player 1',
        avatar: DEFAULT_AVATAR,
      };
      if (this.#state.gameType === 'ai') {
        winner.name = winner.number === 1 ? 'You' : 'AI Player';
        loser.name = loser.number === 1 ? 'You' : 'AI Player';
        winner.number === 1 ? (winner.avatar = this.#state.user.avatar) : (loser.avatar = this.#state.user.avatar);
      }
      const resultData = {
        winner: winner,
        loser: loser,
        isLocal: true,
      };
      overlayUI.show(OVERLAY_TYPE.GAMEOVER, resultData);
    };

    let scoreSwitch = MAX_SCORE / 3;

    const resetBall = (direction) => {
      const looserBumper = direction < 0 ? 1 : 0;

      lifePointUI?.decreasePoint(looserBumper, 20 / MAX_SCORE);
      if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) {
        gameStateContainer.isGamePlaying = false;
        showGameOverOverlay();
        gameLoop.stop();
        return;
      } else if (Bumpers[0].score < scoreSwitch * 2 && Bumpers[0].score >= scoreSwitch) {
        carboardModels[0].visible = false;
        carboardModels[1].visible = true;
      } else if (Bumpers[0].score < scoreSwitch * 3 && Bumpers[0].score >= scoreSwitch * 2) {
        carboardModels[1].visible = false;
        carboardModels[2].visible = true;
      }
      Ball.temporalSpeed.x = 1;
      Ball.temporalSpeed.z = 1;

      lastBumperCollided = looserBumper;
      Ball.sphereUpdate.x = Bumpers[looserBumper].playerGlb.position.x;
      Ball.sphereUpdate.z = Bumpers[looserBumper].playerGlb.position.z + 2 * direction;
      this.handleAnimations(Bumpers[looserBumper], Bumpers[looserBumper].currentAction, 1, 0.1);
      if (Bumpers[looserBumper].currentAction == 1) {
        this.handleAnimations(Bumpers[looserBumper], Bumpers[looserBumper].currentAction, 2, 0.3);
      }
      Bumpers[looserBumper].playerGlb.rotation.y = looserBumper == 0 ? 0 : pi;
      Ball.velocity.x = 0;
      Ball.velocity.z = BALL_INITIAL_VELOCITY * GAME_SPEED * direction;
    };

    //Ai related variables
    let calculatedBumperPos = Bumpers[1].modelsGlb[Bumpers[1].modelChoosen].position;
    let bumperP1Subtick = 0;
    let bumperP2Subtick = 0;

    let isMovementDone = false;
    let isCalculationNeeded = true;

    const ballPredictedPos = new THREE.Vector3(0, 0, 0);
    const BallPredictedVelocity = new THREE.Vector3(0, 0, 0);

    let lastSignificantScoreDiff = 0;
    let choosenDifficulty = 2;
    let stableDifficulty = 2;
    const difficultyLvl = [
      [10, 1025],
      [8, 1025],
      [5, 1000],
      [2, 1000],
      [1, 1000],
    ];

    //Handling Ai
    const moveAiBumper = (calculatedPos) => {
      keyMap['KeyA'] = false;
      keyMap['KeyD'] = false;

      if (calculatedBumperPos.x < calculatedPos.x - 0.1 && calculatedBumperPos.x < calculatedPos.x - 0.2) {
        keyMap['KeyA'] = true;
        calculatedBumperPos.x += bumperP2Subtick;

        if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[0]) {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 0, 0.1);
        }
      } else if (calculatedBumperPos.x > calculatedPos.x + 0.1 && calculatedBumperPos.x > calculatedPos.x + 0.2) {
        keyMap['KeyD'] = true;
        calculatedBumperPos.x -= bumperP2Subtick;

        if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[6]) {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 6, 0.1);
        }
      } else {
        if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[0] && Bumpers[1].gltfStore.action[6]) {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
        }
      }
    };

    function calculateDifficultyLevel() {
      const gameProgress = Math.max(Bumpers[0].score, Bumpers[1].score) / MAX_SCORE;
      const scoreDiff = Bumpers[0].score - Bumpers[1].score;
      const minDifficulty = scoreDiff <= -3 ? 0 : 2;
      const relativeGap = scoreDiff / MAX_SCORE;

      const contextualFactor = relativeGap * (1 + gameProgress * 0.8) + (1 - gameProgress) * 0.7;
      const calculatedDifficulty =
        scoreDiff > 0 ? Math.floor(2 + (scoreDiff - 1) * contextualFactor * 1.5) : Math.max(0, 2 + scoreDiff);
      const finalDifficulty = Math.max(minDifficulty, Math.min(4, Math.floor(calculatedDifficulty)));

      if (Math.abs(scoreDiff - lastSignificantScoreDiff) >= Math.max(1, Math.floor(MAX_SCORE / 5))) {
        stableDifficulty = finalDifficulty;
        lastSignificantScoreDiff = scoreDiff;
      }
      choosenDifficulty = stableDifficulty;
    }

    function calculateErrorMargin(BallPosZ) {
      const errorScale = 2.5 / Bumpers[1].lenghtHalf;
      const closenessToBall = (BallPosZ - calculatedBumperPos.z) / 18;
      const errorMargin = difficultyLvl[choosenDifficulty][0] * closenessToBall * errorScale;
      return errorMargin;
    }

    function handleAiBehavior(BallPos, BallVelocity) {
      if (isCalculationNeeded) {
        BallPredictedVelocity.x = BallVelocity.x;
        BallPredictedVelocity.y = BallVelocity.y;
        BallPredictedVelocity.z = BallVelocity.z;

        ballPredictedPos.x = BallPos.x;
        ballPredictedPos.y = BallPos.y;
        ballPredictedPos.z = BallPos.z;
        calculateDifficultyLevel();
        const errorMargin = calculateErrorMargin(BallPos.z);

        const totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * GAME_SPEED);
        while (ballPredictedPos.z <= BUMPER_2_BORDER - Bumpers[1].widthHalf) {
          const totalDistanceX = Math.abs(Ball.temporalSpeed.x * BallPredictedVelocity.x * GAME_SPEED);

          if (ballPredictedPos.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF) {
            ballPredictedPos.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF;
            BallPredictedVelocity.x *= -1;
          }
          if (ballPredictedPos.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF) {
            ballPredictedPos.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF;
            BallPredictedVelocity.x *= -1;
          }

          ballPredictedPos.z += totalDistanceZ * BallPredictedVelocity.z;
          ballPredictedPos.x += totalDistanceX * BallPredictedVelocity.x;
        }

        if (Bumpers[1].lenghtHalf < 2.0) {
          ballPredictedPos.x += (Math.random() - 0.5) * errorMargin * 0.6;
        } else if (Bumpers[1].lenghtHalf > 3.0) {
          ballPredictedPos.x += -errorMargin + Math.round(Math.random()) * (errorMargin * 2);
        } else {
          ballPredictedPos.x += -errorMargin + Math.round(Math.random()) * (errorMargin * 2);
        }

        isCalculationNeeded = false;
        const timeooutId = setTimeout(() => {
          if (BallVelocity.z > 0) {
            isCalculationNeeded = true;
            clearTimeout(timeooutId);
          }
        }, difficultyLvl[choosenDifficulty][1]);
      }
      if (!isMovementDone) moveAiBumper(ballPredictedPos);
      else {
        keyMap['KeyD'] = false;
        keyMap['KeyA'] = false;
      }
    }

    // Timer related
    let Timer = (() => {
      let timeLeft = !GAME_TIME ? 180 : GAME_TIME * 60;
      let timeoutId = setTimeout(TimerCallBack, 1000);
      return {
        get timeLeft() {
          return timeLeft;
        },
        set timeLeft(newTimeLeft) {
          timeLeft = newTimeLeft;
        },
        get timeoutId() {
          return timeoutId;
        },
        set timeoutId(newTimeoutId) {
          timeoutId = newTimeoutId;
        },
      };
    })();

    function TimerCallBack() {
      if (Timer.timeLeft-- != 0 && gameStateContainer.isGamePlaying) {
        clearTimeout(Timer.timeoutId);
        timerUI?.updateRemainingTime(Timer.timeLeft);
        Timer.timeoutId = setTimeout(TimerCallBack, 1000);
        return;
      }
      showGameOverOverlay();
      gameStateContainer.isGamePlaying = false;
      clearTimeout(Timer.timeoutId);
      gameLoop.stop();
    }
    let Coin = null;
    let Workers = null;

    if (gameOptionsQuery.cool_mode == true) {
      const workerScript = `
        let remaining;
        let Timer = function(callback, delay) {
          let timerId, start = delay;
          remaining = delay;
          this.pause = function() {
            clearTimeout(timerId);
            timerId = null;
            remaining -= Date.now() - start;
          };
          this.resume = function() {
            if (timerId) return;
            start = Date.now();
            timerId = setTimeout(callback, remaining);
          };
          this.resume();
        };
        let pauseTimer = null;
        onmessage = function(e) {
          if (e.data[2] == "pause" && pauseTimer != null) {
            pauseTimer.pause();
          } else if (e.data[2] == "create") {
            pauseTimer = new Timer(function(){postMessage([e.data[1]])}, e.data[0]);
          } else if (e.data[2] == "resume" && pauseTimer != null && remaining > 0) {
            pauseTimer.resume();
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.#blobURL = URL.createObjectURL(blob);

      // Buff timer workers
      Workers = Array.from({ length: 6 }, () => new Worker(this.#blobURL));
      Workers[0].onmessage = function (e) {
        const bumperAffected = e.data[0];
        let dirZ = Bumpers[bumperAffected].playerGlb.position.z;
        if (dirZ < 0) {
          Bumpers[bumperAffected].playerGlb.position.x += 7.2;
          Bumpers[bumperAffected].playerGlb.position.z -= 0.7;
        } else {
          Bumpers[bumperAffected].playerGlb.position.x -= 7.2;
          Bumpers[bumperAffected].playerGlb.position.z += 0.7;
        }
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = false;
        Bumpers[bumperAffected].modelChoosen = 0;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = true;
        Bumpers[bumperAffected].lenghtHalf = 2.5;
        buffUI?.hide();
      };
      Workers[1].onmessage = function (e) {
        const bumperAffected = Math.abs(e.data[0] - 1);
        let dirZ = Bumpers[bumperAffected].playerGlb.position.z;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = false;
        Bumpers[bumperAffected].modelChoosen = 0;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = true;
        Bumpers[bumperAffected].lenghtHalf = 2.5;
        if (
          Bumpers[bumperAffected].cubeUpdate.x <
          WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf
        ) {
          Bumpers[bumperAffected].cubeUpdate.x =
            WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf - 0.1;
          Bumpers[bumperAffected].playerGlb.position.x =
            WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf - 0.1;
        } else if (
          Bumpers[bumperAffected].cubeUpdate.x >
          WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf
        ) {
          Bumpers[bumperAffected].cubeUpdate.x =
            WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf + 0.1;
          Bumpers[bumperAffected].playerGlb.position.x =
            WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf + 0.1;
        }
        if (dirZ < 0) {
          Bumpers[bumperAffected].playerGlb.position.x += 1;
          Bumpers[bumperAffected].playerGlb.position.z -= 0.4;
        } else {
          Bumpers[bumperAffected].playerGlb.position.x -= 1;
          Bumpers[bumperAffected].playerGlb.position.z += 0.4;
        }
        buffUI?.hide();
      };
      Workers[2].onmessage = function (e) {
        Bumpers[Math.abs(e.data[0] - 1)].controlReverse = false;
        buffUI?.hide();
      };
      Workers[3].onmessage = function (e) {
        const bumperAffected = Math.abs(e.data[0] - 1);
        Bumpers[bumperAffected].speed = 0.25 * GAME_SPEED;
        Bumpers[bumperAffected].gltfStore.action[0].setDuration(0.18);
        Bumpers[bumperAffected].gltfStore.action[5].setDuration(0.18);
        buffUI?.hide();
      };
      Workers[4].onmessage = function (e) {
        const bumperAffected = e.data[0];
        let dirZ = Bumpers[bumperAffected].playerGlb.position.z;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = false;
        Bumpers[bumperAffected].modelChoosen = 0;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = true;
        Bumpers[bumperAffected].widthHalf = 0.5;
        dirZ < 0
          ? (Bumpers[bumperAffected].playerGlb.position.x += 5)
          : (Bumpers[bumperAffected].playerGlb.position.x -= 5);
        buffUI?.hide();
      };
      Workers[5].onmessage = function () {
        Coin.cylinderUpdate.set(-9.25, 3, 0);
      };

      // Create coin
      Coin = await (async (posX, posY, posZ) => {
        const CoinGlb = await modelCreate(0, 0, 0, 0.45, 0.45, 0.45, coin);
        CoinGlb.position.x = posX;
        CoinGlb.position.y = posY;
        CoinGlb.position.z = posZ;
        const cylinderUpdate = new THREE.Vector3(posX, posY, posZ);
        const velocity = new THREE.Vector3(0.01 * GAME_SPEED, 0, 0);
        let lenghtHalf = 0.25;

        return {
          get lenghtHalf() {
            return lenghtHalf;
          },
          set lenghtHalf(newLenghtHalf) {
            lenghtHalf = newLenghtHalf;
          },
          CoinGlb,
          cylinderUpdate,
          velocity,
        };
      })(-9.25, 1, 0);
    }

    // Buff management
    const manageBuffAndDebuff = () => {
      let chooseBuff = Math.floor(Math.random() * 5);
      let dirZ = Bumpers[lastBumperCollided].playerGlb.position.z;
      const reversedLastBumperCollided = Math.abs(lastBumperCollided - 1);
      switch (chooseBuff) {
        case 1:
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = false;
          Bumpers[lastBumperCollided].modelChoosen = 1;
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = true;
          Bumpers[lastBumperCollided].lenghtHalf = 5;
          if (
            Bumpers[lastBumperCollided].cubeUpdate.x <
            WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1;
            dirZ < 0
              ? (Bumpers[lastBumperCollided].playerGlb.position.x =
                  WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1 + 1)
              : (Bumpers[lastBumperCollided].playerGlb.position.x =
                  WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1 - 1);
          } else if (
            Bumpers[lastBumperCollided].cubeUpdate.x >
            WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
            dirZ < 0
              ? (Bumpers[lastBumperCollided].playerGlb.position.x =
                  WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1 + 1)
              : (Bumpers[lastBumperCollided].playerGlb.position.x =
                  WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1 - 1);
          }
          if (dirZ < 0) {
            Bumpers[lastBumperCollided].playerGlb.position.x -= 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z += 0.7;
          } else {
            Bumpers[lastBumperCollided].playerGlb.position.x += 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z -= 0.7;
          }
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.LONG);
          break;
        case 2:
          Bumpers[reversedLastBumperCollided].modelsGlb[Bumpers[reversedLastBumperCollided].modelChoosen].visible =
            false;
          Bumpers[reversedLastBumperCollided].modelChoosen = 2;
          Bumpers[reversedLastBumperCollided].modelsGlb[Bumpers[reversedLastBumperCollided].modelChoosen].visible =
            true;
          Bumpers[reversedLastBumperCollided].lenghtHalf = 1.25;
          if (dirZ < 0) {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x += 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z -= 0.4;
          } else {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x -= 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z += 0.4;
          }
          Workers[1].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SHORT);
          break;
        case 3:
          Bumpers[reversedLastBumperCollided].controlReverse = true;
          Workers[2].postMessage([2000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SWITCH);
          break;
        case 4:
          Bumpers[reversedLastBumperCollided].speed = 0.1 * GAME_SPEED;
          Bumpers[reversedLastBumperCollided].gltfStore.action[0].setDuration(0.2);
          Bumpers[reversedLastBumperCollided].gltfStore.action[5].setDuration(0.2);
          Workers[3].postMessage([5000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SLOW);
          break;
        default:
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = false;
          Bumpers[lastBumperCollided].modelChoosen = 3;
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = true;
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          dirZ < 0
            ? (Bumpers[lastBumperCollided].playerGlb.position.x -= 5)
            : (Bumpers[lastBumperCollided].playerGlb.position.x += 5);
          Workers[4].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.LARGE);
          break;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[5].postMessage([30000, -1, 'create']);
    };

    function checkBallScored() {
      let scored = false;
      if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
        isMovementDone = true;
        Bumpers[0].score++;
        resetBall(-1);
        if (Bumpers[0].score <= MAX_SCORE) scoreUI?.updateScore(0, Bumpers[0].score);
        scored = true;
      } else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
        isMovementDone = false;
        isCalculationNeeded = true;
        Bumpers[1].score++;
        resetBall(1);
        if (Bumpers[1].score <= MAX_SCORE) scoreUI?.updateScore(1, Bumpers[1].score);
        scored = true;
      }
      return scored;
    }

    // Move if no collisions
    function manageBumperMovements() {
      if (
        ((keyMap['ArrowRight'] == true && Bumpers[0].controlReverse) ||
          (keyMap['ArrowLeft'] == true && !Bumpers[0].controlReverse)) &&
        !(Bumpers[0].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[0].lenghtHalf)
      ) {
        Bumpers[0].cubeUpdate.x += bumperP1Subtick;
        Bumpers[0].playerGlb.position.x += bumperP1Subtick;
      }
      if (
        ((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) ||
          (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) &&
        !(Bumpers[0].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[0].lenghtHalf)
      ) {
        Bumpers[0].cubeUpdate.x -= bumperP1Subtick;
        Bumpers[0].playerGlb.position.x -= bumperP1Subtick;
      }

      if (
        ((keyMap['KeyD'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[1].lenghtHalf)
      ) {
        Bumpers[1].cubeUpdate.x += bumperP2Subtick;
        Bumpers[1].playerGlb.position.x += bumperP2Subtick;
      }
      if (
        ((keyMap['KeyA'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[1].lenghtHalf)
      ) {
        Bumpers[1].cubeUpdate.x -= bumperP2Subtick;
        Bumpers[1].playerGlb.position.x -= bumperP2Subtick;
      }
    }

    const gameLoop = {
      start: () => {
        if (!this.#animationId && gameStateContainer.isGamePlaying) {
          this.#animationId = requestAnimationFrame(animate);
        }
      },
      stop: () => {
        if (this.#animationId) {
          cancelAnimationFrame(this.#animationId);
          this.#animationId = null;
        }
      },
    };

    const clock = new THREE.Clock();
    let delta = 0;
    let frameCache = {
      totalDistanceX: 0,
      totalDistanceZ: 0,
      totalSubticks: 0,
    };

    const animate = () => {
      this.#animationId = null;

      if (!gameStateContainer.isGamePlaying) return;

      delta = clock.getDelta();

      // Cache expensive calculations
      frameCache.totalDistanceX = Math.abs(Ball.temporalSpeed.x * Ball.velocity.x * GAME_SPEED);
      frameCache.totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * GAME_SPEED);
      frameCache.totalSubticks = frameCache.totalDistanceZ / SUBTICK;

      // Update temporal speeds once per frame
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);

      // Calculate subtick values once
      ballSubtickZ = SUBTICK;
      ballSubtickX = frameCache.totalDistanceX / frameCache.totalSubticks;
      bumperP1Subtick = Bumpers[0].speed / frameCache.totalSubticks;
      bumperP2Subtick = Bumpers[1].speed / frameCache.totalSubticks;

      // Optimized physics loop - reduced iterations
      const maxSubticks = Math.min(frameCache.totalSubticks, 10); // Cap iterations to prevent frame drops
      for (let subtick = 0; subtick <= maxSubticks; subtick++) {
        // Batch collision checks for better performance
        const collisions = {
          wall: checkWallCollision(),
          bumper: checkBumperCollision(),
          scored: checkBallScored(),
        };

        if (collisions.scored) break; // Early exit on score

        manageBumperMovements();

        // Update coin if exists (reduced calculations)
        if (Coin?.CoinGlb) {
          updateCoin(Coin, ballSubtickZ, ballSubtickX);
        }

        // Update ball position
        Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
        Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;

        // AI behavior (only when needed)
        if (isGameAi === 'ai' && Ball.velocity.z > 0) {
          handleAiBehavior(Ball.sphereUpdate, Ball.velocity);
        }
      }

      // Update visual positions (once per frame)
      updateVisualPositions();

      // Update animations
      if (Bumpers[0].gltfStore?.mixer && Bumpers[1].gltfStore?.mixer) {
        Bumpers[0].gltfStore.mixer.update(delta);
        Bumpers[1].gltfStore.mixer.update(delta);
      }

      renderer.render(scene, camera);
      gameLoop.start();
    };

    function updateCoin(coin, ballSubtickZ, ballSubtickX) {
      if (isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX)) {
        manageBuffAndDebuff();
      }

      // Check boundaries
      if (
        coin.cylinderUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + coin.lenghtHalf ||
        coin.cylinderUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - coin.lenghtHalf
      ) {
        coin.velocity.x *= -1;
      }

      coin.cylinderUpdate.x += coin.velocity.x;
      coin.CoinGlb.position.set(coin.cylinderUpdate.x, 1, coin.cylinderUpdate.z);
      coin.CoinGlb.rotation.set(0, coin.cylinderUpdate.x, -pi / 2);
    }

    function updateVisualPositions() {
      Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);

      Bumpers[0].modelsGlb[Bumpers[0].modelChoosen].position.set(
        Bumpers[0].cubeUpdate.x,
        Bumpers[0].cubeUpdate.y,
        Bumpers[0].cubeUpdate.z,
      );

      Bumpers[1].modelsGlb[Bumpers[1].modelChoosen].position.set(
        Bumpers[1].cubeUpdate.x,
        Bumpers[1].cubeUpdate.y,
        Bumpers[1].cubeUpdate.z,
      );
    }
    let gameStartAndStop = [gameLoop.start, gameLoop.stop];

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(
      keyMap,
      Workers,
      gameStartAndStop,
      gameStateContainer,
      Timer,
      TimerCallBack,
      Bumpers,
    );
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(keyMap, Bumpers);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, gameLoop.start, gameLoop.stop, Workers, scene];
  }

  disconnectedCallback() {
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

    // Clean up Workers and blob URL
    if (this.Workers) {
      this.Workers.forEach((worker) => {
        if (worker) {
          worker.terminate();
        }
      });
      this.Workers = null;
    }
    if (this.#blobURL) {
      URL.revokeObjectURL(this.#blobURL);
      this.#blobURL = null;
    }

    this.disposeThreeJS();

    if (this.#ktx2Loader) {
      this.#ktx2Loader.dispose();
      this.#ktx2Loader = null;
    }
    if (this.loaderModel) {
      this.loaderModel = null;
    }

    if (this.stop) {
      this.stop();
    }
  }

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

  async render() {
    try {
      const [camera, renderer, start, stop, workers, scene] = await this.game();

      if (!renderer || !camera || !start) {
        throw new Error('Game components failed to initialize');
      }

      this.stop = stop;
      this.Workers = workers;
      this.scene = scene;

      // Store resize handler for proper cleanup
      this.#resizeHandler = () => {
        renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
        const rendererWidth = renderer.domElement.offsetWidth;
        const rendererHeight = renderer.domElement.offsetHeight;
        camera.aspect = rendererWidth / rendererHeight;
        camera.updateProjectionMatrix();
      };

      window.addEventListener('resize', this.#resizeHandler);
      start();
    } catch (error) {
      if (error.message.includes('WebGL')) {
        this.handleError('WEBGL_NOT_SUPPORTED', error);
      } else {
        this.handleError('GAME_INIT_FAILED', error);
      }
    }
  }
}

customElements.define('singleplayer-game', Game);
