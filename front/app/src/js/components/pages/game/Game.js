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
import { OVERLAY_TYPE } from './components/index';

/* eslint no-var: "off" */
export class Game extends HTMLElement {
  #ktx2Loader = null;
  #navbarHeight = 64;
  #state = {
    gameOptions: {},
    gameType: '', // 'classic' or 'ai'
  };

  constructor() {
    super();

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }

    this.timerElement = null;
    this.buffIconElement = null;
    this.scoreElement = null;
    this.lifePointElement = null;
    this.overlay = null;

    this.modelRotation = [
      [this.degreesToRadians(235), this.degreesToRadians(-90)],
      [this.degreesToRadians(55), this.degreesToRadians(90)],
    ];
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 429) {
        return;
      }
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    this.classList.add('position-relative');
    this.scoreElement = document.createElement('game-scoreboard');
    if (this.scoreElement && this.#state.gameType === 'ai') {
      this.scoreElement.setNames('Player1', 'AI player');
    }
    this.appendChild(this.scoreElement);
    this.timerElement = document.createElement('game-timer');
    this.timerElement?.setInitialTimeLimit(this.#state.gameOptions.time_limit * 60); // Initial time limit in second
    document.getElementById('game-timer-wrapper')?.appendChild(this.timerElement);
    this.buffIconElement = document.createElement('game-buff-icon');
    this.appendChild(this.buffIconElement);
    this.lifePointElement = document.createElement('game-life-point');
    this.appendChild(this.lifePointElement);
    this.overlay = document.createElement('game-overlay');
    this.overlay.gameType = `local-${this.#state.gameType}`;
    this.appendChild(this.overlay);

    await this.render();
  }

  setQueryParam(param) {
    this.#state.gameType = param.get('type') || 'classic';

    const coolModeParam = param.get('cool_mode');
    const isCoolModeValid = !coolModeParam || coolModeParam === 'any';
    const coolMode = coolModeParam && coolModeParam.toLowerCase().trim() !== 'false';
    this.#state.gameOptions.cool_mode = isCoolModeValid ? DEFAULT_GAME_OPTIONS.coolMode : coolMode;

    const gameSpeed = param.get('game_speed');
    const isGameSpeedValid = !gameSpeed || gameSpeed === 'any' || !['slow', 'medium', 'fast'].includes(gameSpeed);
    this.#state.gameOptions.game_speed = isGameSpeedValid ? DEFAULT_GAME_OPTIONS.gameSpeed : gameSpeed;

    const scoreToWinParam = param.get('score_to_win');
    const scoreToWin = parseInt(scoreToWinParam);
    const isScoreToWinValid = !scoreToWin || scoreToWin === 'any' || !(scoreToWin >= 3 && scoreToWin <= 20);
    this.#state.gameOptions.score_to_win = isScoreToWinValid ? DEFAULT_GAME_OPTIONS.scoreToWin : scoreToWin;

    const timeLimitParam = param.get('time_limit');
    const timeLimit = parseInt(timeLimitParam);
    const isTimeLimitValid = !timeLimit || timeLimit === 'any' || !(timeLimit >= 1 && timeLimit <= 5);
    this.#state.gameOptions.time_limit = isTimeLimitValid ? DEFAULT_GAME_OPTIONS.timeLimitMinutes : timeLimit;

    this.#state.gameOptions.ranked = false;

    log.info('Game type:', this.#state.gameType);
  }

  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  handleAnimations(ourBumper, currentAction, nextAction, fadeTime) {
    const ourBumperIndex = ourBumper.dirZ < 1 ? 0 : 1;

    if (currentAction != nextAction) {
      ourBumper.gltfStore.action[currentAction].fadeOut(fadeTime);
      ourBumper.gltfStore.action[nextAction].reset();
      ourBumper.gltfStore.action[nextAction].fadeIn(fadeTime);
      ourBumper.gltfStore.action[nextAction].play();
      ourBumper.currentAction = nextAction;

      if (ourBumper.modelChoosen == 0) ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][0];
      else ourBumper.playerGlb.rotation.y = this.modelRotation[ourBumperIndex][1];
    }
  }

  createOnDocumentKeyDown(keyMap, Workers, gameStartAndStop, gameStateContainer, Timer, myCallback, Bumpers) {
    return (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        return; // Do not process key events on input or textarea elements
      }
      if (e.defaultPrevented) {
        return;
      }
      const keyCode = e.code;
      if (keyCode != 'KeyA' && keyCode != 'KeyD' && this.#state.gameType == 'ai') {
        keyMap[keyCode] = true;
        if (Bumpers[0].gltfStore.action && Bumpers[0].gltfStore.action[0] && Bumpers[0].gltfStore.action[5]) {
          if (keyCode == 'ArrowLeft') {
            this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 0, 0.1);
          }
          if (keyCode == 'ArrowRight') {
            this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 5, 0.1);
          }
        }
      } else if (this.#state.gameType != 'ai') {
        keyMap[keyCode] = true;
        if (Bumpers[0].gltfStore.action && Bumpers[0].gltfStore.action[0] && Bumpers[0].gltfStore.action[5]) {
          if (keyCode == 'ArrowLeft') {
            this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 5, 0.1);
          }
          if (keyCode == 'ArrowRight') {
            this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 0, 0.1);
          }
        }
        if (Bumpers[1].gltfStore.action && Bumpers[1].gltfStore.action[0] && Bumpers[1].gltfStore.action[5]) {
          if (keyCode == 'KeyA') {
            this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 5, 0.1);
          }
          if (keyCode == 'KeyD') {
            this.handleAnimations(Bumpers[1], Bumpers[1].currentAction, 0, 0.1);
          }
        }
      }
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
          Timer.timeoutId = setTimeout(myCallback, 1000);
          gameStateContainer.isPaused = false;
          gameStartAndStop[0]();
        }
      }
      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(keyMap, Bumpers) {
    return (e) => {
      if (e.defaultPrevented) {
        return;
      }
      const keyCode = e.code;
      keyMap[keyCode] = false;
      if (Bumpers[0].gltfStore.action && Bumpers[0].gltfStore.action[2]) {
        if (keyCode == 'ArrowRight') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
        }
        if (keyCode == 'ArrowLeft') {
          this.handleAnimations(Bumpers[0], Bumpers[0].currentAction, 2, 0.5);
        }
      }
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

  async initLoaders(renderer) {
    this.#ktx2Loader = new KTX2Loader().setTranscoderPath('/libs/basis/').detectSupport(renderer);

    await MeshoptDecoder.ready;

    this.loaderModel = new GLTFLoader();
    this.loaderModel.setKTX2Loader(this.#ktx2Loader);
    this.loaderModel.setMeshoptDecoder(MeshoptDecoder);
  }

  async game() {
    let keyMap = [];
    const buffUI = this.buffIconElement;
    const timerUI = this.timerElement;
    const scoreUI = this.scoreElement;
    const lifePointUI = this.lifePointElement;

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

    const pi = Math.PI;
    const WALL_WIDTH_HALF = 0.5;
    const gameOptionsQuery = this.#state.gameOptions;
    const isGameAi = this.#state.gameType;
    let gameSpeed;
    switch (gameOptionsQuery.game_speed) {
      case 'slow':
        gameSpeed = 0.75;
        break;
      case 'medium':
        gameSpeed = 1.0;
        break;
      case 'fast':
        gameSpeed = 1.25;
        break;
      default:
        gameSpeed = 1.0;
        break;
    }
    const degreesToRadians = this.degreesToRadians;
    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const WALL_LEFT_X = 10;
    const WALL_RIGHT_X = -WALL_LEFT_X;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.05;
    const GAME_TIME = gameOptionsQuery.time_limit;
    const BALL_INITIAL_VELOCITY = 0.25;
    const MAX_SCORE = gameOptionsQuery.score_to_win;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;

    const carboardModelStates = [carboard, carboard2, carboard3];
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x8e4f5e, 1);
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8e4f5e, 0.008);
    await this.initLoaders(renderer);

    const camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    camera.position.set(0, 12, -20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const modelCreate = (posX, posY, posZ, scaleX, scaleY, scaleZ, modelName) => {
      const modelGenerated = new THREE.Object3D();
      this.loaderModel.load(
        modelName,
        function (gltf) {
          const model = gltf.scene;
          model.traverse(function (node) {
            if (node.isMesh) {
              node.castShadow = true;
            }
          });
          model.position.x = posX;
          model.position.y = posY;
          model.position.z = posZ;
          modelGenerated.add(gltf.scene);
          gltf.scene.scale.set(scaleX, scaleY, scaleZ);
        },
        undefined,
        function (error) {
          console.error(error);
        },
      );
      scene.add(modelGenerated);
      return modelGenerated;
    };

    const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    sunLight.position.set(25, 35, -50);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -60;

    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.3);

    const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.4);
    fillLight.position.set(30, 20, -10);
    fillLight.castShadow = false;

    let carboardModels = [null, null, null];
    for (let i = 0; i <= 2; i++) {
      const carboardGlb = modelCreate(-15, 0, 0, 1.6, 1.6, 2.2, carboardModelStates[i]);
      carboardGlb.rotation.y = pi / 2;
      carboardModels[i] = carboardGlb;
    }
    carboardModels[1].visible = false;
    carboardModels[2].visible = false;

    const CactusFactory = (posX, posY, posZ) => {
      const cactusGlb = modelCreate(posZ, posY, posX, 1.8, 1.8, 1.8, cactus);
      cactusGlb.rotateY(degreesToRadians(Math.random() * 360));
      return {
        cactusGlb,
      };
    };

    const cacti = [];
    const placedCacti = [];
    const minDistance = 8;

    const getSafeCactusPosition = () => {
      let x, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 140;
        attempts++;
        if (attempts > 50) break;
      } while (
        (x > -13.65 && x < 13.65 && z > -15 && z < 15) ||
        placedCacti.some((cactus) => Math.sqrt((x - cactus.x) ** 2 + (z - cactus.z) ** 2) < minDistance)
      );
      return { x, z };
    };

    for (let index = 0; index < 60; index++) {
      const pos1 = getSafeCactusPosition();
      placedCacti.push(pos1);
      cacti[index] = CactusFactory(pos1.x, 0, pos1.z);

      if (index < 59) {
        const pos2 = getSafeCactusPosition();
        placedCacti.push(pos2);
        cacti[++index] = CactusFactory(pos2.x, 0, pos2.z);
      }

      if (index < 59) {
        const pos3 = getSafeCactusPosition();
        placedCacti.push(pos3);
        cacti[++index] = CactusFactory(pos3.x, 0, pos3.z);
      }

      if (index < 59) {
        const pos4 = getSafeCactusPosition();
        placedCacti.push(pos4);
        cacti[++index] = CactusFactory(pos4.x, 0, pos4.z);
      }
    }

    const Ball = ((posX, posY, posZ) => {
      const bulletGlb = modelCreate(posX, posY, posZ, 1, 1, 1, bullet);
      bulletGlb.rotateX(pi / 2);
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * gameSpeed);

      return {
        bulletGlb,
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 0, 0);

    const createHill = (posX, posZ, width, height) => {
      const baseGeometry = new THREE.CylinderGeometry(width * 1.5, width * 2, height * 0.3, 8);
      const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x3a251a });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.set(posX, -height * 0.1, posZ);
      base.receiveShadow = true;
      scene.add(base);

      const hillGeometry = new THREE.CylinderGeometry(width * 0.8, width, height, 8);
      const hillMaterial = new THREE.MeshPhongMaterial({ color: 0x3a251a });
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(posX, height * 0.3, posZ);
      hill.receiveShadow = true;
      scene.add(hill);

      return hill;
    };

    createHill(-180, 250, 60, 25);
    createHill(150, 280, 70, 30);
    createHill(-100, 300, 50, 20);
    createHill(280, 200, 80, 35);
    createHill(-250, 220, 65, 22);

    scene.add(sunLight);
    scene.add(sunLight.target);
    scene.add(ambientLight);
    scene.add(fillLight);

    const BumperFactory = (posX, posY, posZ) => {
      let _ = {};
      let modelsGlb;
      let animations = [];
      _.action = [null, null, null, null, null, null, null, null];

      const tableGlb = modelCreate(0.04, 0.45, 0, 0.48, 0.5, 0.5, table);
      if (gameOptionsQuery.cool_mode == true) {
        const dressingGlb = modelCreate(0.3, 0, 0, 0.7, 0.3031, 0.6788, dressing);
        const couchGlb = modelCreate(0.5, -2.0795, -7.8925, 1.4, 1, 1.23, couch);
        const chairGlb = modelCreate(-0.1, 0.42, -0.1, 1.35, 0.9, 1.2, chair);
        if (posZ < 0) {
          couchGlb.rotation.x = pi / 2;
          couchGlb.rotation.z = pi;
          couchGlb.rotation.y = -pi / 2;
          chairGlb.rotation.z = pi;
        } else {
          couchGlb.rotation.x = -pi / 2;
          couchGlb.rotation.z = pi;
          couchGlb.rotation.y = pi / 2;
        }
        chairGlb.rotation.x = -pi / 2;
        dressingGlb.rotation.z = -pi / 2;
        dressingGlb.rotation.y = -pi / 2;
        modelsGlb = [tableGlb, couchGlb, chairGlb, dressingGlb];
      } else modelsGlb = [tableGlb];

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
      let speed = 0.25 * gameSpeed;
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

    const Bumpers = [BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)];

    const WallFactory = (posX, posY, posZ) => {
      const fenceGlb = modelCreate(posX, posY, posZ, 0.8, 0.5, 1, fence);
      fenceGlb.rotateY(-pi / 2);
      return {
        fenceGlb,
      };
    };
    const Walls = [
      WallFactory(0, 1.3, 9.65),
      WallFactory(6, 1.3, 9.65),
      WallFactory(-6, 1.3, 9.65),
      WallFactory(6, 1.3, -9.65),
      WallFactory(-6, 1.3, -9.65),
      WallFactory(0, 1.3, -9.65),
    ];

    (() => {
      const textureLoader = new THREE.TextureLoader();
      const groundTexture = textureLoader.load(ground_texture);
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(100, 100);
      const phongMaterial = new THREE.MeshPhongMaterial({
        map: groundTexture,
        color: 0xd4a574,
        depthWrite: true,
      });
      const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
      const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
      planeMesh.rotateX(-pi / 2);
      planeMesh.receiveShadow = true;
      scene.add(planeMesh);
    })();

    let delta = 0;
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

    let step = null;

    function start() {
      if (!step && gameStateContainer.isGamePlaying) {
        step = requestAnimationFrame(animate);
      }
    }

    function startWithAi() {
      if (!step && gameStateContainer.isGamePlaying) {
        step = requestAnimationFrame(animate);
      }
    }

    function startWithBuff() {
      if (!step && gameStateContainer.isGamePlaying) {
        step = requestAnimationFrame(animate);
      }
    }

    function startWithAiAndBuff() {
      if (!step && gameStateContainer.isGamePlaying) {
        step = requestAnimationFrame(animate);
      }
    }

    function stop() {
      if (step) {
        cancelAnimationFrame(step);
        step = null;
      }
    }
    let scoreSwitch = MAX_SCORE / 3;

    function resetBall(direction) {
      const looserBumper = direction < 0 ? 1 : 0;
      lifePointUI?.decreasePoint(looserBumper, 20 / MAX_SCORE);
      if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) {
        gameStateContainer.isGamePlaying = false;
        stop();
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
      Bumpers[looserBumper].gltfStore.action[Bumpers[looserBumper].currentAction].fadeOut(0.1);
      Bumpers[looserBumper].gltfStore.action[1].reset();
      Bumpers[looserBumper].gltfStore.action[1].fadeIn(0.1);
      Bumpers[looserBumper].gltfStore.action[1].play();
      Bumpers[looserBumper].currentAction = 1;
      if (Bumpers[looserBumper].currentAction == 1) {
        Bumpers[looserBumper].gltfStore.action[1].fadeOut(0.3);
        Bumpers[looserBumper].gltfStore.action[2].reset();
        Bumpers[looserBumper].gltfStore.action[2].fadeIn(0.3);
        Bumpers[looserBumper].gltfStore.action[2].play();
        Bumpers[looserBumper].currentAction = 2;
      }
      Bumpers[looserBumper].playerGlb.rotation.y = looserBumper == 0 ? 0 : pi;
      Ball.velocity.x = 0;
      Ball.velocity.z = BALL_INITIAL_VELOCITY * gameSpeed;
      Ball.velocity.z *= direction;
    }

    // AI FUNC:
    // -> get sphere velocity and pos
    // -> calculate potential bounce on walls based on the pos and velocity
    // -> calculate best position to collide
    // -> move to the best position

    let calculatedBumperPos = Bumpers[1].modelsGlb[Bumpers[1].modelChoosen].position;
    let bumperP1Subtick = 0;
    let bumperP2Subtick = 0;

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

        if (BallPredictedVelocity.z > 0) {
          const totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * gameSpeed);
          while (ballPredictedPos.z <= BUMPER_2_BORDER - Bumpers[1].widthHalf) {
            const totalDistanceX = Math.abs(Ball.temporalSpeed.x * BallPredictedVelocity.x * gameSpeed);

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

    let Timer = (() => {
      let timeLeft = !GAME_TIME ? 180 : GAME_TIME * 60;
      let timeoutId = setTimeout(myCallback, 1000);
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

    function myCallback() {
      if (Timer.timeLeft-- != 0 && gameStateContainer.isGamePlaying) {
        clearTimeout(Timer.timeoutId);
        timerUI?.updateRemainingTime(Timer.timeLeft);
        Timer.timeoutId = setTimeout(myCallback, 1000);
        return;
      }
      Bumpers[0].score = 0;
      Bumpers[1].score = 0;
      gameStateContainer.isGamePlaying = false;
      clearTimeout(Timer.timeoutId);
      stop();
    }
    let Coin = null;
    let Workers = null;

    if (gameOptionsQuery.cool_mode == true) {
      Coin = ((posX, posY, posZ) => {
        const CoinGlb = modelCreate(0, 0, 0, 0.45, 0.45, 0.45, coin);
        CoinGlb.position.x = posX;
        CoinGlb.position.y = posY;
        CoinGlb.position.z = posZ;
        const cylinderUpdate = new THREE.Vector3(posX, posY, posZ);
        const velocity = new THREE.Vector3(0.01 * gameSpeed, 0, 0);
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

      const blob = new Blob([
        'let remaining; let Timer = function(callback, delay) { let timerId, start = delay; remaining = delay; this.pause = function() {clearTimeout(timerId);timerId = null;' +
          'remaining -= Date.now() - start;};this.resume = function() {if (timerId) {return;} start = Date.now();timerId = setTimeout(callback, remaining);};' +
          'this.resume();}; let pauseTimer = null; onmessage = function(e) {if (e.data[2] == "pause" && pauseTimer != null) {pauseTimer.pause();}' +
          'else if (e.data[2] == "create"){pauseTimer = new Timer(function(){postMessage([e.data[1]])}, e.data[0])} else if (e.data[2] == "resume" && pauseTimer != null && remaining > 0) {pauseTimer.resume();}}',
      ]);
      const blobURL = window.URL.createObjectURL(blob);
      Workers = [
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
      ];
      Workers[0].onmessage = function (e) {
        const bumperAffected = e.data[0];
        let dirz = Bumpers[bumperAffected].playerGlb.position.z;
        if (dirz < 0) {
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
        buffUI?.hideIcon();
      };
      Workers[1].onmessage = function (e) {
        const bumperAffected = Math.abs(e.data[0] - 1);
        let dirz = Bumpers[bumperAffected].playerGlb.position.z;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = false;
        Bumpers[bumperAffected].modelChoosen = 0;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = true;
        Bumpers[bumperAffected].lenghtHalf = 2.5;
        if (Bumpers[bumperAffected].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf) {
          Bumpers[bumperAffected].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf - 0.1;
          Bumpers[bumperAffected].playerGlb.position.x =
            -10 + WALL_WIDTH_HALF + Bumpers[bumperAffected].lenghtHalf - 0.1;
        } else if (Bumpers[bumperAffected].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf) {
          Bumpers[bumperAffected].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf + 0.1;
          Bumpers[bumperAffected].playerGlb.position.x =
            10 - WALL_WIDTH_HALF - Bumpers[bumperAffected].lenghtHalf + 0.1;
        }
        if (dirz < 0) {
          Bumpers[bumperAffected].playerGlb.position.x += 1;
          Bumpers[bumperAffected].playerGlb.position.z -= 0.4;
        } else {
          Bumpers[bumperAffected].playerGlb.position.x -= 1;
          Bumpers[bumperAffected].playerGlb.position.z += 0.4; // TODO CHECK
        }
        buffUI?.hideIcon();
      };
      Workers[2].onmessage = function (e) {
        Bumpers[Math.abs(e.data[0] - 1)].controlReverse = false;
        buffUI?.hideIcon();
      };
      Workers[3].onmessage = function (e) {
        const bumperAffected = Math.abs(e.data[0] - 1);
        Bumpers[bumperAffected].speed = 0.25 * gameSpeed;
        Bumpers[bumperAffected].gltfStore.action[0].setDuration(0.18);
        Bumpers[bumperAffected].gltfStore.action[5].setDuration(0.18);
        buffUI?.hideIcon();
      };
      Workers[4].onmessage = function (e) {
        const bumperAffected = e.data[0];
        let dirz = Bumpers[bumperAffected].playerGlb.position.z;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = false;
        Bumpers[bumperAffected].modelChoosen = 0;
        Bumpers[bumperAffected].modelsGlb[Bumpers[bumperAffected].modelChoosen].visible = true;
        Bumpers[bumperAffected].widthHalf = 0.5;
        dirz < 0
          ? (Bumpers[bumperAffected].playerGlb.position.x += 5)
          : (Bumpers[bumperAffected].playerGlb.position.x -= 5);
        buffUI?.hideIcon();
      };
      Workers[5].onmessage = function (e) {
        Coin.cylinderUpdate.set(-9.25, 3, 0);
      };
    }
    const manageBuffAndDebuff = () => {
      let chooseBuff = 2;
      let dirz = Bumpers[lastBumperCollided].playerGlb.position.z;
      const reversedLastBumperCollided = Math.abs(lastBumperCollided - 1);
      switch (chooseBuff) {
        case 1:
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = false;
          Bumpers[lastBumperCollided].modelChoosen = 1;
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = true;
          Bumpers[lastBumperCollided].lenghtHalf = 5;
          if (
            Bumpers[lastBumperCollided].cubeUpdate.x <
            -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1;
            dirz < 0
              ? (Bumpers[lastBumperCollided].playerGlb.position.x =
                  -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1 + 1)
              : (Bumpers[lastBumperCollided].playerGlb.position.x =
                  -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1 - 1);
          } else if (
            Bumpers[lastBumperCollided].cubeUpdate.x >
            10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
            dirz < 0
              ? (Bumpers[lastBumperCollided].playerGlb.position.x =
                  10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1 + 1)
              : (Bumpers[lastBumperCollided].playerGlb.position.x =
                  10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1 - 1);
          }
          if (dirz < 0) {
            Bumpers[lastBumperCollided].playerGlb.position.x -= 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z += 0.7;
          } else {
            Bumpers[lastBumperCollided].playerGlb.position.x += 7.2;
            Bumpers[lastBumperCollided].playerGlb.position.z -= 0.7;
          }
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.showIcon('long');
          break;
        case 2:
          Bumpers[reversedLastBumperCollided].modelsGlb[Bumpers[reversedLastBumperCollided].modelChoosen].visible =
            false;
          Bumpers[reversedLastBumperCollided].modelChoosen = 2;
          Bumpers[reversedLastBumperCollided].modelsGlb[Bumpers[reversedLastBumperCollided].modelChoosen].visible =
            true;
          Bumpers[reversedLastBumperCollided].lenghtHalf = 1.25;
          if (dirz < 0) {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x += 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z -= 0.4;
          } else {
            Bumpers[reversedLastBumperCollided].playerGlb.position.x -= 1;
            Bumpers[reversedLastBumperCollided].playerGlb.position.z += 0.4;
          }
          Workers[1].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.showIcon('short');
          break;
        case 3:
          Bumpers[reversedLastBumperCollided].controlReverse = true;
          Workers[2].postMessage([2000, lastBumperCollided, 'create']);
          buffUI?.showIcon('switch');
          break;
        case 4:
          Bumpers[reversedLastBumperCollided].speed = 0.1 * gameSpeed;
          Bumpers[reversedLastBumperCollided].gltfStore.action[0].setDuration(0.2);
          Bumpers[reversedLastBumperCollided].gltfStore.action[5].setDuration(0.2);
          Workers[3].postMessage([5000, lastBumperCollided, 'create']);
          buffUI?.showIcon('slow');
          break;
        default:
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = false;
          Bumpers[lastBumperCollided].modelChoosen = 3;
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = true;
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          dirz < 0
            ? (Bumpers[lastBumperCollided].playerGlb.position.x -= 5)
            : (Bumpers[lastBumperCollided].playerGlb.position.x += 5);
          Workers[4].postMessage([10000, lastBumperCollided, 'create']);
          buffUI?.showIcon('large');
          break;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[5].postMessage([30000, -1, 'create']);
    };

    function checkWallCollision() {
      if (Ball.sphereUpdate.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
        Ball.sphereUpdate.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
        Ball.velocity.x *= -1;
        Ball.bulletGlb.rotation.x *= -1;
        // if (lastBumperCollided == 0) isCalculationNeeded = true;
      }
      if (Ball.sphereUpdate.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
        Ball.sphereUpdate.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
        Ball.velocity.x *= -1;
        Ball.bulletGlb.rotation.x *= -1;
        // if (lastBumperCollided == 0) isCalculationNeeded = true;
      }
    }

    function checkBumperCollision() {
      if (Ball.velocity.z <= 0 && isCollidedWithBall(Bumpers[0], ballSubtickZ, ballSubtickX)) {
        lastBumperCollided = 0;
        isMovementDone = false;
        isCalculationNeeded = true;
        calculateNewDir(Bumpers[0]);
      } else if (Ball.velocity.z > 0 && isCollidedWithBall(Bumpers[1], ballSubtickZ, ballSubtickX)) {
        lastBumperCollided = 1;
        isMovementDone = true;
        calculateNewDir(Bumpers[1]);
      }
    }

    function checkBallScored() {
      if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
        isMovementDone = true;
        Bumpers[0].score++;
        resetBall(-1);
        if (Bumpers[0].score <= MAX_SCORE) scoreUI?.updateScore(0, Bumpers[0].score);
      } else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
        isMovementDone = false;
        isCalculationNeeded = true;
        Bumpers[1].score++;
        resetBall(1);
        if (Bumpers[1].score <= MAX_SCORE) scoreUI?.updateScore(1, Bumpers[1].score);
      }
    }

    function manageBumperMovements() {
      if (
        ((keyMap['ArrowRight'] == true && Bumpers[0].controlReverse) ||
          (keyMap['ArrowLeft'] == true && !Bumpers[0].controlReverse)) &&
        !(Bumpers[0].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[0].lenghtHalf)
      ) {
        Bumpers[0].cubeUpdate.x += bumperP1Subtick;
        Bumpers[0].playerGlb.position.x += bumperP1Subtick;
      }
      if (
        ((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) ||
          (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) &&
        !(Bumpers[0].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[0].lenghtHalf)
      ) {
        Bumpers[0].cubeUpdate.x -= bumperP1Subtick;
        Bumpers[0].playerGlb.position.x -= bumperP1Subtick;
      }

      if (
        ((keyMap['KeyD'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[1].lenghtHalf)
      ) {
        Bumpers[1].cubeUpdate.x += bumperP2Subtick;
        Bumpers[1].playerGlb.position.x += bumperP2Subtick;
      }
      if (
        ((keyMap['KeyA'] == true && Bumpers[1].controlReverse) ||
          (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) &&
        !(Bumpers[1].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[1].lenghtHalf)
      ) {
        Bumpers[1].cubeUpdate.x -= bumperP2Subtick;
        Bumpers[1].playerGlb.position.x -= bumperP2Subtick;
      }
    }

    const clock = new THREE.Clock();
    function animate() {
      delta = clock.getDelta();
      step = null;
      const totalDistanceX = Math.abs(Ball.temporalSpeed.x * Ball.velocity.x * gameSpeed);
      const totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * gameSpeed);
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);
      let currentSubtick = 0;
      ballSubtickZ = SUBTICK;
      const totalSubticks = totalDistanceZ / ballSubtickZ;
      ballSubtickX = totalDistanceX / totalSubticks;
      bumperP1Subtick = Bumpers[0].speed / totalSubticks;
      bumperP2Subtick = Bumpers[1].speed / totalSubticks;
      while (currentSubtick <= totalSubticks) {
        checkWallCollision();
        checkBumperCollision();
        checkBallScored();
        manageBumperMovements();
        if (Coin != null) {
          if (isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) manageBuffAndDebuff();
          Coin.CoinGlb.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
          Coin.CoinGlb.rotation.set(0, Coin.cylinderUpdate.x, -pi / 2);
          if (
            Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf ||
            Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf
          ) {
            Coin.velocity.x *= -1;
          }
          Coin.cylinderUpdate.x += Coin.velocity.x;
        }
        Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
        Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;

        if (isGameAi == 'ai') handleAiBehavior(Ball.sphereUpdate, Ball.velocity);
        currentSubtick++;
      }
      // Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);

      if (keyMap['KeyC'] == true) {
        camera.position.set(10, 15, -20);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      }
      if (keyMap['KeyC'] == false) {
        camera.position.set(-10, 15, -20);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      }
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
      if (Bumpers[0].gltfStore?.mixer && Bumpers[1].gltfStore?.mixer) {
        Bumpers[0].gltfStore.mixer.update(delta);
        Bumpers[1].gltfStore.mixer.update(delta);
      }
      renderer.render(scene, camera);
      start();
    }
    let gameStartAndStop = [start, stop];

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(
      keyMap,
      Workers,
      gameStartAndStop,
      gameStateContainer,
      Timer,
      myCallback,
      Bumpers,
    );
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(keyMap, Bumpers);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, start, stop, Workers, scene];
  }

  disconnectedCallback() {
    if (this.onDocumentKeyDown) {
      document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    }
    if (this.onDocumentKeyUp) {
      document.removeEventListener('keyup', this.onDocumentKeyUp, true);
    }
    while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);
    this.scene = null;
    this.stop();
    let i = 0;
    if (this.Workers != null) {
      for (i = 0; i <= 5; i++) {
        this.Workers[i].terminate();
        delete this.Workers[i];
        this.Workers[i] = null;
      }
    }
    if (this.#ktx2Loader) {
      this.#ktx2Loader.dispose();
    }
  }

  async render() {
    let renderer, camera, start;
    [camera, renderer, start, this.stop, this.Workers, this.scene] = await this.game();
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
      const rendererWidth = renderer.domElement.offsetWidth;
      const rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    start();
  }
}

customElements.define('singleplayer-game', Game);
