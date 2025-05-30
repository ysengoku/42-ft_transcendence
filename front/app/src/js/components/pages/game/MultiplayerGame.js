import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/lilguy.glb?url';
import audiourl from '/audio/score_sound.mp3?url';
import { router } from '@router';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

export class MultiplayerGame extends HTMLElement {
  #navbarHeight = 64;

  #state = {
    gameId: '',
  };

  constructor() {
    super();

    this.overlay = null;
    this.overlayMessageWrapper = null;
    this.overlayButton1 = null;
    this.overlayButton2 = null;

    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
    this.onDocumentKeyUp = this.onDocumentKeyUp.bind(this);
    // this.windowResize = this.windowResize.bind(this);
    this.requestNewMatchmaking = this.requestNewMatchmaking.bind(this);
    this.navigateToHome = this.navigateToHome.bind(this);
  }

  async setParam(param) {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, ERROR_MESSAGES.SESSION_EXPIRED);
      router.navigate('/login');
      return;
    }
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    const navbar = document.querySelector('.navbar');
    this.#navbarHeight = navbar.offsetHeight;

    this.#state.gameId = param.id;
    this.render();
  }

  disconnectedCallback() {
    document.querySelector('#content').classList.remove('position-relative', 'overflow-hidden');
    document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    document.removeEventListener('keyup', this.onDocumentKeyUp, true);
    // window.removeEventListener('resize', this.windowResize);
  }

  onDocumentKeyDown(event) {
    if (event.defaultPrevented) {
      return; // Do noplayerglb if the event was already processed
    }
    var keyCode = event.code;
    if (keyCode == 'ArrowLeft') {
      pongSocket.send(JSON.stringify({ action: 'move_left', content: true, playerId }));
    }
    if (keyCode == 'ArrowRight') {
      pongSocket.send(JSON.stringify({ action: 'move_right', content: true, playerId }));
    }
    if (keyCode == 'KeyA') {
      pongSocket.send(JSON.stringify({ action: 'move_left', content: true, playerId }));
    }
    if (keyCode == 'KeyD') {
      pongSocket.send(JSON.stringify({ action: 'move_right', content: true, playerId }));
    }
    event.preventDefault();
  }

  onDocumentKeyUp(event) {
    if (event.defaultPrevented) {
      return; // Do noplayerglb if the event was already processed
    }
    var keyCode = event.code;
    if (keyCode == 'ArrowLeft') {
      pongSocket.send(JSON.stringify({ action: 'move_left', content: false, playerId }));
    }
    if (keyCode == 'ArrowRight') {
      pongSocket.send(JSON.stringify({ action: 'move_right', content: false, playerId }));
    }
    if (keyCode == 'KeyA') {
      pongSocket.send(JSON.stringify({ action: 'move_left', content: false, playerId }));
    }
    if (keyCode == 'KeyD') {
      pongSocket.send(JSON.stringify({ action: 'move_right', content: false, playerId }));
    }
    event.preventDefault();
  }

  game() {
    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight - this.#navbarHeight);
    renderer.shadowMap.enabled = true;
    document.querySelector('#content').appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loader = new GLTFLoader();

    const camera = new THREE.PerspectiveCamera(45, rendererWidth / rendererHeight, 0.1, 2000);
    const orbit = new OrbitControls(camera, renderer.domElement);

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
        function(gltf) {
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
        function(error) {
          console.error(error);
        },
      );
      pedroModel.scale.set(0.1, 0.1, 0.1);
      scene.add(pedroModel);
      return pedroModel;
    })();

    const Ball = ((posX, posY, posZ) => {
      const sphereGeometry = new THREE.SphereGeometry(0.5);
      const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
      sphereMesh.position.x = posX;
      sphereMesh.position.y = posY;
      sphereMesh.position.z = posZ;
      sphereMesh.castShadow = true;
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      scene.add(sphereMesh);

      let hasCollidedWithBumper1 = false;
      let hasCollidedWithBumper2 = false;
      let hasCollidedWithWall = false;

      return ({

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

        sphereMesh,
        sphereUpdate,
      });
    })(0, 1, 0);

    camera.position.set(10, 15, -22);
    orbit.update();

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

      let score = 0;
      return ({
        cubeMesh,
        cubeGeometry,

        get score() {
          return score;
        },
        set score(newScore) {
          score = newScore;
        },
      });
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

      return ({
        wallMesh,
      });
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

    const pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');

    function updateState(data) {
      if (!data) {
        return;
      }
      Ball.hasCollidedWithBumper1 = data.ball.has_collided_with_bumper_1;
      Ball.hasCollidedWithBumper2 = data.ball.has_collided_with_bumper_2;
      Ball.hasCollidedWithWall = data.ball.has_collided_with_wall;

      Ball.sphereUpdate.z = data.ball.z;
      Ball.sphereUpdate.x = data.ball.x;

      Bumpers[0].score = data.bumper_1.score;
      Bumpers[0].cubeMesh.position.x = data.bumper_1.x;

      Bumpers[1].score = data.bumper_2.score;
      Bumpers[1].cubeMesh.position.x = data.bumper_2.x;
      // lastScore = data.last_score;
    }

    pongSocket.addEventListener('open', function(_) {
      console.log('Success! :3 ');
    });

    let data;
    let playerId = '';
    pongSocket.addEventListener('message', (e) => {
      data = JSON.parse(e.data);
      switch (data.action) {
        case 'state_updated':
          updateState(data.state);
          // if (data.state.someone_scored)
          //     audio.cloneNode().play();
          break;
        case 'player_joined':
          playerId = data.player_id;
          break;
        case 'game_paused':
          devLog('Game paused');
          this.showOverlay('pause', data.state);
          break;
        case 'game_unpaused':
          devLog('Game unpaused');
          this.hideOverlay();
          break;
        case 'game_cancelled':
          devLog('Game cancelled');
          this.showOverlay('cancel');
          break;
        default:
          break;
      }
    });

    pongSocket.addEventListener('close', function(_) {
      console.log('PONG socket was nice! :3');
    });

    function animate() {
      requestAnimationFrame(animate);
      let delta = Math.min(clock.getDelta(), 0.1);

      Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
    }

    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);
    // function onDocumentKeyDown(event) {
    //   if (event.defaultPrevented) {
    //     return; // Do noplayerglb if the event was already processed
    //   }
    //   var keyCode = event.code;
    //   if (keyCode == 'ArrowLeft') {
    //     pongSocket.send(JSON.stringify({ action: 'move_left', content: true, playerId }))
    //   }
    //   if (keyCode == 'ArrowRight') {
    //     pongSocket.send(JSON.stringify({ action: 'move_right', content: true, playerId }))
    //   }
    //   if (keyCode == 'KeyA') {
    //     pongSocket.send(JSON.stringify({ action: 'move_left', content: true, playerId }))
    //   }
    //   if (keyCode == 'KeyD') {
    //     pongSocket.send(JSON.stringify({ action: 'move_right', content: true, playerId }))
    //   }
    //   event.preventDefault();
    // }
    // function onDocumentKeyUp(event) {
    //   if (event.defaultPrevented) {
    //     return; // Do noplayerglb if the event was already processed
    //   }
    //   var keyCode = event.code;
    //   if (keyCode == 'ArrowLeft') {
    //     pongSocket.send(JSON.stringify({ action: 'move_left', content: false, playerId }))
    //   }
    //   if (keyCode == 'ArrowRight') {
    //     pongSocket.send(JSON.stringify({ action: 'move_right', content: false, playerId }))
    //   }k
    //   if (keyCode == 'KeyA') {
    //     pongSocket.send(JSON.stringify({ action: 'move_left', content: false, playerId }))
    //   }
    //   if (keyCode == 'KeyD') {
    //     pongSocket.send(JSON.stringify({ action: 'move_right', content: false, playerId }))
    //   }
    //   event.preventDefault();
    // }

    return [camera, renderer, animate];
  }

  render() {
    // this.innerHTML = ``;
    document.querySelector('#content').classList.add('position-relative');
    this.innerHTML = this.overlayTemplate();
    this.overlay = this.querySelector('#overlay');
    this.overlayMessageWrapper = this.querySelector('#overlay-message-wrapper');
    this.overlayButton1 = this.querySelector('#overlay-button1');
    this.overlayButton2 = this.querySelector('#overlay-button2');

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

    // ----- TEST ---------------
    // mock data
    // const data = {
    //   state: {
    //     name: 'Alice',
    //     remaining_time: 10,
    //   }
    // }
    // setTimeout(() => {
    // this.showOverlay('pause', data.state)
    // }, 2000);
    // setTimeout(() => {
    //   this.hideOverlay()
    // }, 4000);
    // setTimeout(() => {
    // this.showOverlay('cancel');
    // }, 6000);
    // --------------------------
  }

  showOverlay(action, state = null) {
    const element = document.createElement('div');
    element.innerHTML = this.overlayContentTemplate[action];
    this.overlayMessageWrapper.appendChild(element);
    this.overlay.classList.add('overlay-dark');
    this.overlayMessageWrapper.classList.remove('d-none');

    switch (action) {
      case 'pause':
        let remainingTime = state.remaining_time;
        this.overlayMessageContent = this.querySelector('#overlay-message-content');
        this.overlayMessageTimer = this.querySelector('#overlat-message-timer');
        this.overlayMessageContent.textContent = `Player ${state.name} disconnected.`;
        this.overlayMessageTimer.textContent = remainingTime;
        // TODO: Set timer
        break;
      case 'cancel':
        this.overlayButton1 = this.querySelector('#overlay-button1');
        this.overlayButton2 = this.querySelector('#overlay-button2');
        this.overlayButton1.addEventListener('click', this.requestNewMatchmaking);
        this.overlayButton2.addEventListener('click', this.navigateToHome);
        break;
    }
  }

  hideOverlay() {
    this.overlay.classList.remove('overlay-dark');
    this.overlayMessageWrapper.classList.add('d-none');
    this.overlayMessageWrapper.innerHTML = '';

    this.overlayButton1?.removeEventListener('click', this.requestNewMatchmaking);
    this.overlayButton2?.removeEventListener('click', this.navigateToHome);
    this.overlayButton1 = null;
    this.overlayButton2 = null;
  }

  requestNewMatchmaking() {
    router.navigate('/duel', { status: 'matchmaking' });
  }

  navigateToHome() {
    router.navigate('/home');
  }

  overlayTemplate() {
    return `
    <style>
    #overlay {
      z-index: 10;
      top: 0;
      left: 0;
    }
    .overlay-dark {
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
    }
    #overlay-message-wrapper {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: rgba(var(--pm-gray-100-rgb), 0.9) !important;
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
      padding-left: 40px;
      padding-right: 40px;
    }
    #overlay-message-title {
      font-family: 'van dyke';
    }
    #overlay-button1,
    #overlay-button2 {
      color: rgba(var(--pm-gray-100-rgb), 0.9) !important;
    }
    </style>
    <div id="overlay" class="position-absolute w-100 h-100">
      <div id="overlay-message-wrapper" class="position-absolute text-center wood-board pt-5 pb-3 d-none"></div>
    </div>
    `;
  }

  overlayContentTemplate = {
    pause: `
      <div id="overlay-message-title" class="fs-2">Game paused</div>
      <div id="overlay-message-content" class="mb-5"></div>
      <div class="d-flex flex-row align-items-center my-3">
        <div>Game will end in &nbsp</div>
        <div id="overlat-message-timer" class="fs-4 m-0"></div>
        <div>&nbspseconds</div>
      </div>
      `,
    cancel: `
      <div id="overlay-message-title" class="fs-2">Game canceled</div>
      <div id="overlay-message-content" class="mb-3">Player failed to connect.</div>
      <div class="d-flex flex-column mt-5">
        <button id="overlay-button1" class="btn fw-bold">Bring me another rival</button>
        <button id="overlay-button2" class="btn fw-bold">Back to Saloon</button>
      </div>
    `,
  };
}

customElements.define('multiplayer-game', MultiplayerGame);
