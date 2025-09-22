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
import { DEFAULT_GAME_OPTIONS } from '@env';
import { sessionExpiredToast } from '@utils';
import './components/index';
import { OVERLAY_TYPE, BUFF_TYPE } from './components/index';
import { DEFAULT_AVATAR } from '@env';

/* eslint no-var: "off" */
/* eslint-disable new-cap */

/**
 * Standardized error logging utility
 */
const GameLogger = {
  error: (context, message, error = null) => {
    console.error(`[Game:${context}] ERROR: ${message}`, error || '');
  },
  warn: (context, message) => {
    console.warn(`[Game:${context}] WARNING: ${message}`);
  },
  info: (context, message) => {
    console.log(`[Game:${context}] INFO: ${message}`);
  },
  debug: (context, message) => {
    console.log(`[Game:${context}] DEBUG: ${message}`);
  },
};

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
      // Player 1 rotations: [table, couch, chair, dressing]
      [this.degreesToRadians(235), this.degreesToRadians(-90), this.degreesToRadians(235), this.degreesToRadians(-90)],
      // Player 2 rotations: [table, couch, chair, dressing]
      [this.degreesToRadians(55), this.degreesToRadians(90), this.degreesToRadians(55), this.degreesToRadians(90)],
    ];
  }

  /**
   * Initialize all UI elements for the game
   * Creates scoreboard, timer, buff icons, life points, and overlay
   */
  initializeUIElements() {
    GameLogger.info('UIInit', 'Initializing UI elements');

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
        GameLogger.debug('UIInit', 'Timer appended to wrapper');
      } else {
        GameLogger.warn('UIInit', 'Timer wrapper not found, skipping timer creation');
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

      GameLogger.debug('UIInit', `Created ${propName}`);
    }
  }

  /**
   * Called when the element is added to the DOM
   * Handles authentication, initialization, and rendering
   */
  async connectedCallback() {
    try {
      GameLogger.info('Initialization', 'Starting game initialization...');

      // Check user authentication status
      const authStatus = await auth.fetchAuthStatus();
      if (!authStatus.success) {
        if (authStatus.status === 429) {
          GameLogger.warn('Initialization', 'Rate limited during auth check');
          return; // Rate limited
        }
        if (authStatus.status === 401) {
          GameLogger.warn('Initialization', 'Session expired, redirecting to login');
          sessionExpiredToast();
        }
        router.redirect('/login');
        return;
      }
      this.#state.user = authStatus.response;

      // Configure element styling
      this.classList.add('position-relative');
      this.style.overflow = 'hidden'; // Prevent scrollbars
      this.style.position = 'relative'; // Allow overlay positioning

      GameLogger.debug('Initialization', `Game options: ${JSON.stringify(this.#state.gameOptions)}`);

      // Initialize UI and start the game
      this.initializeUIElements();
      await this.render();

      GameLogger.info('Initialization', 'Game initialization completed successfully');
    } catch (error) {
      GameLogger.error('Initialization', 'Game initialization failed', error);
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

    GameLogger.debug('Config', `Game type: ${this.#state.gameType}`);
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
        GameLogger.warn('Animation', `Rotation update failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if animation system is ready and pedro model loaded
   * @param {Object} bumper - Player object to check
   * @returns {boolean} True if animations are available
   */
  isAnimationSystemReady(bumper) {
    return !!(bumper?.gltfStore?.mixer && bumper.gltfStore.action);
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
   * Create keydown event handler for game controls
   * @param {Object} keyMap - Key state tracking object
   * @param {Array} gameStartAndStop - Game loop control functions
   * @param {Object} gameStateContainer - Game state object
   * @param {Object} Timer - Timer object
   * @param {Function} TimerCallBack - Timer callback function
   * @param {Array} Bumpers - Player objects
   * @returns {Function} Event handler function
   */
  createOnDocumentKeyDown(keyMap, gameStartAndStop, gameStateContainer, Timer, TimerCallBack, Bumpers) {
    return (e) => {
      const tag = e.target.tagName.toLowerCase();
      // Ignore key events on form elements
      if (tag === 'input' || tag === 'textarea') {
        return;
      }
      if (e.defaultPrevented) {
        return;
      }
      const keyCode = e.code;

      // Handle Player 1 animations (Arrow keys)
      if (keyCode == 'ArrowLeft') {
        this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 0, 0.1);
      }
      if (keyCode == 'ArrowRight') {
        this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 5, 0.1);
      }
      // Handle key mapping based on game mode
      if (keyCode != 'KeyA' && keyCode != 'KeyD' && this.#state.gameType == 'ai') {
        // In AI mode, only Player 1 controls are active
        keyMap[keyCode] = true;
      } else if (this.#state.gameType != 'ai') {
        // In local multiplayer, both players can control
        keyMap[keyCode] = true;

        // Handle Player 2 animations (WASD keys)
        if (keyCode == 'KeyA') {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 5, 0.1);
        }
        if (keyCode == 'KeyD') {
          this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 0, 0.1);
        }
      }
      // Handle pause/resume with Escape key
      if (keyCode == 'Escape') {
        if (gameStateContainer.isPaused == false) {
          // Pause the game
          gameStartAndStop[1]();
          if (this.Workers) {
            this.Workers.forEach((worker) => {
              if (worker) {
                worker.postMessage([-1, -1, 'pause']);
              }
            });
          }
          clearTimeout(Timer.timeoutId);
          gameStateContainer.isPaused = true;
        } else {
          // Resume the game
          if (this.Workers) {
            this.Workers.forEach((worker) => {
              if (worker) {
                worker.postMessage([-1, -1, 'resume']);
              }
            });
          }
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
      if (e.defaultPrevented) {
        return;
      }
      const keyCode = e.code;
      keyMap[keyCode] = false;
      // Return Player 1 to idle animation when keys are released
      if (keyCode == 'ArrowRight') {
        this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
      }
      if (keyCode == 'ArrowLeft') {
        this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
      }
      // Return Player 2 to idle animation when keys are released
      if (keyCode == 'KeyA') {
        this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
      }
      if (keyCode == 'KeyD') {
        this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
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
   * Create and configure the WebGL renderer
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
   * Create a fallback player model when pedro model fails to load
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
   * Main game logic and initialization
   * Sets up the 3D scene, physics, controls, and game loop
   * @returns {Array} Game components [camera, renderer, start, stop, workers, scene]
   */
  async game() {
    // Extract game configuration
    const gameOptionsQuery = this.#state.gameOptions;
    const isGameAi = this.#state.gameType;

    // GAME CONSTANTS
    // Game boundaries and collision detection
    const BUMPER_1_BORDER = -10; // Player 1 goal line
    const BUMPER_2_BORDER = -BUMPER_1_BORDER; // Player 2 goal line
    const BUMPER_LENGTH_HALF = 2.5; // Half bumper length
    const BUMPER_WIDTH_HALF = 0.5; // Half bumper width
    const BUMPER_SPEED = 0.25;

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
    const overlayUI = this.overlay;

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

    // Utility functions and constants
    const degreesToRadians = this.degreesToRadians;
    const pi = Math.PI;

    // Input handling
    const keyMap = []; // Tracks which keys are currently pressed

    // Game state management with getter/setter pattern

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

    // UI element references for game updates
    const buffUI = this.buffIconElement;
    const timerUI = this.timerElement;
    const scoreUI = this.scoreElement;
    const lifePointUI = this.lifePointElement;

    // Initialize WebGL renderer
    const renderer = await this.createRenderer();
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

    // Helper function for model creation and scene addition
    const modelCreate = async (posX, posY, posZ, scaleX, scaleY, scaleZ, modelName) => {
      const modelGenerated = await this.createModelLoader(modelName, posX, posY, posZ, scaleX, scaleY, scaleZ);
      scene.add(modelGenerated);
      return modelGenerated;
    };

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

    // Environment setup - Background elements

    // Cardboard signs that change based on score progression
    const cardboardModels = [];
    const cardboardModelStates = [cardboard, cardboard2, cardboard3];

    for (let i = 0; i <= 2; i++) {
      const cardboardGlb = await modelCreate(-15, 0, 0, 1.6, 1.6, 2.2, cardboardModelStates[i]);
      cardboardGlb.rotateY(pi / 2);
      cardboardModels[i] = cardboardGlb;
    }
    // Initially show only the first cardboard sign
    cardboardModels[1].visible = false;
    cardboardModels[2].visible = false;

    // Desert environment - Cactus placement system
    const cacti = [];
    const placedCacti = []; // Track positions to avoid overlap
    const minDistance = 8; // Minimum distance between cacti

    // Factory function for creating randomly rotated cacti
    // Factory function for creating randomly rotated cacti with error handling
    const CactusFactory = async (posX, posY, posZ) => {
      try {
        const cactusGlb = await modelCreate(posZ, posY, posX, 1.8, 1.8, 1.8, cactus);
        cactusGlb.rotateY(degreesToRadians(Math.random() * 360)); // Random rotation
        return { cactusGlb };
      } catch (error) {
        GameLogger.warn('CactusFactory', `Failed to load cactus, using fallback: ${error.message}`);
        return { cactusGlb: this.createFallbackModel(posZ, posY, posX, 1.8, 1.8, 1.8) };
      }
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

    // Create desert landscape with 60 cacti
    const cactusPromises = [];
    for (let index = 0; index < 60; index++) {
      const pos = getSafeCactusPosition();
      placedCacti.push(pos);
      cactusPromises.push(CactusFactory(pos.x, 0, pos.z));
    }

    // Initialize performance optimization systems early
    this.initSharedMaterials();
    this.initRenderOptimizations(camera, scene);

    // Load all cacti in parallel for better performance
    const loadedCacti = await Promise.all(cactusPromises);
    loadedCacti.forEach((cactus, index) => {
      cacti[index] = cactus;
      // Register cacti for frustum culling
      if (this.renderOptimizer && cactus.cactusGlb) {
        this.renderOptimizer.registerStatic(cactus.cactusGlb, 'cactus');
      }
    });

    // Create layered hills for background depth with shared materials
    const createHill = (posX, posZ, width, height) => {
      // Create hill base (wider, shorter) using shared material
      const baseGeometry = new THREE.CylinderGeometry(width * 1.5, width * 2, height * 0.3, 8);
      const base = new THREE.Mesh(baseGeometry, this.sharedMaterials.hillMaterial);
      base.position.set(posX, -height * 0.1, posZ);
      base.receiveShadow = true;
      scene.add(base);

      // Create hill top (narrower, taller) using shared material
      const hillGeometry = new THREE.CylinderGeometry(width * 0.8, width, height, 8);
      const hill = new THREE.Mesh(hillGeometry, this.sharedMaterials.hillMaterial);
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

      // Create player model with robust loading and fallback protection
      const playerModelData = await this.loadPedroModelWithFallback(posX, posZ, scene);
      const playerGlb = playerModelData.playerGlb;

      // Update gltfStore with loaded data
      _ = playerModelData.gltfStore;

      // Apply table rotation based on player position
      if (posZ < 0) {
        tableGlb.rotation.z = Math.PI;
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
      let lengthHalf = BUMPER_LENGTH_HALF;
      let modelChoosen = 0;
      let widthHalf = BUMPER_WIDTH_HALF;
      let controlReverse = false;
      let speed = BUMPER_SPEED * GAME_SPEED;
      let score = 0;
      let currentAction = playerModelData.currentAction;

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
        get lengthHalf() {
          return lengthHalf;
        },
        set lengthHalf(newLengthHalf) {
          lengthHalf = newLengthHalf;
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

    // Register dynamic objects for optimized rendering
    if (this.renderOptimizer) {
      // Register ball as dynamic object
      this.renderOptimizer.registerDynamic(Ball.bulletGlb, 'ball');

      // Register player models as dynamic objects
      if (Bumpers[0].playerGlb) {
        this.renderOptimizer.registerDynamic(Bumpers[0].playerGlb, 'player1');
      }
      if (Bumpers[1].playerGlb) {
        this.renderOptimizer.registerDynamic(Bumpers[1].playerGlb, 'player2');
      }

      // Register player furniture as static (they don't move much)
      Bumpers.forEach((bumper, index) => {
        bumper.modelsGlb.forEach((model, modelIndex) => {
          this.renderOptimizer.registerStatic(model, `furniture_p${index}_${modelIndex}`);
        });
      });

      GameLogger.info(
        'RenderOptimizer',
        `Registered ${this.renderOptimizer.getStats().totalObjects} objects for culling`,
      );
    }

    // Collisions checks

    let ballSubtickZ;
    let ballSubtickX;
    let lastBumperCollided = 0;

    /**
     * Collision detection between ball and power-up coin
     * Uses AABB (Axis-Aligned Bounding Box) collision detection
     * @param {Object} coin - The coin object with position data
     * @param {number} ballSubtickZ - Ball's Z-axis movement in this subtick
     * @param {number} ballSubtickX - Ball's X-axis movement in this subtick
     * @returns {boolean} True if collision detected
     */
    function isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX) {
      return (
        Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= coin.cylinderUpdate.x + 0.25 &&
        Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= coin.cylinderUpdate.x - 0.25 &&
        Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= coin.cylinderUpdate.z + 0.05 &&
        Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= coin.cylinderUpdate.z - 0.05
      );
    }

    /**
     * Advanced collision detection between ball and player bumper
     * Accounts for ball movement prediction and dynamic bumper sizing
     * @param {Object} bumper - Player bumper object with position and size data
     * @param {number} ballSubtickZ - Ball's predicted Z movement
     * @param {number} ballSubtickX - Ball's predicted X movement
     * @returns {boolean} True if collision will occur
     */
    function isCollidedWithBall(bumper, ballSubtickZ, ballSubtickX) {
      return (
        Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= bumper.cubeUpdate.x + bumper.lengthHalf &&
        Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= bumper.cubeUpdate.x - bumper.lengthHalf &&
        Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= bumper.cubeUpdate.z + bumper.widthHalf &&
        Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= bumper.cubeUpdate.z - bumper.widthHalf
      );
    }

    function calculateNewDir(bumper) {
      const collisionPosX = bumper.cubeUpdate.x - Ball.sphereUpdate.x;
      const normalizedCollisionPosX = collisionPosX / (BALL_RADIUS + bumper.lengthHalf);
      const bounceAngleRadians = degreesToRadians(55 * normalizedCollisionPosX);
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
      const winner = {
        number: Bumpers[0].score === MAX_SCORE ? 1 : 2,
        name: Bumpers[0].score === MAX_SCORE ? 'Player 1' : 'Player 2',
        avatar: DEFAULT_AVATAR,
      };
      const loser = {
        number: Bumpers[0].score === MAX_SCORE ? 2 : 1,
        name: Bumpers[0].score === MAX_SCORE ? 'Player 2' : 'Player 1',
        avatar: DEFAULT_AVATAR,
      };
      if (this.#state.gameType === 'ai') {
        winner.name = winner.number === 1 ? 'You' : 'AI Player';
        loser.name = loser.number === 1 ? 'You' : 'AI Player';
        if (this.#state.user && this.#state.user.avatar) {
          winner.number === 1 ? (winner.avatar = this.#state.user.avatar) : (loser.avatar = this.#state.user.avatar);
        }
      }
      const resultData = {
        winner: winner,
        loser: loser,
        isLocal: true,
      };
      overlayUI.show(OVERLAY_TYPE.GAMEOVER, resultData);
    };

    const scoreSwitch = MAX_SCORE / 3;

    const resetBall = (direction) => {
      const looserBumper = direction < 0 ? 1 : 0;

      lifePointUI?.decreasePoint(looserBumper, 20 / MAX_SCORE);
      if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) {
        gameStateContainer.isGamePlaying = false;
        showGameOverOverlay();
        gameLoop.stop();
        return;
      } else if (Bumpers[0].score < scoreSwitch * 2 && Bumpers[0].score >= scoreSwitch) {
        cardboardModels[0].visible = false;
        cardboardModels[1].visible = true;
      } else if (Bumpers[0].score < scoreSwitch * 3 && Bumpers[0].score >= scoreSwitch * 2) {
        cardboardModels[1].visible = false;
        cardboardModels[2].visible = true;
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

    // AI related variables
    const calculatedBumperPos = Bumpers[1].modelsGlb[Bumpers[1].modelChoosen].position;
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

    // Handling AI
    const moveAiBumper = (calculatedPos) => {
      keyMap['KeyA'] = false;
      keyMap['KeyD'] = false;

      if (calculatedBumperPos.x < calculatedPos.x - 0.1 && calculatedBumperPos.x < calculatedPos.x - 0.2) {
        keyMap['KeyA'] = true;
        calculatedBumperPos.x += bumperP2Subtick;

        this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 0, 0.1);
      } else if (calculatedBumperPos.x > calculatedPos.x + 0.1 && calculatedBumperPos.x > calculatedPos.x + 0.2) {
        keyMap['KeyD'] = true;
        calculatedBumperPos.x -= bumperP2Subtick;
        this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 6, 0.1);
      } else {
        this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 2, 0.5);
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
      const errorScale = 2.5 / Bumpers[1].lengthHalf;
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
        } else {
          ballPredictedPos.x += -errorMargin + Math.round(Math.random()) * (errorMargin * 2);
        }

        isCalculationNeeded = false;
        const timeoutId = setTimeout(() => {
          if (BallVelocity.z > 0) {
            isCalculationNeeded = true;
            clearTimeout(timeoutId);
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
    const Timer = (() => {
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
      Bumpers[0].score = 0;
      Bumpers[1].score = 0;
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
      Workers = Array.from({ length: 2 }, () => new Worker(this.#blobURL));
      Workers[0].onmessage = function (e) {
        for (let i = 0; i < Bumpers.length; i++) {
          const bumper = Bumpers[i];

          // Reset control and speed effects
          bumper.controlReverse = false;
          bumper.speed = BUMPER_SPEED * GAME_SPEED;

          // Reset size effects
          bumper.lengthHalf = BUMPER_LENGTH_HALF;
          bumper.widthHalf = BUMPER_WIDTH_HALF;
          if (bumper.cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lengthHalf) {
            bumper.cubeUpdate.x = WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lengthHalf - 0.1;
            bumper.playerGlb.position.x = WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lengthHalf - 0.1;
          } else if (bumper.cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lengthHalf) {
            bumper.cubeUpdate.x = WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lengthHalf + 0.1;
            bumper.playerGlb.position.x = WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lengthHalf + 0.1;
          }

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
        buffUI?.hide();
      };
      Workers[1].onmessage = function () {
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
        let lengthHalf = 0.25;

        return {
          get lengthHalf() {
            return lengthHalf;
          },
          set lengthHalf(newLengthHalf) {
            lengthHalf = newLengthHalf;
          },
          CoinGlb,
          cylinderUpdate,
          velocity,
        };
      })(-9.25, 1, 0);
    }

    // Buff management
    const manageBuffAndDebuff = () => {
      const chooseBuff = Math.floor(Math.random() * 5);
      const dirZ = Bumpers[lastBumperCollided].playerGlb.position.z;
      const reversedLastBumperCollided = Math.abs(lastBumperCollided - 1);
      switch (chooseBuff) {
        case 1:
          safeModelSwitch(Bumpers[lastBumperCollided], 1);
          Bumpers[lastBumperCollided].lengthHalf = 5;
          if (
            Bumpers[lastBumperCollided].cubeUpdate.x <
            WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lengthHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lengthHalf - 0.1;
          } else if (
            Bumpers[lastBumperCollided].cubeUpdate.x >
            WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lengthHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lengthHalf + 0.1;
          }
          if (dirZ < 0) {
            Bumpers[lastBumperCollided].playerGlb.position.x = Bumpers[lastBumperCollided].cubeUpdate.x + 1 - 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z += 0.7;
          } else {
            Bumpers[lastBumperCollided].playerGlb.position.x = Bumpers[lastBumperCollided].cubeUpdate.x - 1 + 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z -= 0.7;
          }
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.LONG);
          break;
        case 2:
          safeModelSwitch(Bumpers[reversedLastBumperCollided], 2);
          Bumpers[reversedLastBumperCollided].lengthHalf = 1.25;
          if (dirZ < 0) {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x += 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z -= 0.4;
          } else {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x -= 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z += 0.4;
          }
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SHORT);
          break;
        case 3:
          Bumpers[reversedLastBumperCollided].controlReverse = true;
          Workers[0].postMessage([2000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SWITCH);
          break;
        case 4:
          Bumpers[reversedLastBumperCollided].speed = 0.1 * GAME_SPEED;
          Bumpers[reversedLastBumperCollided].gltfStore.action[0].setDuration(0.2);
          Bumpers[reversedLastBumperCollided].gltfStore.action[5].setDuration(0.2);
          Workers[0].postMessage([5000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.SLOW);
          break;
        default:
          safeModelSwitch(Bumpers[lastBumperCollided], 3);
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          dirZ < 0
            ? (Bumpers[lastBumperCollided].playerGlb.position.x -= 5)
            : (Bumpers[lastBumperCollided].playerGlb.position.x += 5);
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.show(BUFF_TYPE.LARGE);
          break;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[1].postMessage([30000, -1, 'create']);
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
        !(Bumpers[0].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[0].lengthHalf)
      ) {
        Bumpers[0].cubeUpdate.x += bumperP1Subtick;
        Bumpers[0].playerGlb.position.x += bumperP1Subtick;
      }
      if (
        ((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) ||
          (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) &&
        !(Bumpers[0].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[0].lengthHalf)
      ) {
        Bumpers[0].cubeUpdate.x -= bumperP1Subtick;
        Bumpers[0].playerGlb.position.x -= bumperP1Subtick;
      }

      if (
        ((keyMap['KeyD'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - Bumpers[1].lengthHalf)
      ) {
        Bumpers[1].cubeUpdate.x += bumperP2Subtick;
        Bumpers[1].playerGlb.position.x += bumperP2Subtick;
      }
      if (
        ((keyMap['KeyA'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + Bumpers[1].lengthHalf)
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
    const frameCache = {
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

      // Update animations with comprehensive safety checks (only if models moved)
      try {
        if (this.isAnimationSystemReady(Bumpers[0])) {
          Bumpers[0].gltfStore.mixer.update(delta);
        }
        if (this.isAnimationSystemReady(Bumpers[1])) {
          Bumpers[1].gltfStore.mixer.update(delta);
        }
      } catch (error) {
        GameLogger.warn('Animation', 'Error updating animation mixers', error);
      }

      // Performance optimization: Update object visibility with frustum culling
      if (this.renderOptimizer) {
        this.renderOptimizer.updateVisibility(camera);
      }

      // Optimized render call - only render if game is actively playing
      if (gameStateContainer.isGamePlaying) {
        renderer.render(scene, camera);
      }

      gameLoop.start();
    };

    function updateCoin(coin, ballSubtickZ, ballSubtickX) {
      if (isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX)) {
        manageBuffAndDebuff();
      }

      // Check boundaries
      if (
        coin.cylinderUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + coin.lengthHalf ||
        coin.cylinderUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - coin.lengthHalf
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
    const gameStartAndStop = [gameLoop.start, gameLoop.stop];

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(
      keyMap,
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

  cleanup() {
    GameLogger.info('Cleanup', 'Starting comprehensive cleanup...');

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

      // Clean up UI elements
      this.cleanupUIElements();
    } catch (error) {
      GameLogger.error('Cleanup', 'Error during initial cleanup phase', error);
    }

    try {
      // Clean up Workers and blob URL
      if (this.Workers) {
        this.Workers.forEach((worker) => {
          if (worker) {
            worker.terminate();
          }
        });
        this.Workers = null;
        GameLogger.debug('Cleanup', 'Workers terminated');
      }
      if (this.#blobURL) {
        URL.revokeObjectURL(this.#blobURL);
        this.#blobURL = null;
        GameLogger.debug('Cleanup', 'Blob URL revoked');
      }

      // Stop game loop first to prevent conflicts
      if (this.stop) {
        this.stop();
        GameLogger.debug('Cleanup', 'Game loop stopped');
      }

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

      GameLogger.info('Cleanup', 'Single-player cleanup completed successfully');
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
