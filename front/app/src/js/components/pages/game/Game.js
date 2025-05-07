import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import audiourl from '/audio/score_sound.mp3?url';
import pedro from '/3d_models/lilguy.glb?url';
import fontWin from '/fonts/Texas_Tango_BOLD_PERSONAL_USE_Regular.json?url';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js' 


export class Game extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

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
    let gamePlaying = true;
    var keyMap = [];
    const WALL_WIDTH_HALF = 0.5;

    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.05;
    let   BALL_INITIAL_VELOCITY = 0.25;
    let   MAX_SCORE = 1;
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;


    const audio = new Audio(audiourl);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.querySelector('#content').appendChild(renderer.domElement);
    // const canvas = document.getElementById('content');
    // // canvas.focus();

    const rendererWidth = renderer.domElement.offsetWidth;
    const rendererHeight = renderer.domElement.offsetHeight;

    const scene = new THREE.Scene();
    const loaderModel = new GLTFLoader();
    const loaderFonts = new FontLoader();

    const camera = new THREE.PerspectiveCamera(45, rendererWidth / rendererHeight, 0.1, 2000);
    const orbit = new OrbitControls(camera, renderer.domElement);

    let mixer;
    const normalMaterial = new THREE.MeshNormalMaterial();
    
    const ligths = [new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff)];
    
    const playerglb = (() => {
      const pedro_model = new THREE.Object3D();
      loaderModel.load(
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

  const Coin = ((posX, posY, posZ) => {
    const cylinderGeometry = new THREE.CylinderGeometry(0.5,0.5,0.1);
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, normalMaterial);
  
    cylinderMesh.position.x = posX;
    cylinderMesh.position.y = posY;
    cylinderMesh.position.z = posZ;
    cylinderMesh.rotation.z = -Math.PI / 2;
    cylinderMesh.rotation.y = -Math.PI / 2;
    cylinderMesh.castShadow = true;
    scene.add(cylinderMesh);
    const cylinderUpdate = new THREE.Vector3(posX, posY, posZ);
    const velocity = new THREE.Vector3(0.001, 0, 0);
    let lenghtHalf = 0.25;

    return ({

        get lenghtHalf() { return lenghtHalf; },
        set lenghtHalf(newLenghtHalf) { lenghtHalf = newLenghtHalf; },
        cylinderMesh,
        cylinderUpdate,
        velocity,
    });
    })(-9.25, 3, 0);

	const Ball = ((posX, posY, posZ) => {
      const sphereGeometry = new THREE.SphereGeometry(0.5);
      const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
    
      sphereMesh.position.x = posX;
      sphereMesh.position.y = posY;
      sphereMesh.position.z = posZ;
      sphereMesh.castShadow = true;
      scene.add(sphereMesh);

      const sphereUpdate = new THREE.Vector3(posX, posY, posZ);
      const temporalSpeed = new THREE.Vector3(1, 0, 1);
      const velocity = new THREE.Vector3(0, 0, BALL_INITIAL_VELOCITY);

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
          velocity,
          temporalSpeed,
      });
  })(0, 1, 0);

  let loadedFontP2 = null;
  let loadedFontP1 = null;

  loaderFonts.load(fontWin, function (font) {
    const geometry = new TextGeometry("P l a y e r   2   w i n", {
      font: font,
      size: 1,
      depth: 0.5,
      curveSegments: 12,
    });
  
    loadedFontP2 = new THREE.Mesh(geometry, [
      new THREE.MeshPhongMaterial({ color: 0xad4000 }),
      new THREE.MeshPhongMaterial({ color: 0x5c2301 })
    ]);
    loadedFontP2.doubleSided = true;
    loadedFontP2.position.x = 100;
    loadedFontP2.position.y = 5;
    loadedFontP2.position.z = 0;
    loadedFontP2.scale.x = -1;
  
    scene.add(loadedFontP2);
  });

  loaderFonts.load(fontWin, function (font) {
    const geometry = new TextGeometry("P l a y e r   1   w i n", {
      font: font,
      size: 1,
      depth: 0.5,
      curveSegments: 12,
    });
  
    loadedFontP1 = new THREE.Mesh(geometry, [
      new THREE.MeshPhongMaterial({ color: 0xad4000 }),
      new THREE.MeshPhongMaterial({ color: 0x5c2301 })
    ]);
    loadedFontP1.doubleSided = true;
    loadedFontP1.position.x = 100;
    loadedFontP1.position.y = 5;
    loadedFontP1.position.z = 0;
    loadedFontP1.scale.x = -1;
  
    scene.add(loadedFontP1);
  });
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

      const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
      const dir_z = -Math.sign(posZ);
      let   lenghtHalf = 2.5;
      let   widthHalf = 0.5;
      let   controlReverse = false;
      let   speed = 0.25;
      let   score = 0;
    
      return ({
          cubeMesh,
          cubeUpdate,

          get speed() { return speed; },
          set speed(newSpeed) { speed = newSpeed; },
          get score() { return score; },
          set score(newScore) { score = newScore; },
          get controlReverse() { return controlReverse; },
          set controlReverse(newControlReverse) { controlReverse = newControlReverse; },
          get lenghtHalf() { return lenghtHalf; },
          set lenghtHalf(newLenghtHalf) { lenghtHalf = newLenghtHalf; },
          get widthHalf() { return widthHalf; },
          set widthHalf(newWidthHalf) { widthHalf = newWidthHalf; },
          get dir_z() { return dir_z; },
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

    let delta;
    let ballSubtickZ;
    let ballSubtickX;
    let lastBumperCollided = 0;

    function degreesToRadians(degrees)
    {
        var pi = Math.PI;
        return degrees * (pi/180);
    }
    
    function isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX) {
      return (
          (Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= coin.cylinderUpdate.x + 0.25)
          && (Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= coin.cylinderUpdate.x - 0.25)
          && (Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= coin.cylinderUpdate.z + 0.05)
          && (Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= coin.cylinderUpdate.z - 0.05));
  }

    function isCollidedWithBall(bumper, ballSubtickZ, ballSubtickX) {
        return (
            (Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= bumper.cubeUpdate.x + bumper.lenghtHalf)
            && (Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= bumper.cubeUpdate.x - bumper.lenghtHalf)
            && (Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= bumper.cubeUpdate.z + bumper.widthHalf)
            && (Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= bumper.cubeUpdate.z - bumper.widthHalf));
    }

    function calculateNewDir(bumper) {
        let collision_pos_x = bumper.cubeUpdate.x - Ball.sphereUpdate.x;
        let normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + bumper.lenghtHalf);
        let bounce_angle_radians = degreesToRadians(55 * normalized_collision_pos_x);
        Ball.velocity.z = (Math.min(1, Math.abs(Ball.velocity.z * 1.025 * Ball.temporalSpeed.z)) * bumper.dir_z);
        Ball.velocity.x = Ball.velocity.z * -Math.tan(bounce_angle_radians) * bumper.dir_z;
        Ball.velocity.x = Math.max(Math.abs(Ball.velocity.x), 0.05) * Math.sign(Ball.velocity.x);

        if ((Ball.sphereUpdate.z - BALL_RADIUS * Ball.velocity.z <= bumper.cubeUpdate.z + bumper.widthHalf) && (Ball.sphereUpdate.z + BALL_RADIUS * Ball.velocity.z >= bumper.cubeUpdate.z - bumper.widthHalf))
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
    function resetBall(direction) {
        if (Bumpers[0].score == MAX_SCORE || Bumpers[1].score == MAX_SCORE)
        {
          console.log("aaaa");
          if (Bumpers[0].score == MAX_SCORE)
          {
            loadedFontP1.position.x = 9;
            loadedFontP2.position.x = 100;
            Bumpers[0].score = 0;
            Bumpers[1].score = 0;
          }
          if (Bumpers[1].score == MAX_SCORE)
          {
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
  
    let calculatedBumperPos = Bumpers[1].cubeMesh.position;
    let bumperP1Subtick = 0;
    let bumperP2Subtick = 0;

    function moveAiBumper(calculatedPos) {
      keyMap["KeyA"] = false;
      keyMap["KeyD"] = false;
      if (calculatedBumperPos.x <= calculatedPos.x )
      {
        keyMap["KeyA"] = true;
        calculatedBumperPos.x += bumperP2Subtick;
      }
      else if (calculatedBumperPos.x >= calculatedPos.x )
      {
        keyMap["KeyD"] = true;
        calculatedBumperPos.x -= bumperP2Subtick;
      }
    }
    
    let isMovementDone = false;
    let ballPredictedPos;
    let isCalculationNeeded = true;
    let choosePos;

    function handleAiBehavior (BallPos, BallVelocity){
    //better calculation to put here
    if (isCalculationNeeded)
    {
      ballPredictedPos = new THREE.Vector3(BallPos.x, BallPos.y, BallPos.z);
      let BallPredictedVelocity = new THREE.Vector3(BallVelocity.x, BallVelocity.y, BallVelocity.z);;
      let totalDistanceZ = Math.abs((Ball.temporalSpeed.z) * Ball.velocity.z);
      while (ballPredictedPos.z <= BUMPER_2_BORDER - Bumpers[1].widthHalf)
      {
        let totalDistanceX = Math.abs((Ball.temporalSpeed.x) * BallPredictedVelocity.x);
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
      isCalculationNeeded = false;
      console.log(ballPredictedPos.x);
      choosePos = Math.floor(Math.random() * 3);
      if (choosePos == 1)
        ballPredictedPos.x -= Math.random() * 3.5;
      else if (choosePos == 2)
        ballPredictedPos.x += Math.random() * 3.5;
      else
        ballPredictedPos = BallPos;
      // console.log(ballPredictedPos.x);
    }
    if (!isMovementDone && ((BallPos.z >= 0 && (choosePos != 3 && choosePos != 0)) || (choosePos == 3 || choosePos == 0)))
      moveAiBumper(ballPredictedPos);
    else
    {
      keyMap["KeyD"] = false;
      keyMap["KeyA"] = false;
    }
  }
  var Workers = [];
  function firstStart()
  {
    var blob = new Blob([
      "let remaining; var Timer = function(callback, delay) { var timerId, start = delay; remaining = delay; this.pause = function() {clearTimeout(timerId);timerId = null;" + 
      "remaining -= Date.now() - start;};this.resume = function() {if (timerId) {return;} start = Date.now();timerId = setTimeout(callback, remaining);};" +
      "this.resume();}; let pauseTimer = null; onmessage = function(e) {if (e.data[2] == \"pause\" && pauseTimer != null) {pauseTimer.pause();}" + 
      "else if (e.data[2] == \"create\"){pauseTimer = new Timer(function(){postMessage([e.data[1]])}, e.data[0])} else if (e.data[2] == \"resume\" && pauseTimer != null && remaining > 0) {pauseTimer.resume();}}"]);
    var blobURL = window.URL.createObjectURL(blob);

    Workers = [new Worker(blobURL), new Worker(blobURL), new Worker(blobURL), new Worker(blobURL), new Worker(blobURL), new Worker(blobURL)];
    Workers[0].onmessage = function(e) {
      Bumpers[e.data[0]].cubeMesh.scale.x = 1;
      Bumpers[e.data[0]].lenghtHalf = 2.5;
    };
    Workers[1].onmessage = function(e) {
      Bumpers[Math.abs(e.data[0] - 1)].cubeMesh.scale.x = 1;
      Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf = 2.5;
      if ((Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf)) {
        Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf - 0.1;
      }
      else if (Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf){
          Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf + 0.1;
      }
    };
    Workers[2].onmessage = function(e) {
      Bumpers[Math.abs(e.data[0] - 1)].controlReverse = false;
    };
    Workers[3].onmessage = function(e) {
      Bumpers[[Math.abs(e.data[0] - 1)]].speed = 0.25;
    };
    Workers[4].onmessage = function(e) {
      Bumpers[e.data[0]].cubeMesh.scale.z = 1;
      Bumpers[e.data[0]].widthHalf = 0.5;
    };
    Workers[5].onmessage = function(e) {
      Coin.cylinderUpdate.set(-9.25, 3, 0);
    };
    start();
  }

    function  manageBuffAndDebuff() {
      let chooseBuff = Math.floor(Math.random() * 5);
      switch (chooseBuff)
      {
        case 1:
          Bumpers[lastBumperCollided].cubeMesh.scale.x = 2;
          Bumpers[lastBumperCollided].lenghtHalf = 5;
          if ((Bumpers[lastBumperCollided].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf)) {
              Bumpers[lastBumperCollided].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1;
          }
          else if (Bumpers[lastBumperCollided].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf){
              Bumpers[lastBumperCollided].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
          }
          Workers[0].postMessage([10000, lastBumperCollided, "create"]);
          break ;
        case 2:
          Bumpers[Math.abs(lastBumperCollided - 1)].cubeMesh.scale.x = 0.5;
          Bumpers[Math.abs(lastBumperCollided - 1)].lenghtHalf = 1.25;
          Workers[1].postMessage([10000, lastBumperCollided, "create"]);
          break ;
        case 3:
          Bumpers[Math.abs(lastBumperCollided - 1)].controlReverse = true;
          Workers[2].postMessage([2000, lastBumperCollided, "create"]);
          break ;
        case 4:
          Bumpers[Math.abs(lastBumperCollided - 1)].speed = 0.1;
          Workers[3].postMessage([5000, lastBumperCollided, "create"]);
          break ;
        default:
          Bumpers[lastBumperCollided].cubeMesh.scale.z = 3;
          Bumpers[lastBumperCollided].widthHalf = 1.5;
          Workers[4].postMessage([10000, lastBumperCollided, "create"]);
          break ;
      }
      Coin.cylinderUpdate.set(-100, 3, 0);
      Workers[5].postMessage([30000, -1, "create"]);
    }



    function animate() {
      step = null;
      let totalDistanceX = Math.abs((Ball.temporalSpeed.x) * Ball.velocity.x);
      let totalDistanceZ = Math.abs((Ball.temporalSpeed.z) * Ball.velocity.z);
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);
      let current_subtick = 0;
      ballSubtickZ = SUBTICK;
      let totalSubticks = totalDistanceZ / ballSubtickZ;
      ballSubtickX = totalDistanceX / totalSubticks;
      bumperP1Subtick = Bumpers[0].speed / totalSubticks;
      bumperP2Subtick = Bumpers[1].speed / totalSubticks;
      while (current_subtick <= totalSubticks) {
          if (Ball.sphereUpdate.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
              Ball.sphereUpdate.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
              Ball.velocity.x *= -1;
          }
          if (Ball.sphereUpdate.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
              Ball.sphereUpdate.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
              Ball.velocity.x *= -1;
          }
          if (Ball.velocity.z <= 0 && isCollidedWithBall(Bumpers[0], ballSubtickZ, ballSubtickX)) {
            lastBumperCollided = 0;
            isMovementDone = false;
            isCalculationNeeded = true;
            calculateNewDir(Bumpers[0]);
          }
          else if (Ball.velocity.z > 0 && isCollidedWithBall(Bumpers[1], ballSubtickZ, ballSubtickX)) {
              lastBumperCollided = 1;
              isMovementDone = true;
              calculateNewDir(Bumpers[1]);
          }
          if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
              isMovementDone = true;
              Bumpers[0].score++;
              resetBall(-1);
          }
          else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
              isMovementDone = false;
              isCalculationNeeded = true;
              Bumpers[1].score++;
              resetBall(1);
          }
          if (isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) {
            manageBuffAndDebuff();
          }

          if (((keyMap['ArrowRight'] == true && Bumpers[0].controlReverse) || (keyMap['ArrowLeft'] == true && !Bumpers[0].controlReverse)) && !(Bumpers[0].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[0].lenghtHalf))
              Bumpers[0].cubeUpdate.x += bumperP1Subtick;
          if (((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) || (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) && !(Bumpers[0].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[0].lenghtHalf))
              Bumpers[0].cubeUpdate.x -= bumperP1Subtick;

          if (((keyMap['KeyD'] == true && Bumpers[1].controlReverse) || (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) && !(Bumpers[1].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[1].lenghtHalf))
            Bumpers[1].cubeUpdate.x += bumperP2Subtick;
          if (((keyMap['KeyA'] == true && Bumpers[1].controlReverse) || (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) && !(Bumpers[1].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[1].lenghtHalf))
            Bumpers[1].cubeUpdate.x -= bumperP2Subtick;

          Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
          if ((Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf) || (Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf)) {
            Coin.velocity.x *= -1
          }
          Coin.cylinderUpdate.x += Coin.velocity.x;
          Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;
          handleAiBehavior(Ball.sphereUpdate, Ball.velocity);
          current_subtick++;
      }
      Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
      Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
      Bumpers[0].cubeMesh.position.set(Bumpers[0].cubeUpdate.x, Bumpers[0].cubeUpdate.y, Bumpers[0].cubeUpdate.z);
      Bumpers[1].cubeMesh.position.set(Bumpers[1].cubeUpdate.x, Bumpers[1].cubeUpdate.y, Bumpers[1].cubeUpdate.z);
      
      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
      start();
    }
    
    let isPaused = false;

    let onDocumentKeyDown = function (event) {
      if (event.defaultPrevented || !gamePlaying) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      if (keyCode != 'KeyA' && keyCode != 'KeyD')
        keyMap[keyCode] = true;
      if (keyCode == "Escape")
      {
        if (isPaused == false)
        {
          stop();
          let i = 0;
          while (i <= 5)
            Workers[i++].postMessage([-1, -1, "pause"]);
          isPaused = true;
        }
        else
        {
          let i = 0;
          while (i <= 5)
            Workers[i++].postMessage([-1, -1, "resume"]);
          isPaused = false;
          start();
        }
      }
      event.preventDefault();
    }

    let onDocumentKeyUp = function (event) {
      if (event.defaultPrevented || !gamePlaying) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      keyMap[keyCode] = false;
      event.preventDefault();
    }
    function linkChange() {
      stop();
      gamePlaying = false;
      let i = 0;
      while (i <= 5)
        Workers[i++].terminate();
      const currentUrl = window.location.href;
      if (currentUrl == "https://localhost:1026/singleplayer-game")
      {
        gamePlaying = true;
        firstStart();
      }
    };
    window.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('locationchange', linkChange);
    window.addEventListener('keyup', onDocumentKeyUp, true);

    return [camera, renderer, firstStart];
  }

  render() {
    this.innerHTML = ``;

    const [camera, renderer, start] = this.game();
    window.addEventListener('resize', function() {
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
