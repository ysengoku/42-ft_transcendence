import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/lilguy.glb?url';
import audiourl from '/audio/score_sound.mp3?url';
import { router } from '@router'

export class MultiplayerGame extends HTMLElement {
  #state = {
    gameId: '',
  };

  constructor() {
    super();

    this.overlay = null;
    this.overlayMessageWrapper = null;
    this.overlayButton1 = null;
    this.overlayButton2 = null;

    this.requestNewMatchmaking = this.requestNewMatchmaking.bind(this);
    this.navigateToHome = this.navigateToHome.bind(this);
  }

  setParam(param) {
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    this.#state.gameId = param.id;
    this.render();
  }

  game() {
    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    const ligths = [new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff)];

    const playerglb = (() => {
      const pedro_model = new THREE.Object3D();
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
            pedro_model.add(gltf.scene);
          },
          undefined,
          function(error) {
            console.error(error);
          },
        );
        pedro_model.scale.set(0.1, 0.1, 0.1);
        scene.add(pedro_model);
        return pedro_model;
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

        get hasCollidedWithBumper1() { return hasCollidedWithBumper1 },
        set hasCollidedWithBumper1(newHasCollidedWithBumper1) { hasCollidedWithBumper1 = newHasCollidedWithBumper1 },

        get hasCollidedWithBumper2() { return hasCollidedWithBumper2 },
        set hasCollidedWithBumper2(newHasCollidedWithBumper2) { hasCollidedWithBumper2 = newHasCollidedWithBumper2 },

        get hasCollidedWithWall() { return hasCollidedWithWall },
        set hasCollidedWithWall(newHasCollidedWithWall) { hasCollidedWithWall = newHasCollidedWithWall },

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
    for (let i = 0; i < 4; i++)
      scene.add(ligths[i]);

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

        get score() { return score; },
        set score(newScore) { score = newScore; },
      });
    }

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
    }
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
      if (!data)
        return;
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
      console.log('Success! :3 ')
    });

    let data;
    let player_id = '';
    pongSocket.addEventListener('message', function(e) {
      data = JSON.parse(e.data)
      switch (data.action) {
        case 'state_updated':
          updateState(data.state);
          // if (data.state.someone_scored)
          //     audio.cloneNode().play();
          break;
        case 'player_joined':
          player_id = data.player_id;
          break;
        case 'game_paused':
          devLog('Game paused');
          this.showOverlay('pause');
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

    document.addEventListener('keydown', onDocumentKeyDown, true);
    document.addEventListener('keyup', onDocumentKeyUp, true);
    function onDocumentKeyDown(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      if (keyCode == 'ArrowLeft')
          pongSocket.send(JSON.stringify({ action: 'move_left', content: true, player_id }))
      if (keyCode == 'ArrowRight')
          pongSocket.send(JSON.stringify({ action: 'move_right', content: true, player_id }))
      if (keyCode == 'KeyA')
          pongSocket.send(JSON.stringify({ action: 'move_left', content: true, player_id }))
      if (keyCode == 'KeyD')
          pongSocket.send(JSON.stringify({ action: 'move_right', content: true, player_id }))
      event.preventDefault();
    }
    function onDocumentKeyUp(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      if (keyCode == 'ArrowLeft')
          pongSocket.send(JSON.stringify({ action: 'move_left', content: false, player_id }))
      if (keyCode == 'ArrowRight')
          pongSocket.send(JSON.stringify({ action: 'move_right', content: false, player_id }))
      if (keyCode == 'KeyA')
          pongSocket.send(JSON.stringify({ action: 'move_left', content: false, player_id }))
      if (keyCode == 'KeyD')
          pongSocket.send(JSON.stringify({ action: 'move_right', content: false, player_id }))
      event.preventDefault();
    }

    return [camera, renderer, animate];
  }

  render() {
    // this.innerHTML = ``;
    this.innerHTML = this.overlayTemplate();
    this.overlay = this.querySelector('#overlay');
    this.overlayMessageWrapper = this.querySelector('#game-status-message-wrapper');
    this.overlayButton1 = this.querySelector('#overlay-button1');
    this.overlayButton2 = this.querySelector('#overlay-button2');

    const [camera, renderer, animate] = this.game();
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      let rendererWidth = renderer.domElement.offsetWidth;
      let rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    animate();

    // ----- TEST ---------------
    // setTimeout(() => {
    // this.showOverlay('pause')
    // }, 2000);
    // setTimeout(() => {
    //   this.hideOverlay()
    // }, 4000);
    // setTimeout(() => {
    // this.showOverlay('cancel');
    // }, 6000);
    // --------------------------
  }

  showOverlay(status) {
    const element = document.createElement('div');
    element.innerHTML = this.overlayContentTemplate[status];
    this.overlayMessageWrapper.appendChild(element);
    this.overlay.classList.remove('d-none');

    switch (status) {
      case 'pause':
        // TODO:
        // Add the disconnected user's nickname & avatar
        // Set timer
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
    this.overlay.classList.add('d-none');
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
    router.navigate('/home')
  }

  overlayTemplate() {
    return `
    <style>
    #overlay {
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
      z-index: 10;
      top: 0;
      left: 0;
    }
    #game-status-message-wrapper {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: rgba(var(--pm-gray-100-rgb), 0.9);
      background-color: rgba(var(--pm-gray-700-rgb), 0.8);
      padding-left: 40px;
      padding-right: 40px;
    }
    #game-status-message {
      font-family: 'van dyke';
    }
    </style>
    <div id="overlay" class="position-absolute w-100 h-100 d-none">
      <div id="game-status-message-wrapper" class="position-absolute text-center wood-board pt-5 pb-3"></div>
    </div>
    `;
  }

  overlayContentTemplate = {
    pause: `
      <div id="game-status-message" class="fs-2">Game paused</div>
      <div id="game-status-submessage" class="py-2">Show more message here</div>
      `,
    cancel:`
      <div id="game-status-message" class="fs-2">Game canceled</div>
      <div id="game-status-submessage" class="mb-3">Player failed to connect.</div>
      <div class="d-flex flex-column mt-5">
        <button id="overlay-button1" class="btn fw-bold">Bring me another rival</button>
        <button id="overlay-button2" class="btn fw-bold">Back to Saloon</button>
      </div>
    `,
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
