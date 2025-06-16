import * as THREE from 'three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import audiourl from '/audio/score_sound.mp3?url';
import pedro from '/3d_models/pedro.glb?url';
import bullet from '/3d_models/bullet.glb?url';
import fence from '/3d_models/fence.glb?url';
import chair from '/3d_models/chair.glb?url';
import coin from '/3d_models/coin.glb?url';
import carboard from '/3d_models/carboard.glb?url';
import table from '/3d_models/table.glb?url';
import fontWin from '/fonts/Texas_Tango_BOLD_PERSONAL_USE_Regular.json?url';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { router } from '@router';
import { auth } from '@auth';
import { sessionExpiredToast } from '@utils';

export class Game extends HTMLElement {
  #state = {
    gameOptions: null,
    gameType: '', // 'classic' or 'ai'
  };

  constructor() {
    super();
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    console.log('Auth status:', authStatus);
    if (!authStatus.success) {
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
    }
    this.setState();
    this.render();
  }

  setState() {
    const options = localStorage.getItem('gameOptions');
    const gameType = localStorage.getItem('gameType');
    this.#state.gameOptions = options ? JSON.parse(options) : null;
    this.#state.gameType = gameType ? gameType : 'classic';
    devLog('Game options:', this.#state.gameOptions, 'Game type:', this.#state.gameType);
  }

  // disconnectedCallback() {
  // }

  game() {
    (() => {
      let oldPushState = history.pushState;
      history.pushState = function pushState() {
        let ret = oldPushState.apply(this, arguments);
        window.dispatchEvent(new Event('pushstate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      };

      let oldReplaceState = history.replaceState;
      history.replaceState = function replaceState() {
        let ret = oldReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('replacestate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      };

      window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'));
      });
    })();
    const gameUrl = window.location.href;
    let gamePlaying = true;
    var keyMap = [];
    const WALL_WIDTH_HALF = 0.5;

    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.05;
    let GAME_TIME = 60 * 10000000;
    let BALL_INITIAL_VELOCITY = 0.25;
    let MAX_SCORE = 10;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;

    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x855988, 1);
    // document.querySelector('#content').appendChild(renderer.domElement);
    this.appendChild(renderer.domElement);

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loaderModel = new GLTFLoader();
    const loaderFonts = new FontLoader();

    var camera = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.1, 1000);
    // let cameraX = 0;
    // let cameraY = 30;
    camera.position.set(0, 15, -20);
    // camera.position.set(0, 15, -20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let mixer;
    const normalMaterial = new THREE.MeshNormalMaterial();

    const ligths = [
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
      new THREE.DirectionalLight(0xffffff),
    ];

    const carboardGlb = (() => {
      const carboardModel = new THREE.Object3D();
      loaderModel.load(
        carboard,
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

    //   const playerGlb = (() => {
    //     const pedro_model = new THREE.Object3D();
    //     loaderModel.load(
    //         pedro,
    //         function(gltf) {
    //             const model = gltf.scene;
    //             model.position.y = 0;
    //             model.position.z = -10;
    //             model.position.x = 0;
    //             model.rotation.y = 70;
    //             mixer = new THREE.AnimationMixer(model);
    //             pedro_model.add(gltf.scene);
    //         },
    //         undefined,
    //         function(error) {
    //             console.error(error);
    //         },
    //     );
    //     pedro_model.scale.set(1, 1, 1);
    //     scene.add(pedro_model);
    //     return pedro_model;
    // })();

    const chairGlb = (() => {
      const chairModel = new THREE.Object3D();
      loaderModel.load(
        chair,
        function (gltf) {
          const model = gltf.scene;
          model.position.y = 2;
          model.position.z = 0;
          model.position.x = 0;
          chairModel.add(gltf.scene);
        },
        undefined,
        function (error) {
          console.error(error);
        },
      );
      chairModel.scale.set(1, 1, 1);
      scene.add(chairModel);
      return chairModel;
    })();
    chairGlb.rotation.y = Math.PI / 2;

    const Coin = ((posX, posY, posZ) => {
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
      // CoinGlb.rotation.y = -Math.PI / 2;
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
        CoinGlb,
        cylinderUpdate,
        velocity,
      };
    })(-9.25, 1, 0);

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

      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY);

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

    let loadedFontP2 = null;
    let loadedFontP1 = null;

    loaderFonts.load(fontWin, function (font) {
      const geometry = new TextGeometry('P l a y e r   2   w i n', {
        font: font,
        size: 1,
        depth: 0.5,
        curveSegments: 12,
      });

      loadedFontP2 = new THREE.Mesh(geometry, [
        new THREE.MeshPhongMaterial({ color: 0xad4000 }),
        new THREE.MeshPhongMaterial({ color: 0x5c2301 }),
      ]);
      loadedFontP2.doubleSided = true;
      loadedFontP2.position.x = 100;
      loadedFontP2.position.y = 5;
      loadedFontP2.position.z = 0;
      loadedFontP2.scale.x = -1;

      scene.add(loadedFontP2);
    });

    loaderFonts.load(fontWin, function (font) {
      const geometry = new TextGeometry('P l a y e r   1   w i n', {
        font: font,
        size: 1,
        depth: 0.5,
        curveSegments: 12,
      });

      loadedFontP1 = new THREE.Mesh(geometry, [
        new THREE.MeshPhongMaterial({ color: 0xad4000 }),
        new THREE.MeshPhongMaterial({ color: 0x5c2301 }),
      ]);
      loadedFontP1.doubleSided = true;
      loadedFontP1.position.x = 100;
      loadedFontP1.position.y = 5;
      loadedFontP1.position.z = 0;
      loadedFontP1.scale.x = -1;

      scene.add(loadedFontP1);
    });

    ligths[0].position.set(10, 10, 0);
    ligths[0].castShadow = true;
    ligths[0].shadow.mapSize.width = rendererWidth;
    ligths[0].shadow.mapSize.height = rendererHeight;
    ligths[0].shadow.camera.left = -10;
    ligths[0].shadow.camera.right = 10;
    ligths[0].shadow.camera.top = 10;
    ligths[0].shadow.camera.bottom = -10;
    ligths[0].shadow.camera.near = 0.1;
    ligths[0].shadow.camera.far = 1000;
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

    const BumperFactory = (posX, posY, posZ) => {
      const tableGlb = (() => {
        const tableModel = new THREE.Object3D();
        loaderModel.load(
          table,
          function (gltf) {
            const model = gltf.scene;
            model.position.y = 0;
            model.position.z = 0;
            model.position.x = 0;
            mixer = new THREE.AnimationMixer(model);
            tableModel.add(gltf.scene);
            gltf.scene.scale.set(0.5, 0.5, 0.5);
          },
          undefined,
          function (error) {
            console.error(error);
          },
        );
        scene.add(tableModel);
        return tableModel;
      })();
      tableGlb.castShadow = true;
      tableGlb.receiveShadow = true;
      // tableGlb.position.z = -9;
      // tableGlb.scale.set(0.5, 0.5, 0.5);
      tableGlb.position.x = posX;
      tableGlb.position.y = posY;
      tableGlb.position.z = posZ;
      tableGlb.castShadow = true;
      tableGlb.rotation.x = -Math.PI / 2;
      tableGlb.position.z < 0 ? (tableGlb.rotation.z = Math.PI) : (tableGlb.rotation.z = 0);
      // scene.add(tableGlb);

      const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
      const dirZ = -Math.sign(posZ);
      let lenghtHalf = 2.5;
      let widthHalf = 0.5;
      let controlReverse = false;
      let speed = 0.25;
      let score = 0;

      return {
        tableGlb,
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

    let delta;
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
    let canRestart;

    function start() {
      if (!step && gamePlaying) {
        canRestart = true;
        step = requestAnimationFrame(animate);
      }
    }
    function stop() {
      if (step) {
        cancelAnimationFrame(step);
        step = null;
      }
    }
    function resetBall(direction) {
      if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE) {
        if (Bumpers[0].score == MAX_SCORE) {
          loadedFontP1.position.x = 9;
          loadedFontP2.position.x = 100;
          Bumpers[0].score = 0;
          Bumpers[1].score = 0;
        }
        if (Bumpers[1].score == MAX_SCORE) {
          loadedFontP2.position.x = 9;
          loadedFontP1.position.x = 100;
          Bumpers[0].score = 0;
          Bumpers[1].score = 0;
        }
        gamePlaying = false;
      }
      Ball.temporalSpeed.x = 1;
      Ball.temporalSpeed.z = 1;
      Ball.sphereUpdate.x = 0;
      Ball.sphereUpdate.z = 0;
      Ball.velocity.x = 0;
      Ball.velocity.z = BALL_INITIAL_VELOCITY;
      Ball.velocity.z *= direction;
    }

    // AI FUNC:
    // -> get sphere velocity and pos
    // -> calculate potential bounce on walls based on the pos and velocity
    // -> calculate best position to collide
    // -> move to the best position

    let calculatedBumperPos = Bumpers[1].tableGlb.position;
    let bumperP1Subtick = 0;
    let bumperP2Subtick = 0;
    let i = 0;

    function moveAiBumper(calculatedPos) {
      keyMap['KeyA'] = false;
      keyMap['KeyD'] = false;
      i++;
      if (
        calculatedBumperPos.x < calculatedPos.x - 0.1 &&
        calculatedBumperPos.x < calculatedPos.x - 0.2 &&
        i % 2 == 0
      ) {
        keyMap['KeyA'] = true;
        calculatedBumperPos.x += bumperP2Subtick;
      } else if (
        calculatedBumperPos.x > calculatedPos.x + 0.1 &&
        calculatedBumperPos.x > calculatedPos.x + 0.2 &&
        i % 2 == 0
      ) {
        keyMap['KeyD'] = true;
        calculatedBumperPos.x -= bumperP2Subtick;
      } else {
        keyMap['KeyA'] = false;
        keyMap['KeyD'] = false;
      }
    }

    let choosenDifficulty = 2;

    let isMovementDone = false;
    let ballPredictedPos;
    let isCalculationNeeded = true;
    let difficultyLvl = [
      [10, 750],
      [8, 750],
      [5, 500],
      [3, 500],
      [0, 500],
    ];
    // 1 && 500 / 5 && 500 / 8 && 750

    function handleAiBehavior(BallPos, BallVelocity) {
      if (isCalculationNeeded) {
        let closeness = (BallPos.z - calculatedBumperPos.z) / 18;
        let error = difficultyLvl[choosenDifficulty][0] * closeness;
        ballPredictedPos = new THREE.Vector3(BallPos.x, BallPos.y, BallPos.z);
        let BallPredictedVelocity = new THREE.Vector3(BallVelocity.x, BallVelocity.y, BallVelocity.z);
        let totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z);
        if (BallPredictedVelocity.z > 0) {
          while (ballPredictedPos.z <= BUMPER_2_BORDER - Bumpers[1].widthHalf) {
            let totalDistanceX = Math.abs(Ball.temporalSpeed.x * BallPredictedVelocity.x);
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

    var Workers = [];
    function initGame() {
      var blob = new Blob([
        'let remaining; var Timer = function(callback, delay) { var timerId, start = delay; remaining = delay; this.pause = function() {clearTimeout(timerId);timerId = null;' +
          'remaining -= Date.now() - start;};this.resume = function() {if (timerId) {return;} start = Date.now();timerId = setTimeout(callback, remaining);};' +
          'this.resume();}; let pauseTimer = null; onmessage = function(e) {if (e.data[2] == "pause" && pauseTimer != null) {pauseTimer.pause();}' +
          'else if (e.data[2] == "create"){pauseTimer = new Timer(function(){postMessage([e.data[1]])}, e.data[0])} else if (e.data[2] == "resume" && pauseTimer != null && remaining > 0) {pauseTimer.resume();}}',
      ]);
      var blobURL = window.URL.createObjectURL(blob);

      Workers = [
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
        new Worker(blobURL),
      ];
      Workers[0].onmessage = function (e) {
        Bumpers[e.data[0]].tableGlb.scale.x = 1;
        Bumpers[e.data[0]].lenghtHalf = 2.5;
      };
      Workers[1].onmessage = function (e) {
        Bumpers[Math.abs(e.data[0] - 1)].tableGlb.scale.x = 1;
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
        Bumpers[e.data[0]].tableGlb.scale.z = 1;
        Bumpers[e.data[0]].widthHalf = 0.5;
      };
      Workers[5].onmessage = function (e) {
        Coin.cylinderUpdate.set(-9.25, 3, 0);
      };
      Workers[6].onmessage = function (e) {
        if (Bumpers[0].score > Bumpers[1].score) {
          loadedFontP1.position.x = 9;
          loadedFontP2.position.x = 100;
        } else if (Bumpers[1].score > Bumpers[0].score) {
          loadedFontP2.position.x = 9;
          loadedFontP1.position.x = 100;
        }
        Bumpers[0].score = 0;
        Bumpers[1].score = 0;
        gamePlaying = false;
      };
      Workers[6].postMessage([GAME_TIME, -1, 'create']);
      start();
    }

    function manageBuffAndDebuff() {
      let chooseBuff = Math.floor(Math.random() * 5);
      switch (chooseBuff) {
        case 1:
          Bumpers[lastBumperCollided].tableGlb.scale.x = 2;
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
          Bumpers[Math.abs(lastBumperCollided - 1)].tableGlb.scale.x = 0.5;
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
          Bumpers[lastBumperCollided].tableGlb.scale.z = 3;
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          Workers[4].postMessage([10000, lastBumperCollided, 'create']);
          break;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[5].postMessage([30000, -1, 'create']);
    }

    function animate() {
      step = null;
      let totalDistanceX = Math.abs(Ball.temporalSpeed.x * Ball.velocity.x);
      let totalDistanceZ = Math.abs(Ball.temporalSpeed.z * Ball.velocity.z);
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
        if (isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) {
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
        )
          Bumpers[1].cubeUpdate.x -= bumperP2Subtick;

        Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
        if (
          Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf ||
          Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf
        ) {
          Coin.velocity.x *= -1;
        }
        Coin.cylinderUpdate.x += Coin.velocity.x;
        Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;
        handleAiBehavior(Ball.sphereUpdate, Ball.velocity);
        // if (cameraX >= -20)
        // {
        //   if (cameraY >= 15)
        //     camera.position.set(0, cameraY--, cameraX--);
        //   else
        //     camera.position.set(0, cameraY, cameraX--);
        //   camera.lookAt(new THREE.Vector3(0,0,0));
        // }
        currentSubtick++;
      }
      Ball.bulletGlb.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      Coin.CoinGlb.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
      Coin.CoinGlb.rotation.set(-Math.PI / 2 + Math.PI / 10, Coin.cylinderUpdate.x, -Math.PI / 2);
      Bumpers[0].tableGlb.position.set(Bumpers[0].cubeUpdate.x, Bumpers[0].cubeUpdate.y, Bumpers[0].cubeUpdate.z);
      Bumpers[1].tableGlb.position.set(Bumpers[1].cubeUpdate.x, Bumpers[1].cubeUpdate.y, Bumpers[1].cubeUpdate.z);

      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
      start();
    }

    let isPaused = false;

    let onDocumentKeyDown = function (event) {
      if (event.defaultPrevented || (!gamePlaying && !canRestart)) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      if (keyCode != 'KeyA' && keyCode != 'KeyD') keyMap[keyCode] = true;
      if (keyCode == 'Escape') {
        if (isPaused == false) {
          stop();
          let i = 0;
          while (i <= 6) Workers[i++].postMessage([-1, -1, 'pause']);
          isPaused = true;
        } else {
          let i = 0;
          while (i <= 6) Workers[i++].postMessage([-1, -1, 'resume']);
          isPaused = false;
          start();
        }
      }
      if (keyCode == 'KeyR') {
        stop();
        resetBall(1);
        let i = 0;
        while (i <= 6) Workers[i++].terminate();
        i = 0;
        Coin.cylinderUpdate.set(-9.25, 3, 0);
        while (i < 2) {
          Bumpers[i].widthHalf = 0.5;
          Bumpers[i].tableGlb.scale.z = 1;
          Bumpers[i].lenghtHalf = 2.5;
          Bumpers[i].tableGlb.scale.x = 1;
          Bumpers[i].controlReverse = false;
          Bumpers[i].cubeUpdate.set(0, 1, i == 1 ? 9 : -9);
          Bumpers[i].speed = 0.25;
          i++;
        }
        isPaused = false;
        loadedFontP1.position.x = 100;
        loadedFontP2.position.x = 100;
        keyMap['KeyD'] = false;
        keyMap['KeyA'] = false;
        keyMap['ArrowRight'] = false;
        keyMap['ArrowLeft'] = false;

        gamePlaying = true;
        initGame();
      }
      event.preventDefault();
    };
    let onDocumentKeyUp = function (event) {
      if (event.defaultPrevented || (!gamePlaying && !canRestart)) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      keyMap[keyCode] = false;
      event.preventDefault();
    };
    function linkChange() {
      const currentUrl = window.location.href;
      if (!(currentUrl == gameUrl)) {
        gamePlaying = false;
        canRestart = false;
        let i = 0;
        while (i <= 6) Workers[i++].terminate();
        stop(step);
      }
    }
    window.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('keyup', onDocumentKeyUp, true);
    window.addEventListener('locationchange', linkChange);

    return [camera, renderer, initGame];
  }

  render() {
    this.innerHTML = ``;

    const [camera, renderer, start] = this.game();
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      let rendererWidth = renderer.domElement.offsetWidth;
      let rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    start();
  }
}

customElements.define('singleplayer-game', Game);
