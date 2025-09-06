import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/pull_pedro.glb?url';
import audiourl from '/audio/score_sound.mp3?url';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';

/* eslint no-var: "off" */
  export class MultiplayerGame extends HTMLElement {
  #navbarHeight = 64;
  #pongSocket = null;
  #state = {
    gameId: '',
  };

  constructor() {
    super();
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

    this.#state.gameId = param.id;
    this.render();
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

  game() {
    // CONSTANTS
    const WALL_LEFT_X = 10;
    const WALL_RIGHT_X = -WALL_LEFT_X;
    const WALL_WIDTH_HALF = 0.5;
    const BUMPER_LENGTH_HALF = 2.5;
    const BUMPER_WIDTH_HALF = 0.5;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const BUMPER_SPEED_PER_SECOND = 15.0;
    const SUBTICK = 0.025;
    const BALL_INITIAL_VELOCITY = 0.25;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;

    // CONSTANTS for physics simulation in client side prediction
    const SERVER_TICK_RATE = 30;
    const SERVER_TICK_INTERVAL = 1.0 / SERVER_TICK_RATE;

    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loader = new GLTFLoader();

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
      loader.load(
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
    })(-9.25, 1, 0);

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

    const serverState = {
      bumper_1: { x: 0, z: -9, score: 0, buff_or_debuff_target: false, move_id: -1, timestamp: -1 },
      bumper_2: { x: 0, z: 9, score: 0, buff_or_debuff_target: false, move_id: -1, timestamp: -1 },
      ball: { 
        x: 0, z: 0, 
        velocity: { x: 0, z: 0 }, 
        temporal_speed: { x: 1, z: 1 }
      },
      coin: { x: -9.25, z: 1 },
      current_buff_or_debuff: 0,
      current_buff_or_debuff_remaining_time: 0.0,
      is_someone_scored: false,
      elapsed_seconds: 0,
      time_limit_reached: false
    };

    const clientState = {
      playerId: '',
      playerNumber: -1,
      enemyNumber: -1,
      bumper: null,
      enemyBumper: null,
      pendingInputs: [],
      inputSequenceNumber: 0,
      opponentPositionBuffer: [],
      movesLeft: false,
      movesRight: false,
    };

    const Buff = {
      NO_BUFF: 0,
      CONTROL_REVERSE_ENEMY: 1,
      SPEED_DECREASE_ENEMY: 2,
      SHORTEN_ENEMY: 3,
      ELONGATE_PLAYER: 4,
      ENLARGE_PLAYER: 5
    };

    this.#pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');

    const applyInputToBumper = (input, bumper, deltaTime) => {
      if (!input.action) return;
      
      let movement = 0;
      if ((input.action === 'move_left' && !bumper.controlReverse) || (input.action === 'move_right' && bumper.controlReverse)) {
        movement = bumper.speed * deltaTime;
      } else if ((input.action === 'move_right' && !bumper.controlReverse) || (input.action === 'move_left' && bumper.controlReverse)) {
        movement = -bumper.speed * deltaTime;
      }
      
      const oldX = bumper.cubeUpdate.x;
      const newX = bumper.cubeUpdate.x + movement;
      const leftLimit = WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lenghtHalf;
      const rightLimit = WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lenghtHalf;
      const finalX = Math.max(leftLimit, Math.min(rightLimit, newX));
      
      if (clientState.movesLeft || clientState.movesRight) {
        console.log(`[APPLY INPUT] action: ${input.action}, seq: ${input.sequenceNumber}, speed: ${bumper.speed}, deltaTime: ${deltaTime}, movement: ${movement}, oldX: ${oldX}, finalX: ${finalX}`);
      }
      
      bumper.cubeUpdate.x = finalX;
    };

    const sendCurrentInput = () => {
      const now = Date.now();
      
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
          timestamp: now
        };
        
        clientState.pendingInputs.push(input);
        
        console.log('Input was sent! Input:')
        console.log({
          action: action,
          move_id: sequenceNumber,
          player_id: clientState.playerId,
          timestamp: now
        })
        this.safeSend(JSON.stringify({
          action: action,
          move_id: sequenceNumber,
          player_id: clientState.playerId,
          timestamp: now
        }));
      }
    };


    function updateOpponentPositionBuffer() {
      const position = clientState.enemyNumber == 1 ? serverState.bumper_1.x : serverState.bumper_2.x;
      const timestamp = Date.now();
      clientState.opponentPositionBuffer.push({ position, timestamp });

      if (clientState.opponentPositionBuffer.length > 10) {
        clientState.opponentPositionBuffer.shift();
      }
    }

    function getInterpolatedOpponentPosition() {
      if (clientState.opponentPositionBuffer.length < 2) {
        return clientState.opponentPositionBuffer.length > 0 ? clientState.opponentPositionBuffer[0].position : null;
      }

      const renderTime = Date.now() - ENTITY_INTERPOLATION_DELAY;

      // Find the two positions to interpolate between
      let fromPosition = null;
      let toPosition = null;

      for (let i = 0; i < clientState.opponentPositionBuffer.length - 1; i++) {
        if (clientState.opponentPositionBuffer[i].timestamp <= renderTime && clientState.opponentPositionBuffer[i + 1].timestamp >= renderTime) {
          fromPosition = clientState.opponentPositionBuffer[i];
          toPosition = clientState.opponentPositionBuffer[i + 1];
          break;
        }
      }

      // If we don't have suitable positions, use the closest one
      if (!fromPosition || !toPosition) {
        const closestIndex = clientState.opponentPositionBuffer.length - 2;
        if (closestIndex >= 0) {
          fromPosition = clientState.opponentPositionBuffer[closestIndex];
          toPosition = clientState.opponentPositionBuffer[closestIndex + 1];
        } else {
          return clientState.opponentPositionBuffer[clientState.opponentPositionBuffer.length - 1].position;
        }
      }

      // Interpolate between the two positions
      const timeDiff = toPosition.timestamp - fromPosition.timestamp;
      if (timeDiff === 0) {
        return toPosition.position;
      }

      const alpha = Math.max(0, Math.min(1, (renderTime - fromPosition.timestamp) / timeDiff));
      return fromPosition.position + (toPosition.position - fromPosition.position) * alpha;
    }
    const pi = Math.PI;
    function degreesToRadians(degrees) {
      return degrees * (pi / 180);
    }

    function isCollidedWithBall(bumper, ballSubtickZ, ballSubtickX) {
      // console.log("FUCK YOU: collide")
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
      // Ball.bulletGlb.rotation.y = -degreesToRadians(Ball.temporalSpeed.x);
    }
    function resetAllBuffEffects() {
      for (let i = 0; i < Bumpers.length; i++) {
        const bumper = Bumpers[i];

        bumper.controlReverse = false;
        bumper.speed = BUMPER_SPEED_PER_SECOND;
        bumper.cubeMesh.scale.x = 1;
        bumper.lenghtHalf = BUMPER_LENGTH_HALF;
        bumper.cubeMesh.scale.z = 1;
        bumper.widthHalf = BUMPER_WIDTH_HALF;
      }
    }

    function updateServerState(data) {
      if (!data) return;
      
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

    // Update 3D object positions from server state
    function updateEntityPositionsFromServer() {
      // Update ball position
      Ball.sphereUpdate.x = serverState.ball.x;
      Ball.sphereUpdate.z = serverState.ball.z;
      
      // Update ball velocity for client-side prediction
      Ball.velocity.x = serverState.ball.velocity.x;
      Ball.velocity.z = serverState.ball.velocity.z;
      Ball.temporalSpeed.x = serverState.ball.temporal_speed.x;
      Ball.temporalSpeed.z = serverState.ball.temporal_speed.z;
      
      // Update coin position if it exists
      if (serverState.coin && Coin) {
        Coin.cylinderUpdate.x = serverState.coin.x;
        Coin.cylinderUpdate.z = serverState.coin.z;
      }
    }

    // applies position received from the server, then applies not yet processed inputs
    function reconcileWithServer() {
      if (!clientState.bumper || clientState.playerNumber <= 0)
        return;

      const myBumperData = clientState.playerNumber === 1 ? serverState.bumper_1 : serverState.bumper_2;
      const lastProcessedMoveId = myBumperData.move_id;

      if (clientState.movesLeft || clientState.movesRight) {
        console.log(`[RECONCILE] Server pos: ${myBumperData.x}, Client pos before: ${clientState.bumper.cubeUpdate.x}, Last processed: ${lastProcessedMoveId}, Pending: ${clientState.pendingInputs.length}`);
        console.log(clientState.pendingInputs)
      }

      // Set to authoritative server position
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
          console.log(`[RECONCILE] Re-applying input ${input.sequenceNumber}: ${input.action}`);
          console.log(clientState.pendingInputs)
          applyInputToBumper(input, clientState.bumper, SERVER_TICK_INTERVAL);
          reappliedCount++;
          i++;
        }
      }

      if (clientState.movesLeft || clientState.movesRight) {
      console.log(`[RECONCILE] Client pos after: ${clientState.bumper.cubeUpdate.x}, Removed: ${removedCount}, Re-applied: ${reappliedCount}`);
      }
    }
    
    function applyBuffEffects() {
      if (serverState.current_buff_or_debuff === Buff.NO_BUFF) {
        resetAllBuffEffects();
        return;
      }

      let targetPlayer = null;
      if (serverState.bumper_1.buff_or_debuff_target) {
        targetPlayer = Bumpers[0];
      } else if (serverState.bumper_2.buff_or_debuff_target) {
        targetPlayer = Bumpers[1];
      }

      if (targetPlayer) {
        switch (serverState.current_buff_or_debuff) {
          case Buff.CONTROL_REVERSE_ENEMY:
            targetPlayer.controlReverse = true;
            break;
          case Buff.SPEED_DECREASE_ENEMY:
            targetPlayer.speed = BUMPER_SPEED_PER_SECOND * 0.1;
            break;
          case Buff.SHORTEN_ENEMY:
            targetPlayer.cubeMesh.scale.x = 0.5;
            targetPlayer.lenghtHalf = 1.25;
            break;
          case Buff.ELONGATE_PLAYER:
            targetPlayer.cubeMesh.scale.x = 2;
            targetPlayer.lenghtHalf = 5;
            break;
          case Buff.ENLARGE_PLAYER:
            targetPlayer.cubeMesh.scale.z = 3;
            targetPlayer.widthHalf = 1.5;
            break;
        }
      }
    }

    this.#pongSocket.addEventListener('open', () => {
      log.info('Success! :3 ');
    });

    let data;
    this.#pongSocket.addEventListener('message', (e) => {
      data = JSON.parse(e.data);
      switch (data.action) {
        case 'state_updated':
          updateServerState(data.state);
          updateEntityPositionsFromServer();
          reconcileWithServer();
          applyBuffEffects();
          updateOpponentPositionBuffer();
          break;
        case 'player_joined':
          clientState.playerId = data.player_id;
          clientState.playerNumber = data.player_number;
          clientState.enemyNumber = data.player_number == 1 ? 2 : 1;
          clientState.bumper = Bumpers[clientState.playerNumber - 1];
          clientState.enemyBumper = Bumpers[clientState.enemyNumber - 1];
          camera.position.set(0, 15, -20);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          log.info(data);
          break;
        case 'game_started':
          log.info('Game started', data);
          this.overlay.hide();
          break;
        case 'game_paused':
          log.info('Game paused');
          this.overlay.show('pause', data);
          break;
        case 'game_unpaused':
          log.info('Game unpaused');
          this.overlay.hide();
          break;
        case 'game_cancelled':
          log.info('Game cancelled', data);
          this.overlay.show('cancel', data);
          if (data.tournament_id) {
            router.redirect(`tournament/${data.tournament_id}`);
          }
          break;
        case 'player_won':
        case 'player_resigned':
          log.info('Game_over', data);
          this.overlay.show('game_over', data);
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

    function animate(ms) {
      requestAnimationFrame(animate);
      if (!clientState.bumper) {
        return;
      }
      const delta = clock.getDelta();
      accumulator += delta;
      const deltaAnimation = Math.min(delta, 0.1);

      const playerBumper = clientState.bumper;
      while (accumulator >= SERVER_TICK_INTERVAL) {
        sendCurrentInput();
        // do client-side prediction at the same tick rate as the server
        if (!(clientState.movesLeft && clientState.movesRight))
        {
          let movement = 0;
          if ((clientState.movesLeft && !playerBumper.controlReverse) || (clientState.movesRight && playerBumper.controlReverse)) {
            movement = playerBumper.speed * SERVER_TICK_INTERVAL;
          }
          else if ((clientState.movesRight && !playerBumper.controlReverse) || (clientState.movesLeft && playerBumper.controlReverse)) {
              movement = -playerBumper.speed * SERVER_TICK_INTERVAL;
            }
            let newX = playerBumper.cubeUpdate.x + movement;
            const leftLimit = WALL_RIGHT_X + WALL_WIDTH_HALF + playerBumper.lenghtHalf;
            const rightLimit = WALL_LEFT_X - WALL_WIDTH_HALF - playerBumper.lenghtHalf;
            newX = Math.max(leftLimit, Math.min(rightLimit, newX));

            if (clientState.movesLeft || clientState.movesRight) {
              console.log(`[CLIENT PREDICTION] speed: ${playerBumper.speed}, interval: ${SERVER_TICK_INTERVAL}, movement: ${movement}, oldX: ${playerBumper.cubeUpdate.x}, newX: ${newX}`)
            }
            playerBumper.cubeUpdate.x = newX;
          }
          accumulator -= SERVER_TICK_INTERVAL;
        }

        Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
        Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);

        const interpolatedOpponentPos = getInterpolatedOpponentPosition();
        if (interpolatedOpponentPos !== null) {
          clientState.enemyBumper.cubeUpdate.x = interpolatedOpponentPos;
        }
        clientState.enemyBumper.cubeMesh.position.set(
          clientState.enemyBumper.cubeUpdate.x,
          clientState.enemyBumper.cubeUpdate.y,
          clientState.enemyBumper.cubeUpdate.z,
        );
        playerBumper.cubeMesh.position.set(
          playerBumper.cubeUpdate.x,
          playerBumper.cubeUpdate.y,
          playerBumper.cubeUpdate.z,
        );

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

  render() {
    this.classList.add('position-relative');
    this.overlay = document.createElement('game-overlay');
    this.overlay.gameType = 'multiplayer';
    this.appendChild(this.overlay);

    const navbarHeight = this.#navbarHeight;
    const [camera, renderer, animate] = this.game();
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
