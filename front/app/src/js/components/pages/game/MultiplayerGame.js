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

  createOnDocumentKeyDown(bumpers, playerIdContainer, keyMap, ourBumperIndexContainer, processKeyDown) {
    return (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        return; // Do not process key events on input or textarea elements
      }
      if (e.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = e.code;
      const now = Date.now();
      if (
        (keyCode == 'ArrowLeft' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowRight' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        if (!keyMap[keyCode]) { // Only send on initial press, not repeat
          processKeyDown('move_left');
        }
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        if (!keyMap[keyCode]) { // Only send on initial press, not repeat
          processKeyDown('move_right');
        }
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        if (!keyMap[keyCode]) { // Only send on initial press, not repeat
          processKeyDown('move_left');
        }
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        if (!keyMap[keyCode]) { // Only send on initial press, not repeat
          processKeyDown('move_right');
        }
      }
      keyMap[keyCode] = true;
      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(bumpers, playerIdContainer, keyMap, ourBumperIndexContainer, processKeyUp) {
    return (e) => {
      if (e.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = e.code;
      // Send keyup events to server to stop continuous movement
      if (
        (keyCode == 'ArrowLeft' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowRight' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        processKeyUp('move_left');
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        processKeyUp('move_right');
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        processKeyUp('move_left');
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        processKeyUp('move_right');
      }
      keyMap[keyCode] = false;
      e.preventDefault();
    };
  }

  game() {
    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    this.appendChild(renderer.domElement);
    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.025;
    const WALL_WIDTH_HALF = 0.5;
    // const GAME_TIME = gameOptionsQuery.time_limit;
    const BALL_INITIAL_VELOCITY = 0.25;
    // const MAX_SCORE = gameOptionsQuery.score_to_win;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;
    // const SUBTICK = 0.05;
    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loader = new GLTFLoader();

    var camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    // const orbit = new OrbitControls(camera, renderer.domElement);

    let mixer;
    var keyMap = [];
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
        serverState: null, // Will be populated by server updates
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
      const inputQueue = []; // Legacy - will be replaced by global pendingInputs
      let controlReverse = false;
      let lenghtHalf = 2.5;
      let widthHalf = 0.5;
      let speed = 15.0;
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
    const Walls = [WallFactory(10, 2.5, 0), WallFactory(-10, 2.5, 0)];

    (() => {
      const phongMaterial = new THREE.MeshPhongMaterial();
      const planeGeometry = new THREE.PlaneGeometry(25, 25);
      const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
      planeMesh.rotateX(-Math.PI / 2);
      planeMesh.receiveShadow = true;
      scene.add(planeMesh);
    })();

    const clock = new THREE.Clock();
    // Server reconciliation tracking
    let lastServerPositionX = null;
    let lastServerTimestamp = null;
    
    // Entity interpolation state for opponent bumper
    const opponentPositionBuffer = [];
    const ENTITY_INTERPOLATION_DELAY = 100; // 100ms behind real-time
    
    // Client-side bumper state that mirrors server exactly
    let clientBumperState = {
      moves_left: false,  // Mirrors server's bumper.moves_left
      moves_right: false, // Mirrors server's bumper.moves_right
      speed: 0.25 * (window.gameSettings?.game_speed || 1.0) // Will be set from server data
    };
    
    // Input tracking for proper reconciliation
    let pendingInputs = [];
    let inputSequenceNumber = 0;
    
    this.#pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');
    let lastBumperCollided;

    // Client-side prediction that mirrors server movement logic exactly
    
    const sendMovementInput = (action, pressed) => {
      const sequenceNumber = ++inputSequenceNumber;
      const timestamp = Date.now();
      
      // Create input for tracking
      const input = {
        sequenceNumber,
        action,
        pressed,
        timestamp
      };
      
      // IMMEDIATELY update client movement state (mirrors server's handle_input)
      if (action === 'move_left') {
        clientBumperState.moves_left = pressed;
      } else if (action === 'move_right') {
        clientBumperState.moves_right = pressed;
      }
      
      // Store input for reconciliation
      pendingInputs.push(input);
      
      // Send to server with sequence number in content field
      // Server will echo this back for reconciliation
      this.safeSend(JSON.stringify({ 
        action: action, 
        content: pressed ? sequenceNumber : -sequenceNumber, // Positive=pressed, negative=released
        player_id: playerIdContainer.playerId 
      }));
      
      return input;
    };
    
    const processKeyDown = (action) => {
      return sendMovementInput(action, true);
    };
    
    const processKeyUp = (action) => {
      return sendMovementInput(action, false);
    };
    
    // Client-side movement calculation that mirrors server's _move_bumper exactly
    const applyClientMovement = (deltaTime) => {
      const myBumper = Bumpers[ourBumperIndexContainer.ourBumperIndex];
      
      // Mirror server logic exactly: if both pressed = no movement
      if (clientBumperState.moves_left && clientBumperState.moves_right) {
        return;
      }

      let movement = 0;
      if (clientBumperState.moves_left) {
        movement = myBumper.speed * deltaTime; // Positive movement (server logic)
      } else if (clientBumperState.moves_right) {
        movement = -myBumper.speed * deltaTime; // Negative movement (server logic)  
      }

      if (movement !== 0) {
        const newX = myBumper.cubeUpdate.x + movement;
        
        // Apply bounds checking - mirror server logic exactly  
        const leftLimit = -10 + 0.5 + myBumper.lenghtHalf;  // WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lenght_half
        const rightLimit = 10 - 0.5 - myBumper.lenghtHalf;  // WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lenght_half
        const clampedX = Math.max(leftLimit, Math.min(rightLimit, newX));
        
        myBumper.cubeMesh.position.x = clampedX;
        myBumper.cubeUpdate.x = clampedX;
      }
    };
    
    // Input confirmation reconciliation - synchronize movement state with server
    const reconcileInputConfirmation = (action, sequenceNumber) => {
      const absSequenceNumber = Math.abs(sequenceNumber);
      const pressed = sequenceNumber > 0;
      
      // Remove processed inputs from pending list
      pendingInputs = pendingInputs.filter(input => input.sequenceNumber > absSequenceNumber);
      
      // Synchronize movement state with server confirmation
      // This handles cases where inputs were lost or arrived out of order
      if (action === 'move_left') {
        clientBumperState.moves_left = pressed;
      } else if (action === 'move_right') {
        clientBumperState.moves_right = pressed;
      }
    };
    
    // Position reconciliation using StateUpdated messages
    let lastReconciliationTime = 0;
    const RECONCILIATION_INTERVAL = 100; // Reconcile every 100ms
    
    const reconcileWithServer = (serverPosX) => {
      const myBumper = Bumpers[ourBumperIndexContainer.ourBumperIndex];
      const currentTime = Date.now();
      
      // Store server position for reference
      lastServerPositionX = serverPosX;
      lastServerTimestamp = currentTime;
      
      // Only reconcile occasionally to avoid fighting with client prediction
      if (currentTime - lastReconciliationTime < RECONCILIATION_INTERVAL) {
        return;
      }
      lastReconciliationTime = currentTime;
      
      const clientPosX = myBumper.cubeUpdate.x;
      const difference = Math.abs(serverPosX - clientPosX);
      
      // Only correct significant differences 
      if (difference > 0.15) { // Only correct if >0.15 units off
        // Very gentle correction - trust client prediction more
        const correctionFactor = 0.3; // 30% correction per reconciliation
        const correctedX = clientPosX + (serverPosX - clientPosX) * correctionFactor;
        
        myBumper.cubeMesh.position.x = correctedX;
        myBumper.cubeUpdate.x = correctedX;
      }
      
      // Clean up very old pending inputs
      pendingInputs = pendingInputs.filter(input => (currentTime - input.timestamp) < 1000);
    };
    
    // Calculate movement for a specific input - mirrors server logic exactly
    const calculateMovement = (input, deltaTime, bumper) => {
      let movement = 0;
      const movesLeft = (input.action === 'move_left') ? input.pressed : movementState.movesLeft;
      const movesRight = (input.action === 'move_right') ? input.pressed : movementState.movesRight;
      
      // Mirror server logic: both pressed = no movement
      if (movesLeft && movesRight) {
        return 0;
      }
      
      if (movesLeft) {
        movement = bumper.speed * deltaTime; // Positive movement (server: moves_left=true)
      } else if (movesRight) {
        movement = -bumper.speed * deltaTime; // Negative movement (server: moves_right=true)
      }
      
      return movement;
    };
    
    // Calculate current movement based on current movement state
    const calculateCurrentMovement = (deltaTime, bumper) => {
      if (movementState.movesLeft && movementState.movesRight) {
        return 0;
      }
      
      let movement = 0;
      if (movementState.movesLeft) {
        movement = bumper.speed * deltaTime;
      } else if (movementState.movesRight) {
        movement = -bumper.speed * deltaTime;
      }
      
      return movement;
    };
    
    // Apply boundary constraints - mirrors server logic
    const applyBounds = (position, bumperLengthHalf) => {
      const leftLimit = -10 + 0.5 + bumperLengthHalf;  // WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lenght_half
      const rightLimit = 10 - 0.5 - bumperLengthHalf;   // WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lenght_half
      return Math.max(leftLimit, Math.min(rightLimit, position));
    };
    
    // Entity interpolation for opponent following Gabriel Gambetta's pattern
    function updateOpponentPositionBuffer(position, timestamp) {
      opponentPositionBuffer.push({ position, timestamp });
      
      // Keep buffer size manageable (max 10 positions, ~300ms of history at 30fps)
      if (opponentPositionBuffer.length > 10) {
        opponentPositionBuffer.shift();
      }
    }
    
    function getInterpolatedOpponentPosition() {
      if (opponentPositionBuffer.length < 2) {
        return opponentPositionBuffer.length > 0 ? opponentPositionBuffer[0].position : null;
      }
      
      const renderTime = Date.now() - ENTITY_INTERPOLATION_DELAY;
      
      // Find the two positions to interpolate between
      let fromPosition = null;
      let toPosition = null;
      
      for (let i = 0; i < opponentPositionBuffer.length - 1; i++) {
        if (opponentPositionBuffer[i].timestamp <= renderTime && opponentPositionBuffer[i + 1].timestamp >= renderTime) {
          fromPosition = opponentPositionBuffer[i];
          toPosition = opponentPositionBuffer[i + 1];
          break;
        }
      }
      
      // If we don't have suitable positions, use the closest one
      if (!fromPosition || !toPosition) {
        const closestIndex = opponentPositionBuffer.length - 2;
        if (closestIndex >= 0) {
          fromPosition = opponentPositionBuffer[closestIndex];
          toPosition = opponentPositionBuffer[closestIndex + 1];
        } else {
          return opponentPositionBuffer[opponentPositionBuffer.length - 1].position;
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
    let theirBumper = 0;
    
    // Track if player is currently moving for smoother reconciliation
    let isPlayerMoving = false;
    let lastPlayerMovement = 0;
    
    function updateState(data) {
      if (!data) {
        return;
      }
      
      let theirBumperPos = theirBumper == 0 ? data.bumper_1.x : data.bumper_2.x;
      let myBumperPos = ourBumperIndexContainer.ourBumperIndex == 0 ? data.bumper_1.x : data.bumper_2.x;
      
      // Server reconciliation using StateUpdated (after movement is applied)
      // reconcileWithServer(myBumperPos);

      // Store server ball state for interpolation
      Ball.serverState = {
        x: data.ball.x,
        z: data.ball.z,
        velocity: { x: data.ball.velocity.x, z: data.ball.velocity.z },
        temporalSpeed: { x: data.ball.temporal_speed.x, z: data.ball.temporal_speed.z },
        timestamp: Date.now()
      };
      
      // Update ball velocity for client-side prediction
      Ball.velocity.x = data.ball.velocity.x;
      Ball.velocity.z = data.ball.velocity.z;
      Ball.temporalSpeed.x = data.ball.temporal_speed.x;
      Ball.temporalSpeed.z = data.ball.temporal_speed.z;
      
      // Set ball position to server position (authoritative)
      Ball.sphereUpdate.x = data.ball.x;
      Ball.sphereUpdate.z = data.ball.z;

      // Coin.cylinderUpdate.z = data.coin.z;
      // Coin.cylinderUpdate.x = data.coin.x;

      Bumpers[0].score = data.bumper_1.score;
      Bumpers[1].score = data.bumper_2.score;
      
      // NEVER update player's own bumper position from server - it's client-authoritative
      // The server echoes back our input, but we trust our own prediction completely
      
      // Proper entity interpolation for opponent bumper following Gabriel Gambetta's pattern
      updateOpponentPositionBuffer(theirBumperPos, Date.now());
      
      // Don't update opponent position here - it will be updated by the interpolation in render loop

      if (data.current_buff_or_debuff != 0) {
        let targetBumperIndex = 0;
        const isDebuff = Math.abs(data.current_buff_or_debuff) <= 3;
        if (data.last_bumper_collided == '_bumper_1') {
          if (isDebuff)
            targetBumperIndex = 1;
          else
            targetBumperIndex = 0;
        }
        else if (data.last_bumper_collided == '_bumper_2') {
          if (isDebuff)
            targetBumperIndex = 0;
          else
            targetBumperIndex = 1;
        }

        const targetPlayer = Bumpers[targetBumperIndex];
        
        switch (data.current_buff_or_debuff) {
          case 1:
            targetPlayer.controlReverse = true;
            break;
          case 2:
            targetPlayer.speed = 0.1;
            break;
          case 3:
            targetPlayer.cubeMesh.scale.x = 0.5;
            targetPlayer.lenghtHalf = 1.25;
            break;
          case 4:
            targetPlayer.cubeMesh.scale.x = 2;
            targetPlayer.lenghtHalf = 5;
            break;
          case 5:
            targetPlayer.cubeMesh.scale.z = 3;
            targetPlayer.widthHalf = 1.5;
            break;
          case -1:
            targetPlayer.controlReverse = false;
            break;
          case -2:
            targetPlayer.speed = 0.25;
            break;
          case -3:
            targetPlayer.cubeMesh.scale.x = 1;
            targetPlayer.lenghtHalf = 2.5;
            break;
          case -4:
            targetPlayer.cubeMesh.scale.x = 1;
            targetPlayer.lenghtHalf = 2.5;
            break;
          case -5:
            targetPlayer.cubeMesh.scale.z = 1;
            targetPlayer.widthHalf = 0.5;
            break;
        }
      }
    }

    this.#pongSocket.addEventListener('open', () => {
      log.info('Success! :3 ');
    });

    let data;
    // let ;
    let ourBumperIndexContainer = (() => {
      let ourBumperIndex = 0;
      return {
        get ourBumperIndex() {
          return ourBumperIndex;
        },
        set ourBumperIndex(newOurBumperIndex) {
          ourBumperIndex = newOurBumperIndex;
        },
      };
    })();


    function resetBall(direction) {
      const looserBumper = direction < 0 ? 1 : 0;
      // lifePointUI?.decreasePoint(looserBumper, 20 / MAX_SCORE);
      // if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) {
      //   gameStateContainer.isGamePlaying = false;
      //   stop();
      //   return;
      // } else if (Bumpers[0].score < scoreSwitch * 2 && Bumpers[0].score >= scoreSwitch) {
      //   carboardModels[0].visible = false;
      //   carboardModels[1].visible = true;
      // } else if (Bumpers[0].score < scoreSwitch * 3 && Bumpers[0].score >= scoreSwitch * 2) {
      //   carboardModels[1].visible = false;
      //   carboardModels[2].visible = true;
      // }
      Ball.temporalSpeed.x = 1;
      Ball.temporalSpeed.z = 1;

      lastBumperCollided = looserBumper;
      Ball.sphereUpdate.x = 0;
      Ball.sphereUpdate.z = 0;
      // Bumpers[looserBumper].gltfStore.action[Bumpers[looserBumper].currentAction][0].fadeOut(0.1);
      // Bumpers[looserBumper].gltfStore.action[1][0].reset();
      // Bumpers[looserBumper].gltfStore.action[1][0].fadeIn(0.1);
      // Bumpers[looserBumper].gltfStore.action[1][0].play();
      // Bumpers[looserBumper].currentAction = 1;
      // if (Bumpers[looserBumper].currentAction == 1) {
      //   Bumpers[looserBumper].gltfStore.action[1][0].fadeOut(0.3);
      //   Bumpers[looserBumper].gltfStore.action[2][0].reset();
      //   Bumpers[looserBumper].gltfStore.action[2][0].fadeIn(0.3);
      //   Bumpers[looserBumper].gltfStore.action[2][0].play();
      //   Bumpers[looserBumper].currentAction = 2;
      // }
      // Bumpers[looserBumper].playerGlb.rotation.y = looserBumper == 0 ? 0 : pi;
      Ball.velocity.x = 0;
      Ball.velocity.z = BALL_INITIAL_VELOCITY * 1;
      Ball.velocity.z *= direction;
    }


    let playerIdContainer = (() => {
      let actualPlayerId = '';
      return {
        get playerId() {
          return actualPlayerId;
        },
        set playerId(newPlayerId) {
          actualPlayerId = newPlayerId;
        },
      };
    })();
    this.#pongSocket.addEventListener('message', (e) => {
      data = JSON.parse(e.data);
      switch (data.action) {
        case 'state_updated':
          updateState(data.state);
          // if (data.state.someone_scored)
          //     audio.cloneNode().play();
          break;
        case 'move_left':
        case 'move_right':
          if (data.player_number == ourBumperIndexContainer.ourBumperIndex + 1) {
            // Use InputConfirmed for movement state reconciliation (not position)
            reconcileInputConfirmation(data.action, data.content);
          }
          break;
        case 'player_joined':
          ourBumperIndexContainer.ourBumperIndex = data.player_number - 1;
          theirBumper = Math.abs(ourBumperIndexContainer.ourBumperIndex - 1);
          log.info(data);
          playerIdContainer.playerId = data.player_id;
          camera.position.set(0, 15, -20);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
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
    // let fpsInterval = 60;
    let ballSubtickZ = 0;
    let fpsInterval = 1000 / 120;
    function animate(ms) {
      requestAnimationFrame(animate);
      const delta = clock.getDelta()
      const deltaAnimation = Math.min(delta, 0.1);
      // if (delta > fpsInterval) {
        // CLIENT-SIDE PREDICTION: Only extrapolate ball position slightly ahead of server state
        if (Ball.serverState && Ball.serverState.timestamp) {
          const timeSinceServerUpdate = (Date.now() - Ball.serverState.timestamp) / 1000; // Convert to seconds
          const MAX_PREDICTION_TIME = 0.1; // Only predict 100ms ahead
          
          if (timeSinceServerUpdate < MAX_PREDICTION_TIME) {
            // Extrapolate ball position based on server velocity
            const gameSpeed = 1.0; // Assuming medium game speed
            Ball.sphereUpdate.x = Ball.serverState.x + 
              (Ball.serverState.velocity.x * Ball.serverState.temporalSpeed.x * gameSpeed * timeSinceServerUpdate);
            Ball.sphereUpdate.z = Ball.serverState.z + 
              (Ball.serverState.velocity.z * Ball.serverState.temporalSpeed.z * gameSpeed * timeSinceServerUpdate);
          }
          // If too much time has passed since server update, keep last known position
        }

        
        // Apply client-side movement using the movement state that mirrors server exactly
        // applyClientMovement(deltaTimeSeconds);

        
        const myBumper = Bumpers[ourBumperIndexContainer.ourBumperIndex];
        if (
          ((keyMap['ArrowRight'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['ArrowLeft'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf)
        ) {
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x += Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
          // Bumpers[ourBumperIndexContainer.ourBumperIndex].playerGlb.position.x += Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
        }
        if (
          ((keyMap['ArrowLeft'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['ArrowRight'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf)
        ) {
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x -= Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
          // Bumpers[ourBumperIndexContainer.ourBumperIndex].playerGlb.position.x -= Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
        }

        if (
          ((keyMap['KeyD'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['KeyA'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf)
        ) {
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x += Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
          // Bumpers[ourBumperIndexContainer.ourBumperIndex].playerGlb.position.x += Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
        }
        if (
          ((keyMap['KeyA'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['KeyD'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf)
        ) {
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x -= Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
          // Bumpers[ourBumperIndexContainer.ourBumperIndex].playerGlb.position.x -= Bumpers[ourBumperIndexContainer.ourBumperIndex].speed * delta;
        }




        Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
        Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
        
        // Opponent bumper position using proper entity interpolation
        const interpolatedOpponentPos = getInterpolatedOpponentPosition();
        if (interpolatedOpponentPos !== null) {
          Bumpers[theirBumper].cubeUpdate.x = interpolatedOpponentPos;
        }
        Bumpers[theirBumper].cubeMesh.position.set(
          Bumpers[theirBumper].cubeUpdate.x,
          Bumpers[theirBumper].cubeUpdate.y,
          Bumpers[theirBumper].cubeUpdate.z,
        );
        Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.set(
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.x,
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.y,
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeUpdate.z,
        );
      // }

      if (mixer) {
        mixer.update(deltaAnimation);
      }
      renderer.render(scene, camera);
    }

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(Bumpers, playerIdContainer, keyMap, ourBumperIndexContainer, processKeyDown);
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(Bumpers, playerIdContainer, keyMap, ourBumperIndexContainer, processKeyUp);
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
    animate();

    this.overlay?.show('pending');
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
