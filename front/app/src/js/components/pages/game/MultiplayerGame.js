import * as THREE from 'three';
// import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '/node_modules/three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';
import pedro from '/3d_models/pull_pedro.glb?url';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';
import './components/index';
import { OVERLAY_TYPE, BUFF_TYPE } from './components/index';

/* eslint no-var: "off" */
export class MultiplayerGame extends HTMLElement {
  #navbarHeight = 64;
  #ktx2Loader = null;
  #pongSocket = null;
  #state = {
    userPlayerName: 'You',
    opponentPlayerName: 'Opponent',
    gameOptions: {},
  };

  constructor() {
    super();
    this.timerElement = null;
    this.buffIconElement = null;
    this.scoreElement = null;
    this.lifePointElement = null;
    this.overlay = null;
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

  disconnectedCallback() {
    if (this.onDocumentKeyDown) {
      document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    }
    if (this.onDocumentKeyUp) {
      document.removeEventListener('keyup', this.onDocumentKeyUp, true);
    }
    if (this.#pongSocket) {
      log.info('Closing pongSocket');
      this.#pongSocket.close();
      this.#pongSocket = null;
    }
    if (this.#ktx2Loader) {
      this.#ktx2Loader.dispose();
    }
  }

  safeSend(message) {
    if (this.#pongSocket && this.#pongSocket.readyState === WebSocket.OPEN) {
      this.#pongSocket.send(message);
    }
  }

  createOnDocumentKeyDown(clientState) {
    return (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        clientState.movesLeft = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        clientState.movesRight = true;
      }

      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(clientState) {
    return (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        clientState.movesLeft = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        clientState.movesRight = false;
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
    // CONSTANTS
    const WALL_LEFT_X = 10;
    const WALL_RIGHT_X = -WALL_LEFT_X;
    const WALL_WIDTH_HALF = 0.5;
    const BUMPER_LENGTH_HALF = 2.5;
    const BUMPER_WIDTH_HALF = 0.5;
    const BUMPER_SPEED_PER_SECOND = 15.0;
    const BALL_INITIAL_VELOCITY = 0.25;
    const SPEED_DECREASE_ENEMY_FACTOR = 0.75;

    // CONSTANTS for physics simulation in client side prediction
    const SERVER_TICK_RATE = 30;
    const SERVER_TICK_INTERVAL = 1.0 / SERVER_TICK_RATE;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    await this.initLoaders(renderer);
    // const loader = new GLTFLoader();

    var camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    // const orbit = new OrbitControls(camera, renderer.domElement);

    let mixer;
    const normalMaterial = new THREE.MeshNormalMaterial();

    const ligths = [
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
    ];

    const playerglb = (() => {
      const pedroModel = new THREE.Object3D();
      this.loaderModel.load(
        pedro,
        function (gltf) {
          const model = gltf.scene;
          model.position.y = 7;
          model.position.z = 0;
          model.position.x = 0;
          mixer = new THREE.AnimationMixer(model);
          const idleAction = mixer
            .clipAction(THREE.AnimationUtils.subclip(gltf.animations[0], 'idle', 0, 221))
            .setDuration(6)
            .play();
          const idleAction2 = mixer
            .clipAction(THREE.AnimationUtils.subclip(gltf.animations[1], 'idle', 0, 221))
            .setDuration(6)
            .play();
          idleAction.play();
          idleAction2.play();
          pedroModel.add(gltf.scene);
        },
        undefined,
        function (error) {
          console.error(error);
        },
      );
      pedroModel.scale.set(0.1, 0.1, 0.1);
      scene.add(pedroModel);
      return pedroModel;
    })();

    const Coin = ((posX, posY, posZ) => {
      const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1);
      const cylinderMesh = new THREE.Mesh(cylinderGeometry, normalMaterial);

      cylinderMesh.position.x = posX;
      cylinderMesh.position.y = posY;
      cylinderMesh.position.z = posZ;
      cylinderMesh.rotation.z = -Math.PI / 2;
      cylinderMesh.rotation.y = -Math.PI / 2;
      cylinderMesh.castShadow = true;
      scene.add(cylinderMesh);
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
        cylinderMesh,
        cylinderUpdate,
        velocity,
      };
    })(-100.0, 1, 0);

    const Ball = ((posX, posY, posZ) => {
      const sphereGeometry = new THREE.SphereGeometry(0.5);
      const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
      sphereMesh.position.x = posX;
      sphereMesh.position.y = posY;
      sphereMesh.position.z = posZ;
      sphereMesh.castShadow = true;
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY * 1);
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      scene.add(sphereMesh);

      // let hasCollidedWithBumper1 = false;
      // let hasCollidedWithBumper2 = false;
      // let hasCollidedWithWall = false;

      return {
        sphereMesh,
        sphereUpdate,
        velocity,
        temporalSpeed,
      };
    })(0, 1, 0);

    // camera.position.set(10, 15, -22);
    // orbit.update();

    ligths[0].position.set(0, 10, 30);
    ligths[1].position.set(10, 0, 30);
    ligths[2].position.set(0, 10, -30);
    ligths[3].position.set(0, -10, 0);
    for (let i = 0; i < 4; i++) {
      scene.add(ligths[i]);
    }

    const BumperFactory = (posX, posY, posZ) => {
      const cubeGeometry = new THREE.BoxGeometry(5, 1, 1);
      const cubeMesh = new THREE.Mesh(cubeGeometry, normalMaterial);

      cubeMesh.position.x = posX;
      cubeMesh.position.y = posY;
      cubeMesh.position.z = posZ;
      cubeMesh.castShadow = true;
      scene.add(cubeMesh);

      const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
      const dirZ = -Math.sign(posZ);
      let controlReverse = false;
      let lenghtHalf = BUMPER_LENGTH_HALF;
      let widthHalf = BUMPER_WIDTH_HALF;
      let speed = BUMPER_SPEED_PER_SECOND;
      let score = 0;

      return {
        cubeMesh,
        cubeUpdate,

        get speed() {
          return speed;
        },
        set speed(newSpeed) {
          speed = newSpeed;
        },
        get score() {
          return score;
        },
        set score(newScore) {
          score = newScore;
        },
        get inputQueue() {
          return inputQueue;
        },
        get widthHalf() {
          return widthHalf;
        },
        set widthHalf(newWidthHalf) {
          widthHalf = newWidthHalf;
        },
        get lenghtHalf() {
          return lenghtHalf;
        },
        set lenghtHalf(newLenghtHalf) {
          lenghtHalf = newLenghtHalf;
        },
        get controlReverse() {
          return controlReverse;
        },
        set controlReverse(newControlReverse) {
          controlReverse = newControlReverse;
        },
        get dirZ() {
          return dirZ;
        },
      };
    };

    /* eslint-disable-next-line new-cap */
    const Bumpers = [BumperFactory(0, 1, -9), BumperFactory(0, 1, 9)];

    const WallFactory = (posX, posY, posZ) => {
      const wallGeometry = new THREE.BoxGeometry(20, 5, 1);
      const wallMesh = new THREE.Mesh(wallGeometry, normalMaterial);
      wallMesh.position.x = posX;
      wallMesh.position.y = posY;
      wallMesh.position.z = posZ;
      wallMesh.rotation.y = -Math.PI / 2;
      wallMesh.castShadow = true;
      scene.add(wallMesh);

      return {
        wallMesh,
      };
    };
    /* eslint-disable-next-line new-cap */
    const Walls = [WallFactory(WALL_LEFT_X, BUMPER_LENGTH_HALF, 0), WallFactory(WALL_RIGHT_X, BUMPER_LENGTH_HALF, 0)];

    (() => {
      const phongMaterial = new THREE.MeshPhongMaterial();
      const planeGeometry = new THREE.PlaneGeometry(25, 25);
      const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
      planeMesh.rotateX(-Math.PI / 2);
      planeMesh.receiveShadow = true;
      scene.add(planeMesh);
    })();

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
    }

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
            targetPlayer.speed = BUMPER_SPEED_PER_SECOND * this.#state.gameOptions.game_speed * SPEED_DECREASE_ENEMY_FACTOR;
            isUserAffected
              ? this.buffIconElement?.show(BUFF_TYPE.SLOW)
              : this.buffIconElement?.show(BUFF_TYPE.SLOW, true);
            break;
          case Buff.SHORTEN_ENEMY:
            targetPlayer.cubeMesh.scale.x = 0.5;
            targetPlayer.lenghtHalf = 1.25;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.SHORT);
            }
            break;
          case Buff.ELONGATE_PLAYER:
            targetPlayer.cubeMesh.scale.x = 2;
            targetPlayer.lenghtHalf = 5;
            if (isUserAffected) {
              this.buffIconElement?.show(BUFF_TYPE.LONG);
            }
            break;
          case Buff.ENLARGE_PLAYER:
            targetPlayer.cubeMesh.scale.z = 3;
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
          const gameSpeed = {
            slow: 0.75,
            medium: 1.0,
            fast: 1.25,
          };
          this.#state.gameOptions.game_speed = gameSpeed[this.#state.gameOptions.game_speed];
          clientState.bumper.speed *= this.#state.gameOptions.game_speed;
          clientState.enemyBumper.speed *= this.#state.gameOptions.game_speed;
          console.log(clientState.bumper.speed)
          break;
        case 'game_started':
          log.info('Game started', data);
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
        Ball.sphereMesh.position.set(interpolatedBallPos.x, 1, interpolatedBallPos.z);
      } else {
        Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
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
      clientState.enemyBumper.cubeMesh.position.set(
        clientState.enemyBumper.cubeUpdate.x,
        clientState.enemyBumper.cubeUpdate.y,
        clientState.enemyBumper.cubeUpdate.z,
      );

      const interpolatedPlayerPos = getInterpolated(ENTITY_KEYS.PLAYER, renderTime);
      const playerBumper = clientState.bumper;
      const playerVisualX = interpolatedPlayerPos !== null ? interpolatedPlayerPos : playerBumper.cubeUpdate.x;
      playerBumper.cubeMesh.position.set(playerVisualX, playerBumper.cubeUpdate.y, playerBumper.cubeUpdate.z);
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
          updatePlayerBuffer(newX, timestamp);
        }
        accumulator -= SERVER_TICK_INTERVAL;
      }

      interpolateEntities(timestamp - ENTITY_INTERPOLATION_DELAY);

      if (mixer) {
        mixer.update(deltaAnimation);
      }
      renderer.render(scene, camera);
    }

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(clientState);
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(clientState);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, animate];
  }

  async render() {
    this.classList.add('position-relative');
    this.overlay = document.createElement('game-overlay');
    this.overlay.gameType = 'multiplayer';
    this.appendChild(this.overlay);

    const navbarHeight = this.#navbarHeight;
    const [camera, renderer, animate] = await this.game();
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight - navbarHeight);
      const rendererWidth = renderer.domElement.offsetWidth;
      const rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    animate(0);

    this.overlay?.show('pending');
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
