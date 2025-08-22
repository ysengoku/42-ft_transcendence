import * as THREE from 'three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import audiourl from '/audio/score_sound.mp3?url';
import pedro from '/3d_models/pleasehelpme.glb?url';
import bullet from '/3d_models/bullet.glb?url';
import fence from '/3d_models/fence.glb?url';
import couch from '/3d_models/sofa.glb?url';
import chair from '/3d_models/chair.glb?url';
import dressing from '/3d_models/dressing.glb?url';
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
    this.render();

    this.classList.add('position-relative');
    this.timerElement = document.createElement('game-timer');
    this.timerElement?.setInitialTimeLimit(this.#state.gameOptions.time_limit * 60); // Initial time limit in second
    this.appendChild(this.timerElement);
    this.buffIconElement = document.createElement('game-buff-icon');
    this.appendChild(this.buffIconElement);
    this.lifePointElement = document.createElement('game-life-point');
    this.appendChild(this.lifePointElement);
    this.overlay = document.createElement('game-overlay');
    this.overlay.gameType = `local-${this.#state.gameType}`;
    this.appendChild(this.overlay);

    // --- Test --------------------------------------------------
    setTimeout(() => {
      let remainingTime = this.#state.gameOptions.time_limit * 60;
      setInterval(() => {
        remainingTime -= 1;
        this.timerElement?.updateRemainingTime(remainingTime);
      }, 1000);
    }, 1000);

    this.buffIconElement?.showIcon('long');
    setTimeout(() => {
      this.buffIconElement?.hideIcon();
    }, 2000);
    setTimeout(() => {
      this.buffIconElement?.showIcon('short');
    }, 4000);

    setTimeout(() => {
      setInterval(() => {
        this.lifePointElement?.decreasePoint(1);
      }, 500);
    }, 2000);

    setTimeout(() => {
      const testData = {
        winner: {
          name: "AI player",
          number: 2,
        },
        loser: {
          name: "Player 1",
          number: 1,
        },
      }
      this.overlay.show(OVERLAY_TYPE.GAMEOVER, testData);
    }, 5000);
    // -------------------------------------------------------------
  }

  setQueryParam(param) {
    this.#state.gameType = param.get('type') || 'classic';

    const storedCoolMode = param.get('cool_mode');
    this.#state.gameOptions.cool_mode = storedCoolMode === 'any' ? DEFAULT_GAME_OPTIONS.cool_mode : storedCoolMode;
    const gameSpeed = param.get('game_speed');
    this.#state.gameOptions.game_speed = gameSpeed === 'any' ? DEFAULT_GAME_OPTIONS.game_speed : gameSpeed;
    const scoreToWin = param.get('score_to_win');
    this.#state.gameOptions.score_to_win = scoreToWin === 'any' ? DEFAULT_GAME_OPTIONS.score_to_win : scoreToWin;
    const timeLimit = param.get('time_limit');
    this.#state.gameOptions.time_limit = timeLimit === 'any' ? DEFAULT_GAME_OPTIONS.time_limit : timeLimit;
    this.#state.gameOptions.ranked = false;

    log.info('Game options:', this.#state.gameType);
    log.info('Game type:', this.#state.gameType);
  }

  createOnDocumentKeyDown(keyMap, Workers, gameStartAndStop, gameStateContainer, Timer, myCallback, action) {
    return (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        return; // Do not process key events on input or textarea elements
      }
      if (e.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = e.code;
      if (keyCode != 'KeyA' && keyCode != 'KeyD' && this.#state.gameType == 'ai') {
        keyMap[keyCode] = true;
        if (!action[0][1]) {
          action[0][1] = true;
          action[0][0].play();
          action[1][0].crossFadeTo(action[0][0], 0.2);
        }
      } else if (this.#state.gameType != 'ai') keyMap[keyCode] = true;
      if (keyCode == 'Escape') {
        if (gameStateContainer.isPaused == false) {
          gameStartAndStop[1]();
          let i = 0;
          if (Workers != null) while (i <= 5) Workers[i++].postMessage([-1, -1, 'pause']);
          clearInterval(Timer.intervalId);
          gameStateContainer.isPaused = true;
        } else {
          let i = 0;
          if (Workers != null) while (i <= 5) Workers[i++].postMessage([-1, -1, 'resume']);
          Timer.intervalId = setInterval(myCallback, 1000);
          gameStateContainer.isPaused = false;
          gameStartAndStop[0]();
        }
      }
      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(keyMap) {
    return (e) => {
      if (e.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = e.code;
      keyMap[keyCode] = false;
      e.preventDefault();
    };
  }

  disconnectedCallback() {
    if (this.onDocumentKeyDown) {
      document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    }
    if (this.onDocumentKeyUp) {
      document.removeEventListener('keyup', this.onDocumentKeyUp, true);
    }
    this.stop();
    let i = 0;
    if (this.Workers != null) {
      for (i = 0; i <= 5; i++) this.Workers[i].terminate();
    }
    clearInterval(this.TimerId);
  }

  game() {
    let gamePlaying = true;
    var keyMap = [];
    const WALL_WIDTH_HALF = 0.5;
    let gameSpeed;
    switch (this.#state.gameOptions.game_speed) {
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
    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.05;
    let GAME_TIME = this.#state.gameOptions.time_limit;
    let BALL_INITIAL_VELOCITY = 0.25;
    let MAX_SCORE = this.#state.gameOptions.score_to_win;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;

    const audio = new Audio(audiourl);
    let carboardModelStates = [carboard, carboard2, carboard3];
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x855988, 1);
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loaderModel = new GLTFLoader();
    // const loaderFonts = new FontLoader();

    var camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    // let cameraX = 0;
    // let cameraY = 30;
    camera.position.set(0, 15, -20);
    // camera.position.set(0, 15, -20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let mixer;
    // const normalMaterial = new THREE.MeshNormalMaterial();

    const ligths = [
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
    ];

    let carboardModels = [null, null, null];

    for (let i = 0; i <= 2; i++) {
      const carboardGlb = (() => {
        const carboardModel = new THREE.Object3D();
        loaderModel.load(
          carboardModelStates[i],
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0;
            model.position.z = 0;
            model.position.x = 0;
            carboardModel.add(gltf.scene);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        carboardModel.scale.set(1.2, 1.2, 1.2);
        scene.add(carboardModel);
        return carboardModel;
      })();
      carboardGlb.rotation.y = Math.PI / 2;
      carboardGlb.position.z = 15;
      carboardModels[i] = carboardGlb;
    }
    carboardModels[1].visible = false;
    carboardModels[2].visible = false;
    let action = [
      [null, false],
      [null, false],
    ];
    let animations = [];

    const playerGlb = (() => {
      const pedro_model = new THREE.Object3D();
      loaderModel.load(
        pedro,
        function (gltf) {
          const model = gltf.scene;
          model.position.y = 0;
          model.position.z = -20;
          model.position.x = 0;
          mixer = new THREE.AnimationMixer(model);
          animations = gltf.animations;
          action[0][0] = mixer.clipAction(animations[0], model);
          action[1][0] = mixer.clipAction(animations[1], model);
          action[2][0] = mixer.clipAction(animations[2], model);
          action[3][0] = mixer.clipAction(animations[3], model);
          action[4][0] = mixer.clipAction(animations[4], model);
          action[5][0] = mixer.clipAction(animations[5], model);
          action[1][0].play();
          model.rotation.y = Math.PI / 2;
          pedro_model.add(gltf.scene);
        },
        undefined,
        function (error) {
          console.error(error);
        },
      );
      pedro_model.scale.set(0.5, 0.5, 0.5);
      scene.add(pedro_model);
      return pedro_model;
    })();

    // console.log('Game type:', this.#state);

    const Ball = ((posX, posY, posZ) => {
      const bulletGlb = (() => {
        const bulletModel = new THREE.Object3D();
        loaderModel.load(
          bullet,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0;
            model.position.z = 0;
            model.position.x = 0;
            bulletModel.add(gltf.scene);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        bulletModel.scale.set(1, 1, 1);
        scene.add(bulletModel);
        return bulletModel;
      })();

      // const sphereGeometry = new THREE.SphereGeometry(0.5);
      // const bulletGlb = new THREE.Mesh(sphereGeometry, normalMaterial);

      bulletGlb.position.x = posX;
      bulletGlb.position.y = posY;
      bulletGlb.position.z = posZ;
      bulletGlb.castShadow = true;
      bulletGlb.receiveShadow = true;
      scene.add(bulletGlb);

      // bulletGlb.visible = false;
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * gameSpeed);

      let hasCollidedWithBumper1 = false;
      let hasCollidedWithBumper2 = false;
      let hasCollidedWithWall = false;

      return {
        get hasCollidedWithBumper1() {
          return hasCollidedWithBumper1;
        },
        set hasCollidedWithBumper1(newHasCollidedWithBumper1) {
          hasCollidedWithBumper1 = newHasCollidedWithBumper1;
        },

        get hasCollidedWithBumper2() {
          return hasCollidedWithBumper2;
        },
        set hasCollidedWithBumper2(newHasCollidedWithBumper2) {
          hasCollidedWithBumper2 = newHasCollidedWithBumper2;
        },

        get hasCollidedWithWall() {
          return hasCollidedWithWall;
        },
        set hasCollidedWithWall(newHasCollidedWithWall) {
          hasCollidedWithWall = newHasCollidedWithWall;
        },

        bulletGlb,
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 1, 0);

    ligths[0].position.set(10, 10, 0);
    ligths[1].position.set(10, 0, 30);
    ligths[2].position.set(0, 10, -30);
    ligths[3].position.set(0, -10, 0);
    ligths[4].position.set(0, 0, 0);
    ligths[0].lookAt(0, 0, 0);
    scene.add(ligths[0]);
    for (let i = 0; i < 5; i++) {
      ligths[i].castShadow = true;
      scene.add(ligths[i]);
    }
    const normalMaterial = new THREE.MeshNormalMaterial();
    const BumperFactory = (posX, posY, posZ) => {
      const tableGlb = (() => {
        const tableModel = new THREE.Object3D();
        loaderModel.load(
          table,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0.45;
            model.position.z = 1;
            model.position.x = 0.04;
            tableModel.add(gltf.scene);
            gltf.scene.scale.set(0.48, 0.5, 0.5);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        scene.add(tableModel);
        return tableModel;
      })();
      const dressingGlb = (() => {
        const dressingModel = new THREE.Object3D();
        loaderModel.load(
          dressing,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0;
            model.position.z = 0;
            model.position.x = 0;
            dressingModel.add(gltf.scene);
            gltf.scene.scale.set(0.7, 0.3031, 0.6788);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        scene.add(dressingModel);
        return dressingModel;
      })();
      const couchGlb = (() => {
        const couchModel = new THREE.Object3D();
        loaderModel.load(
          couch,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = -2.0795;
            model.position.z = -7.8925;
            model.position.x = 1;
            couchModel.add(gltf.scene);
            gltf.scene.scale.set(1.4, 1, 1.23);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        scene.add(couchModel);
        return couchModel;
      })();
      const chairGlb = (() => {
        const chairModel = new THREE.Object3D();
        loaderModel.load(
          chair,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0.42;
            model.position.z = 0;
            model.position.x = -0.01;
            chairModel.add(gltf.scene);
            gltf.scene.scale.set(1.35, 0.9, 1.2);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        scene.add(chairModel);
        return chairModel;
      })();

      let modelsGlb = [tableGlb, couchGlb, chairGlb, dressingGlb];

      modelsGlb.forEach((element) => {
        element.castShadow = true;
        element.receiveShadow = true;
        element.position.x = posX;
        element.position.y = posY;
        element.position.z = posZ;
        element.visible = false;
      });
      tableGlb.rotation.x = -Math.PI / 2;
      chairGlb.rotation.x = -Math.PI / 2;
      dressingGlb.rotation.z = -Math.PI / 2;
      dressingGlb.rotation.y = -Math.PI / 2;

      if (posZ < 0) {
        tableGlb.rotation.z = Math.PI;
        couchGlb.rotation.x = Math.PI / 2;
        couchGlb.rotation.z = Math.PI;
        couchGlb.rotation.y = -Math.PI / 2;
        chairGlb.rotation.z = Math.PI;
      } else {
        couchGlb.rotation.x = -Math.PI / 2;
        couchGlb.rotation.z = Math.PI;
        couchGlb.rotation.y = Math.PI / 2;
      }
      tableGlb.visible = true;

      const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
      const dirZ = -Math.sign(posZ);
      let lenghtHalf = 2.5;
      let modelChoosen = 0;
      let widthHalf = 0.5;
      let controlReverse = false;
      let speed = 0.25 * gameSpeed;
      let score = 0;

      return {
        modelsGlb,
        tableGlb,
        cubeUpdate,

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

    /* eslint-disable new-cap */
    const Bumpers = [BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)];

    const WallFactory = (posX, posY, posZ) => {
      const fenceGlb = (() => {
        const fenceModel = new THREE.Object3D();
        loaderModel.load(
          fence,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0;
            model.position.z = 0;
            model.position.x = 0;
            fenceModel.add(gltf.scene);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        fenceModel.scale.set(1, 0.5, 1);
        scene.add(fenceModel);
        return fenceModel;
      })();

      fenceGlb.position.x = posX;
      fenceGlb.position.y = posY;
      fenceGlb.position.z = posZ;
      fenceGlb.rotation.y = -Math.PI / 2;
      fenceGlb.castShadow = true;
      fenceGlb.receiveShadow = true;
      scene.add(fenceGlb);

      return {
        fenceGlb,
      };
    };
    /* eslint-disable new-cap */
    const Walls = [
      WallFactory(10, 2.5, 0),
      WallFactory(10, 2.5, 7.5),
      WallFactory(-10, 2.5, 7.5),
      WallFactory(10, 2.5, -7.5),
      WallFactory(-10, 2.5, -7.5),
      WallFactory(-10, 2.5, 0),
    ];

    (() => {
      const phongMaterial = new THREE.MeshBasicMaterial({ color: 0xffcdac6d });
      const planeGeometry = new THREE.PlaneGeometry(250, 250);
      const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
      planeMesh.rotateX(-Math.PI / 2);
      planeMesh.receiveShadow = true;
      planeMesh.castShadow = true;
      scene.add(planeMesh);
    })();

    let delta = 0;
    let ballSubtickZ;
    let ballSubtickX;
    let lastBumperCollided = 0;

    function degreesToRadians(degrees) {
      var pi = Math.PI;
      return degrees * (pi / 180);
    }

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
    }

    var step = null;

    function start() {
      if (!step && gamePlaying) {
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
      if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) gamePlaying = false;
      else if (Bumpers[0].score < scoreSwitch * 2 && Bumpers[0].score >= scoreSwitch) {
        carboardModels[0].visible = false;
        carboardModels[1].visible = true;
      } else if (Bumpers[0].score < scoreSwitch * 3 && Bumpers[0].score >= scoreSwitch * 2) {
        carboardModels[1].visible = false;
        carboardModels[2].visible = true;
      }
      Ball.temporalSpeed.x = 1;
      Ball.temporalSpeed.z = 1;
      Ball.sphereUpdate.x = 0;
      Ball.sphereUpdate.z = 0;
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
    let i = 0;

    function moveAiBumper(calculatedPos) {
      keyMap['KeyA'] = false;
      keyMap['KeyD'] = false;
      if (calculatedBumperPos.x < calculatedPos.x - 0.1 && calculatedBumperPos.x < calculatedPos.x - 0.2) {
        keyMap['KeyA'] = true;
        calculatedBumperPos.x += bumperP2Subtick;
      } else if (calculatedBumperPos.x > calculatedPos.x + 0.1 && calculatedBumperPos.x > calculatedPos.x + 0.2) {
        keyMap['KeyD'] = true;
        calculatedBumperPos.x -= bumperP2Subtick;
      } else {
        keyMap['KeyA'] = false;
        keyMap['KeyD'] = false;
      }
    }

    let choosenDifficulty = 0;

    let isMovementDone = false;
    let ballPredictedPos;
    let isCalculationNeeded = true;
    let difficultyLvl = [
      [10, 1025],
      [8, 1025],
      [5, 1000],
      [2, 1000],
      [1, 1000],
    ];
    // 1 && 500 / 5 && 500 / 8 && 750

    function handleAiBehavior(BallPos, BallVelocity) {
      if (isCalculationNeeded) {
        let closeness = (BallPos.z - calculatedBumperPos.z) / 18;
        let error = difficultyLvl[choosenDifficulty][0] * closeness;
        ballPredictedPos = new THREE.Vector3(BallPos.x, BallPos.y, BallPos.z);
        let BallPredictedVelocity = new THREE.Vector3(BallVelocity.x, BallVelocity.y, BallVelocity.z);
        let totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * gameSpeed);
        if (BallPredictedVelocity.z > 0) {
          while (ballPredictedPos.z <= BUMPER_2_BORDER - Bumpers[1].widthHalf) {
            let totalDistanceX = Math.abs(Ball.temporalSpeed.x * BallPredictedVelocity.x * gameSpeed);
            if (ballPredictedPos.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
              ballPredictedPos.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
              BallPredictedVelocity.x *= -1;
            }
            if (ballPredictedPos.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
              ballPredictedPos.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
              BallPredictedVelocity.x *= -1;
            }
            ballPredictedPos.z += totalDistanceZ * BallPredictedVelocity.z;
            ballPredictedPos.x += totalDistanceX * BallPredictedVelocity.x;
          }
        }
        isCalculationNeeded = false;
        let timeooutId = setTimeout(() => {
          if (BallVelocity.z > 0) {
            isCalculationNeeded = true;
            clearTimeout(timeooutId);
          }
        }, difficultyLvl[choosenDifficulty][1]);

        ballPredictedPos.x += -error + Math.round(Math.random()) * (error - -error);
      }
      if (!isMovementDone) moveAiBumper(ballPredictedPos);
      else {
        keyMap['KeyD'] = false;
        keyMap['KeyA'] = false;
      }
    }

    let game_state = this.#state.gameOptions;
    let Timer = (() => {
      let timeLeft = !GAME_TIME ? 10 : GAME_TIME * 60;
      let intervalId = setInterval(myCallback, 1000);
      return {
        get timeLeft() {
          return timeLeft;
        },
        set timeLeft(newTimeLeft) {
          timeLeft = newTimeLeft;
        },
        get intervalId() {
          return intervalId;
        },
        set intervalId(newIntervalId) {
          intervalId = newIntervalId;
        },
      };
    })();

    function myCallback() {
      if (Timer.timeLeft-- == 0) {
        Bumpers[0].score = 0;
        Bumpers[1].score = 0;
        gamePlaying = false;
        clearInterval(Timer.intervalId);
        stop();
      }
      console.log(Timer.timeLeft);
    }
    let Coin = null;
    let Workers = null;
    if (this.#state.gameOptions.cool_mode) {
      Coin = ((posX, posY, posZ) => {
        const CoinGlb = (() => {
          const CoinModel = new THREE.Object3D();
          loaderModel.load(
            coin,
            function (gltf) {
              const model = gltf.scene;
              model.position.y = 0;
              model.position.z = 0;
              model.position.x = 0;
              CoinModel.add(gltf.scene);
            },
            undefined,
            function (error) {
              console.error(error);
            },
          );
          CoinModel.scale.set(0.45, 0.45, 0.45);
          scene.add(CoinModel);
          return CoinModel;
        })();

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

      var blob = new Blob([
        'let remaining; var Timer = function(callback, delay) { var timerId, start = delay; remaining = delay; this.pause = function() {clearTimeout(timerId);timerId = null;' +
          'remaining -= Date.now() - start;};this.resume = function() {if (timerId) {return;} start = Date.now();timerId = setTimeout(callback, remaining);};' +
          'this.resume();}; let pauseTimer = null; onmessage = function(e) {if (e.data[2] == "pause" && pauseTimer != null) {pauseTimer.pause();}' +
          'else if (e.data[2] == "create"){pauseTimer = new Timer(function(){postMessage([e.data[1]])}, e.data[0])} else if (e.data[2] == "resume" && pauseTimer != null && remaining > 0) {pauseTimer.resume();}}',
      ]);
      var blobURL = window.URL.createObjectURL(blob);
      console.log('Game wewfwefew:', game_state);
      Workers = [
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
      ];
      Workers[0].onmessage = function (e) {
        Bumpers[e.data[0]].modelsGlb[Bumpers[e.data[0]].modelChoosen].visible = false;
        Bumpers[e.data[0]].modelChoosen = 0;
        Bumpers[e.data[0]].modelsGlb[Bumpers[e.data[0]].modelChoosen].visible = true;
        Bumpers[e.data[0]].lenghtHalf = 2.5;
      };
      Workers[1].onmessage = function (e) {
        Bumpers[Math.abs(e.data[0] - 1)].modelsGlb[Bumpers[Math.abs(e.data[0] - 1)].modelChoosen].visible = false;
        Bumpers[Math.abs(e.data[0] - 1)].modelChoosen = 0;
        Bumpers[Math.abs(e.data[0] - 1)].modelsGlb[Bumpers[Math.abs(e.data[0] - 1)].modelChoosen].visible = true;
        Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf = 2.5;
        if (
          Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x <
          -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf
        ) {
          Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x =
            -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf - 0.1;
        } else if (
          Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x >
          10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf
        ) {
          Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x =
            10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf + 0.1;
        }
      };
      Workers[2].onmessage = function (e) {
        Bumpers[Math.abs(e.data[0] - 1)].controlReverse = false;
      };
      Workers[3].onmessage = function (e) {
        Bumpers[[Math.abs(e.data[0] - 1)]].speed = 0.25;
      };
      Workers[4].onmessage = function (e) {
        Bumpers[e.data[0]].modelsGlb[Bumpers[e.data[0]].modelChoosen].visible = false;
        Bumpers[e.data[0]].modelChoosen = 0;
        Bumpers[e.data[0]].modelsGlb[Bumpers[e.data[0]].modelChoosen].visible = true;
        Bumpers[e.data[0]].widthHalf = 0.5;
      };
      Workers[5].onmessage = function (e) {
        Coin.cylinderUpdate.set(-9.25, 3, 0);
      };
    }

    function manageBuffAndDebuff() {
      let chooseBuff = Math.floor(Math.random() * 5);
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
          } else if (
            Bumpers[lastBumperCollided].cubeUpdate.x >
            10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf
          ) {
            Bumpers[lastBumperCollided].cubeUpdate.x =
              10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
          }
          Workers[0].postMessage([10000, lastBumperCollided, 'create']);
          break;
        case 2:
          Bumpers[Math.abs(lastBumperCollided - 1)].modelsGlb[
            Bumpers[Math.abs(lastBumperCollided - 1)].modelChoosen
          ].visible = false;
          Bumpers[Math.abs(lastBumperCollided - 1)].modelChoosen = 2;
          Bumpers[Math.abs(lastBumperCollided - 1)].modelsGlb[
            Bumpers[Math.abs(lastBumperCollided - 1)].modelChoosen
          ].visible = true;
          Bumpers[Math.abs(lastBumperCollided - 1)].lenghtHalf = 1.25;
          Workers[1].postMessage([10000, lastBumperCollided, 'create']);
          break;
        case 3:
          Bumpers[Math.abs(lastBumperCollided - 1)].controlReverse = true;
          Workers[2].postMessage([2000, lastBumperCollided, 'create']);
          break;
        case 4:
          Bumpers[Math.abs(lastBumperCollided - 1)].speed = 0.1;
          Workers[3].postMessage([5000, lastBumperCollided, 'create']);
          break;
        default:
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = false;
          Bumpers[lastBumperCollided].modelChoosen = 3;
          Bumpers[lastBumperCollided].modelsGlb[Bumpers[lastBumperCollided].modelChoosen].visible = true;
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          Workers[4].postMessage([10000, lastBumperCollided, 'create']);
          break;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[5].postMessage([30000, -1, 'create']);
    }

    var clock = new THREE.Clock();
    let isGameAi = this.#state.gameType;
    function animate() {
      delta = clock.getDelta();
      step = null;
      let totalDistanceX = Math.abs(Ball.temporalSpeed.x * Ball.velocity.x * gameSpeed);
      let totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * gameSpeed);
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);
      let currentSubtick = 0;
      ballSubtickZ = SUBTICK;
      let totalSubticks = totalDistanceZ / ballSubtickZ;
      ballSubtickX = totalDistanceX / totalSubticks;
      bumperP1Subtick = Bumpers[0].speed / totalSubticks;
      bumperP2Subtick = Bumpers[1].speed / totalSubticks;
      while (currentSubtick <= totalSubticks) {
        if (Ball.sphereUpdate.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
          Ball.sphereUpdate.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
          Ball.velocity.x *= -1;
          if (lastBumperCollided == 0) isCalculationNeeded = true;
        }
        if (Ball.sphereUpdate.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
          Ball.sphereUpdate.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
          Ball.velocity.x *= -1;
          if (lastBumperCollided == 0) isCalculationNeeded = true;
        }
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
        if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
          isMovementDone = true;
          Bumpers[0].score++;
          resetBall(-1);
        } else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
          isMovementDone = false;
          isCalculationNeeded = true;
          Bumpers[1].score++;
          resetBall(1);
        }
        if (Coin != null && isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) {
          manageBuffAndDebuff();
        }
        if (
          ((keyMap['ArrowRight'] == true && Bumpers[0].controlReverse) ||
            (keyMap['ArrowLeft'] == true && !Bumpers[0].controlReverse)) &&
          !(Bumpers[0].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[0].lenghtHalf)
        )
          Bumpers[0].cubeUpdate.x += bumperP1Subtick;
        if (
          ((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) ||
            (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) &&
          !(Bumpers[0].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[0].lenghtHalf)
        )
          Bumpers[0].cubeUpdate.x -= bumperP1Subtick;

        if (
          ((keyMap['KeyD'] == true && Bumpers[1].controlReverse) ||
            (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) &&
          !(Bumpers[1].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[1].lenghtHalf)
        )
          Bumpers[1].cubeUpdate.x += bumperP2Subtick;
        if (
          ((keyMap['KeyA'] == true && Bumpers[1].controlReverse) ||
            (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) &&
          !(Bumpers[1].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[1].lenghtHalf)
        ) {
          Bumpers[1].cubeUpdate.x -= bumperP2Subtick;
        }
        Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
        if (Coin != null) {
          if (
            Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf ||
            Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf
          ) {
            Coin.velocity.x *= -1;
          }
          Coin.cylinderUpdate.x += Coin.velocity.x;
        }
        Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;
        if (isGameAi == 'ai') handleAiBehavior(Ball.sphereUpdate, Ball.velocity);
        currentSubtick++;
      }
      Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      if (Coin != null) {
        Coin.CoinGlb.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
        Coin.CoinGlb.rotation.set(0, Coin.cylinderUpdate.x, -Math.PI / 2);
      }
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

      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
      start();
    }
    let gameStartAndStop = [start, stop];

    let gameStateContainer = (() => {
      let isPaused = false;
      let isGamePlaying = false;
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
    this.onDocumentKeyDown = this.createOnDocumentKeyDown(
      keyMap,
      Workers,
      gameStartAndStop,
      gameStateContainer,
      Timer,
      myCallback,
      action,
    );
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(keyMap);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, start, stop, Workers, Timer.intervalId];
  }

  render() {
    this.innerHTML = ``;
    let renderer, camera, start;
    const navbarHeight = this.#navbarHeight;
    [camera, renderer, start, this.stop, this.Workers, this.TimerId] = this.game();
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight - navbarHeight);
      let rendererWidth = renderer.domElement.offsetWidth;
      let rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    start();
  }
}

customElements.define('singleplayer-game', Game);
