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

  createOnDocumentKeyDown(bumpers, playerIdContainer, keyMap, ourBumperIndexContainer) {
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
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_left', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_left', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      keyMap[keyCode] = true;
      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(bumpers, playerIdContainer, keyMap, ourBumperIndexContainer) {
    return (e) => {
      if (e.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = e.code;
      const now = -Date.now();
      if (
        (keyCode == 'ArrowLeft' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowRight' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_left', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }),
        );
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        this.#pongSocket.send(
          JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }),
        );
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
    const SUBTICK = 0.05;
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
        // get hasCollidedWithBumper1() {
        //   return hasCollidedWithBumper1;
        // },
        // set hasCollidedWithBumper1(newHasCollidedWithBumper1) {
        //   hasCollidedWithBumper1 = newHasCollidedWithBumper1;
        // },

        // get hasCollidedWithBumper2() {
        //   return hasCollidedWithBumper2;
        // },
        // set hasCollidedWithBumper2(newHasCollidedWithBumper2) {
        //   hasCollidedWithBumper2 = newHasCollidedWithBumper2;
        // },

        // get hasCollidedWithWall() {
        //   return hasCollidedWithWall;
        // },
        // set hasCollidedWithWall(newHasCollidedWithWall) {
        //   hasCollidedWithWall = newHasCollidedWithWall;
        // },

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
      const inputQueue = [];
      let controlReverse = false;
      let lenghtHalf = 2.5;
      let speed = 0.25;
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
    this.#pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');
    let lastBumperCollided;

    function confirmInputs(data) {
      const { action, content } = data;
      for (let [i, input] of Bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.entries()) {
        if (input[0] === action && input[1] <= content) {
          Bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.splice(i, 1);
          return true;
        }
      }
      return false;
    }

    function updateState(data) {
      if (!data) {
        return;
      }
      let theirBumperPos = theirBumper == 0 ? data.bumper_1.x : data.bumper_2.x;
      data.last_bumper_collided == '_bumper_1' ? (lastBumperCollided = 0) : (lastBumperCollided = 1);

      // Ball.hasCollidedWithBumper1 = data.ball.has_collided_with_bumper_1;
      // Ball.hasCollidedWithBumper2 = data.ball.has_collided_with_bumper_2;
      // Ball.hasCollidedWithWall = data.ball.has_collided_with_wall;

      Ball.sphereUpdate.z = data.ball.z;
      Ball.sphereUpdate.x = data.ball.x;

      Coin.cylinderUpdate.z = data.coin.z;
      Coin.cylinderUpdate.x = data.coin.x;

      Bumpers[0].score = data.bumper_1.score;
      Bumpers[1].score = data.bumper_2.score;
      Bumpers[theirBumper].cubeMesh.position.x = theirBumperPos;

      if (data.current_buff_or_debuff != 0) {
        switch (data.current_buff_or_debuff) {
          case 1:
            Bumpers[lastBumperCollided].controlReverse = true;
            break;
          case 2:
            Bumpers[lastBumperCollided].speed = 0.1;
            break;
          case 3:
            Bumpers[lastBumperCollided].cubeMesh.scale.x = 0.5;
            Bumpers[lastBumperCollided].lenghtHalf = 1.25;
            break;
          case 4:
            Bumpers[lastBumperCollided].cubeMesh.scale.x = 2;
            Bumpers[lastBumperCollided].lenghtHalf = 5;
            break;
          case 5:
            Bumpers[lastBumperCollided].cubeMesh.scale.z = 3;
            break;
          case -1:
            Bumpers[lastBumperCollided].controlReverse = false;
            break;
          case -2:
            Bumpers[lastBumperCollided].speed = 0.25;
            break;
          case -3:
            Bumpers[lastBumperCollided].cubeMesh.scale.x = 1;
            Bumpers[lastBumperCollided].lenghtHalf = 2.5;
            break;
          case -4:
            Bumpers[lastBumperCollided].cubeMesh.scale.x = 1;
            Bumpers[lastBumperCollided].lenghtHalf = 2.5;
            break;
          case -5:
            Bumpers[lastBumperCollided].cubeMesh.scale.z = 1;
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
    let theirBumper = 0;
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
          if (data.player_number == ourBumperIndexContainer.ourBumperIndex + 1 && !confirmInputs(data)) {
            Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x = data.position_x;
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

    function animate() {
      requestAnimationFrame(animate);
      let delta = Math.min(clock.getDelta(), 0.1);
      let totalDistanceX = Math.abs(Ball.temporalSpeed.x * Ball.velocity.x * 1);
      let totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z * 1);//TODO: replace 1
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);

      let currentSubtick = 0;
      Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
      Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      const totalSubticks = totalDistanceZ / SUBTICK;
      const ballSubtickX = totalDistanceX / totalSubticks;
      const bumperSubtick = Bumpers[ourBumperIndexContainer.ourBumperIndex].speed / totalSubticks;
      // bumperP2Subtick = Bumpers[1].speed / totalSubticks;
      while (currentSubtick <= totalSubticks) {
        if (Ball.sphereUpdate.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
          Ball.sphereUpdate.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
          Ball.velocity.x *= -1;
          // Ball.bulletGlb.rotation.x *= -1;
          // if (lastBumperCollided == 0) isCalculationNeeded = true;
        }
        if (Ball.sphereUpdate.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
          Ball.sphereUpdate.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
          Ball.velocity.x *= -1;
          // Ball.bulletGlb.rotation.x *= -1;
          // if (lastBumperCollided == 0) isCalculationNeeded = true;
        }
        if (Ball.velocity.z <= 0 && isCollidedWithBall(Bumpers[ourBumperIndexContainer.ourBumperIndex], ballSubtickZ, ballSubtickX)) {
          // lastBumperCollided = ourBumperIndexContainer.ourBumperIndex;
          // isMovementDone = false;
          // isCalculationNeeded = true;
          calculateNewDir(Bumpers[ourBumperIndexContainer.ourBumperIndex]);
        }
        if (
          ((keyMap['ArrowRight'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['ArrowLeft'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(
            Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x >
            10 - 0.5 - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
          )
        )
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x +=
            bumperSubtick;
        if (
          ((keyMap['ArrowLeft'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['ArrowRight'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(
            Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x <
            -10 + 0.5 + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
          )
        )
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x -=
            bumperSubtick;

        if (
          ((keyMap['KeyD'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['KeyA'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(
            Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x >
            10 - 0.5 - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
          )
        )
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x +=
            bumperSubtick;
        if (
          ((keyMap['KeyA'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
            (keyMap['KeyD'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
          !(
            Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x <
            -10 + 0.5 + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
          )
        )
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x -=
            bumperSubtick;
        currentSubtick++;
      }

      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
    }

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(Bumpers, playerIdContainer, keyMap, ourBumperIndexContainer);
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(Bumpers, playerIdContainer, keyMap, ourBumperIndexContainer);
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
