import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/lilguy.glb?url';
import audiourl from '/audio/score_sound.mp3?url';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';

/* eslint no-var: "off" */
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
    this.intervalGameId = null;

    this.navigateToDuelMenu = this.navigateToDuelMenu.bind(this);
    this.navigateToHome = this.navigateToHome.bind(this);
  }

  async setParam(param) {
    const user = await auth.getUser();
    if (!user) {
      router.redirect('/login');
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
    if (this.onDocumentKeyDown) document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    if (this.onDocumentKeyUp) document.removeEventListener('keyup', this.onDocumentKeyUp, true);
  }

  createOnDocumentKeyDown(pongSocket, bumpers, playerIdContainer, keyMap, ourBumperIndexContainer) {
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
        pongSocket.send(JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        pongSocket.send(JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_left', now]);
        pongSocket.send(JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        pongSocket.send(JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }));
      }
      keyMap[keyCode] = true;
      e.preventDefault();
    };
  }

  createOnDocumentKeyUp(pongSocket, bumpers, playerIdContainer, keyMap, ourBumperIndexContainer) {
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
        pongSocket.send(JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'ArrowRight' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'ArrowLeft' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        pongSocket.send(JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'KeyA' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyD' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        pongSocket.send(JSON.stringify({ action: 'move_left', content: now, player_id: playerIdContainer.playerId }));
      }
      if (
        (keyCode == 'KeyD' && !bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
        (keyCode == 'KeyA' && bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)
      ) {
        bumpers[ourBumperIndexContainer.ourBumperIndex].inputQueue.push(['move_right', now]);
        pongSocket.send(JSON.stringify({ action: 'move_right', content: now, player_id: playerIdContainer.playerId }));
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
    // document.querySelector('#content').appendChild(renderer.domElement);
    this.appendChild(renderer.domElement);

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
      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      scene.add(sphereMesh);

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

        sphereMesh,
        sphereUpdate,
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
    const pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');
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

      Ball.hasCollidedWithBumper1 = data.ball.has_collided_with_bumper_1;
      Ball.hasCollidedWithBumper2 = data.ball.has_collided_with_bumper_2;
      Ball.hasCollidedWithWall = data.ball.has_collided_with_wall;

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

    pongSocket.addEventListener('open', function (_) {
      console.log('Success! :3 ');
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
    pongSocket.addEventListener('message', (e) => {
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
          console.log(data);
          playerIdContainer.playerId = data.player_id;
          camera.position.set(0, 15, -20);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          break;
        case 'game_started':
          devLog('Game started', data);
          this.hideOverlay();
          break;
        case 'game_paused':
          devLog('Game paused');
          console.log(data);
          this.showOverlay('pause', data);
          break;
        case 'game_unpaused':
          console.log(data);
          devLog('Game unpaused');
          this.hideOverlay();
          break;
        case 'game_cancelled':
          devLog('Game cancelled', data);
          this.showOverlay('cancel', data);
          if (data.tournament_id) {
            router.redirect(`tournament/${data.tournament_id}`);
          }
          break;
        case 'player_won':
        case 'player_resigned':
          devLog('Game_over', data);
          this.showOverlay('game_over', data);
          break;
        default:
          break;
      }
    });

    pongSocket.addEventListener('close', function (event) {
      console.log('PONG socket was nice! :3', event.code);
      switch (event.code) {
        case 3100:
        case 3002:
          showToastNotification('This game does not exist or has ended.', TOAST_TYPES.ERROR);
        case 3003:
          showToastNotification('Your are already in a game.', TOAST_TYPES.ERROR);
          setTimeout(() => {
            router.redirect('/home');
          }, 1500);
          break;
        default:
      }
    });

    function animate() {
      requestAnimationFrame(animate);
      let delta = Math.min(clock.getDelta(), 0.1);

      Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);

      if (
        ((keyMap['ArrowRight'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
          (keyMap['ArrowLeft'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
        !(
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x >
          10 - 0.5 - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
        )
      )
        Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x +=
          Bumpers[ourBumperIndexContainer.ourBumperIndex].speed;
      if (
        ((keyMap['ArrowLeft'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
          (keyMap['ArrowRight'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
        !(
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x <
          -10 + 0.5 + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
        )
      )
        Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x -=
          Bumpers[ourBumperIndexContainer.ourBumperIndex].speed;

      if (
        ((keyMap['KeyD'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
          (keyMap['KeyA'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
        !(
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x >
          10 - 0.5 - Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
        )
      )
        Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x +=
          Bumpers[ourBumperIndexContainer.ourBumperIndex].speed;
      if (
        ((keyMap['KeyA'] == true && Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse) ||
          (keyMap['KeyD'] == true && !Bumpers[ourBumperIndexContainer.ourBumperIndex].controlReverse)) &&
        !(
          Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x <
          -10 + 0.5 + Bumpers[ourBumperIndexContainer.ourBumperIndex].lenghtHalf
        )
      )
        Bumpers[ourBumperIndexContainer.ourBumperIndex].cubeMesh.position.x -=
          Bumpers[ourBumperIndexContainer.ourBumperIndex].speed;

      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
    }

    this.onDocumentKeyDown = this.createOnDocumentKeyDown(
      pongSocket,
      Bumpers,
      playerIdContainer,
      keyMap,
      ourBumperIndexContainer,
    ).bind(this);
    this.onDocumentKeyUp = this.createOnDocumentKeyUp(
      pongSocket,
      Bumpers,
      playerIdContainer,
      keyMap,
      ourBumperIndexContainer,
    ).bind(this);
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('keyup', this.onDocumentKeyUp, true);

    return [camera, renderer, animate];
  }

  render() {
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

    this.showOverlay('pending');

    // ----- TEST ---------------
    // const result = {
    //   winner: {
    //     name: 'Celiastral',
    //     number: 1,
    //     avatar: '/__mock__/img/sample-pic1.jpg',
    //     elo: 1200,
    //     number: 2,
    //   },
    //   loser: {
    //     name: 'Pedro',
    //     avatar: '/__mock__/img/sample-pic2.png',
    //     elo: 1100,
    //     number: 2,
    //   },
    //   elo_change: 16,
    //   tournament_id: null,
    // };
    // this.showOverlay('game_over', result);

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
    //   this.hideOverlay();
    // }, 4000);
    // setTimeout(() => {
    // this.showOverlay('cancel');
    // }, 6000);
    // --------------------------
  }

  clearGameInterval() {
    if (this.intervalGameId) {
      clearInterval(this.intervalGameId);
      this.intervalGameId = null;
    }
  }

  showOverlay(action, data = null) {
    this.overlayMessageWrapper.innerHTML = '';
    const element = document.createElement('div');
    element.innerHTML = this.overlayContentTemplate[action];
    this.overlayMessageWrapper.appendChild(element);
    this.overlay.classList.add('overlay-dark');
    this.overlayMessageWrapper.classList.remove('d-none');
    this.clearGameInterval();

    switch (action) {
      case 'pause':
        let remainingTime = data.remaining_time;
        this.overlayMessageContent = this.querySelector('#overlay-message-content');
        this.overlayMessageTimer = this.querySelector('#overlat-message-timer');
        this.overlayMessageContent.textContent = `Player ${data.name} disconnected.`;
        this.overlayMessageTimer.textContent = remainingTime;
        this.intervalGameId = setInterval(() => {
          remainingTime -= 1;
          this.overlayMessageTimer.textContent = remainingTime;
          if (remainingTime <= 0) {
            clearInterval(this);
            this.hideOverlay();
          }
        }, 1000);
        break;
      case 'game_over':
        let player1;
        let player2;
        const isTournament = data.tournament_id !== null;
        data.winner.number === 1
          ? ((player1 = data.winner), (player1.winner = true), (player2 = data.loser), (player2.winner = false))
          : ((player2 = data.winner), (player2.winner = true), (player1 = data.loser), (player1.winner = false));
        const player1Element = this.createPlayerResultElement(player1, data.elo_change, isTournament);
        const player2Element = this.createPlayerResultElement(player2, data.elo_change, isTournament);
        if (isTournament) {
          this.querySelector('#overlay-button1')?.classList.add('d-none');
          this.querySelector('#overlay-button2')?.classList.add('d-none');
        }
        const gameResultElement = this.querySelector('#overlay-game-result');
        gameResultElement.appendChild(player1Element);
        gameResultElement.appendChild(player2Element);
        if (isTournament) {
          setTimeout(() => {
            router.redirect(`tournament/${data.tournament_id}`);
          }, 1000);
        }
      case 'cancel':
        this.overlayButton1 = this.querySelector('#overlay-button1');
        this.overlayButton2 = this.querySelector('#overlay-button2');
        if (data.tournament_id) {
          this.overlayButton1.classList.add('d-none');
          this.overlayButton2.classList.add('d-none');
        } else {
          this.overlayButton1.addEventListener('click', this.navigateToDuelMenu);
          this.overlayButton2.addEventListener('click', this.navigateToHome);
        }
        break;
      default:
        break;
    }
  }

  hideOverlay() {
    if (this.intervalGameId) {
      clearInterval(this.intervalGameId);
    }
    this.overlay.classList.remove('overlay-dark');
    this.overlayMessageWrapper.classList.add('d-none');
    this.overlayMessageWrapper.innerHTML = '';

    this.overlayButton1?.removeEventListener('click', this.navigateToDuelMenu);
    this.overlayButton2?.removeEventListener('click', this.navigateToHome);
    this.overlayButton1 = null;
    this.overlayButton2 = null;
  }

  createPlayerResultElement(player, eloChange, isTournament) {
    const element = document.createElement('div');
    element.innerHTML = this.playerResultTemplate();
    const result = element.querySelector('.match-result');
    player.winner
      ? ((result.textContent = 'Winner'), result.classList.add('match-result-winner'))
      : ((result.textContent = 'Loser'), result.classList.add('match-result-loser'));
    const avatar = element.querySelector('img');
    avatar.src = player.avatar;
    avatar.alt = player.name;
    element.querySelector('.overlay-player-name').textContent = player.name;
    if (player.elo && !isTournament) {
      const eloWrapper = element.querySelector('.overlay-player-elo');
      eloWrapper.querySelector('.game-elo').textContent = player.elo;
      eloWrapper.querySelector('i').className = player.winner ? 'bi bi-arrow-up-right' : 'bi bi-arrow-down-right';
      eloWrapper.querySelector('.game-elo-change').textContent = player.winner ? `+${eloChange}` : `-${eloChange}`;
    }
    return element;
  }

  navigateToDuelMenu() {
    router.redirect('/duel-menu');
  }

  navigateToHome() {
    router.redirect('/home');
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
    .match-result-winner {
      color: var(--pm-green-300);
    }
    .match-result-loser {
      color: var(--pm-red-400);
    }
    </style>
    <div id="overlay" class="position-absolute w-100 h-100">
      <div id="overlay-message-wrapper" class="position-absolute text-center wood-board pt-5 pb-3 d-none"></div>
    </div>
    `;
  }

  overlayContentTemplate = {
    pending: `
      <div class="d-flex flex-column align-items-center mb-3">
        <div id="overlay-message-title" class="fs-3 px-4 pb-3">Waiting for both players to join...</div>
        <div class="pongAnimation"></div>
      </div>
      `,
    pause: `
      <div id="overlay-message-title" class="fs-2">Game paused</div>
      <div id="overlay-message-content" class="mb-5"></div>
      <div class="d-flex flex-row align-items-center my-3">
        <div>Game will end in &nbsp</div>
        <div id="overlat-message-timer" class="fs-4 m-0"></div>
        <div>&nbspseconds</div>
      </div>
      `,
    game_over: `
      <div id="overlay-message-title" class="fs-2 mb-3">Game finished</div>
      <div id="overlay-game-result" class="d-flex flex-row justify-content-center align-items-center gap-3 pb-2"></div>
      <div class="d-flex flex-column mt-4">
        <button id="overlay-button1" class="btn fw-bold">Find another duel</button>
        <button id="overlay-button2" class="btn fw-bold">Back to Saloon</button>
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

  playerResultTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mx-4 p-3">
      <div class="match-result fs-5 fw-bold pb-2"></div>
      <img class="avatar-l rounded-circle mb-2" />
      <div class="overlay-player-name fs-4"></div>
      <div class="overlay-player-elo d-flex flex-row ps-2">
        <p class="game-elo m-0 fw-bold pe-1"></p>
        <i class="bi"></i>
        <p class="game-elo-change m-0 ps-2"></p>
      </div>
    </div>
  `;
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
