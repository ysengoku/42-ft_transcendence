import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import audiourl from '/audio/score_sound.mp3?url';
import pedro from '/3d_models/lilguy.glb?url';


export class Game extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  game() {
    var keyMap = [];
    const WALL_WIDTH_HALF = 0.5;
    let BUMPER_1_LENGTH_HALF = 2.5;
    let BUMPER_2_LENGTH_HALF = 2.5;
    const BUMPER_WIDTH = 1;
    const BUMPER_WIDTH_HALF = BUMPER_WIDTH / 2;
    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BUMPER_SPEED = 0.25;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    const SUBTICK = 0.05;
    // const BOUNCING_ANGLE_DEGREES = 55;
    // const BALL_VELOCITY_CAP = 1
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;


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
    // let hasCollidedWithBumper1 = false;
    // let hasCollidedWithBumper2 = false;
    // let hasCollidedWithWall = false;

    return ({

        get lenghtHalf() { return lenghtHalf; },
        set lenghtHalf(newLenghtHalf) { lenghtHalf = newLenghtHalf; },
        cylinderMesh,
        cylinderUpdate,
        velocity,
        // temporalSpeed,
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
      const velocity = new THREE.Vector3(0, 0, 0.25);

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
      // let   lenght = 5;
      let score = 0;
    
      return ({
          cubeMesh,
          cubeUpdate,

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

    function resetBall(direction) {
        Ball.temporalSpeed.x = 1;
        Ball.temporalSpeed.z = 1;
        Ball.sphereUpdate.x = 0;
        Ball.sphereUpdate.z = 0;
        Ball.velocity.x = 0;
        Ball.velocity.z = 0.25;
        Ball.velocity.z *= direction;
    }

    // AI FUNC:
    // -> get sphere velocity and pos
    // -> calculate potential bounce on walls based on the pos and velocity 
    // -> calculate best position to collide
    // -> move to the best position
  
    let calculatedBumperPos = Bumpers[1].cubeMesh.position;
    let bumperSubtick = 0;

    function moveAiBumper(calculatedPos) {
      keyMap["KeyA"] = false;
      keyMap["KeyD"] = false;
      if (calculatedBumperPos.x <= calculatedPos.x )
      {
        keyMap["KeyA"] = true;
        calculatedBumperPos.x += bumperSubtick;
      }
      else if (calculatedBumperPos.x >= calculatedPos.x )
      {
        keyMap["KeyD"] = true;
        calculatedBumperPos.x -= bumperSubtick;
      }
    }
    
    let isCalculationDone = false;
    function handleAiBehavior (){
      if (!isCalculationDone)
        moveAiBumper(Ball.sphereMesh.position);
      else
      {
        keyMap["KeyD"] = false;
        keyMap["KeyA"] = false;
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      let someone_scored = false;
      let totalDistanceX = Math.abs((Ball.temporalSpeed.x) * Ball.velocity.x);
      let totalDistanceZ = Math.abs((Ball.temporalSpeed.z) * Ball.velocity.z);
      Ball.temporalSpeed.x = Math.max(1, Ball.temporalSpeed.x - TEMPORAL_SPEED_DECAY);
      Ball.temporalSpeed.z = Math.max(1, Ball.temporalSpeed.z - TEMPORAL_SPEED_DECAY);
      let current_subtick = 0;
      ballSubtickZ = SUBTICK;
      let totalSubticks = totalDistanceZ / ballSubtickZ;
      ballSubtickX = totalDistanceX / totalSubticks;
      bumperSubtick = BUMPER_SPEED / totalSubticks;
      while (current_subtick <= totalSubticks) {
          if (Ball.sphereUpdate.x <= -10 + BALL_RADIUS + WALL_WIDTH_HALF) {
              Ball.sphereUpdate.x = -10 + BALL_RADIUS + WALL_WIDTH_HALF;
              Ball.velocity.x *= -1;
          }
          if (Ball.sphereUpdate.x >= 10 - BALL_RADIUS - WALL_WIDTH_HALF) {
              Ball.sphereUpdate.x = 10 - BALL_RADIUS - WALL_WIDTH_HALF;
              Ball.velocity.x *= -1;
          }
          if (Ball.velocity.z <= 0 && isCollidedWithBall(Bumpers[0], ballSubtickZ, ballSubtickX)){
            lastBumperCollided = 0;
            isCalculationDone = false;
            calculateNewDir(Bumpers[0]);
            
          }
          else if (Ball.velocity.z > 0 && isCollidedWithBall(Bumpers[1], ballSubtickZ, ballSubtickX)){
              lastBumperCollided = 1;
              isCalculationDone = true;
              calculateNewDir(Bumpers[1]);
          }

          if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
              Bumpers[0].score++;
              resetBall(-1);
              someone_scored = true;
          }
          else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
              isCalculationDone = false;
              Bumpers[1].score++;
              resetBall(1);
              someone_scored = true;
          }
          if (isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) {
                let choose = Math.floor(Math.random() * 4);
                if (choose == 1) {
                  Bumpers[lastBumperCollided].cubeMesh.scale.x = 2;
                  Bumpers[lastBumperCollided].lenghtHalf = 5;
                  if ((Bumpers[lastBumperCollided].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf)) {
                      Bumpers[lastBumperCollided].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1;
                  }
                  else if (Bumpers[lastBumperCollided].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf){
                      Bumpers[lastBumperCollided].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
                  }
                }
                else if (choose == 2) {
                  Bumpers[Math.abs(lastBumperCollided - 1)].cubeMesh.scale.x = 0.5;
                  Bumpers[Math.abs(lastBumperCollided - 1)].lenghtHalf = 1.25;
                }
                else if (choose == 3){
                    Bumpers[Math.abs(lastBumperCollided - 1)].controlReverse = true;
                }
                else{
                  Bumpers[lastBumperCollided].cubeMesh.scale.z = 3;
                  Bumpers[lastBumperCollided].widthHalf = 1.5;
                }
                
                Coin.cylinderUpdate.set(-9.25, 3, 0);
          }
          // console.log();
          if (((keyMap['ArrowRight'] == true && Bumpers[0].controlReverse) || (keyMap['ArrowLeft'] == true && !Bumpers[0].controlReverse)) && !(Bumpers[0].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[0].lenghtHalf))
              Bumpers[0].cubeUpdate.x += bumperSubtick;
          if (((keyMap['ArrowLeft'] == true && Bumpers[0].controlReverse) || (keyMap['ArrowRight'] == true && !Bumpers[0].controlReverse)) && !(Bumpers[0].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[0].lenghtHalf))
              Bumpers[0].cubeUpdate.x -= bumperSubtick;

          if (((keyMap['KeyD'] == true && Bumpers[1].controlReverse) || (keyMap['KeyA'] == true && !Bumpers[1].controlReverse)) && !(Bumpers[1].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[1].lenghtHalf))
            Bumpers[1].cubeUpdate.x += bumperSubtick;
          if (((keyMap['KeyA'] == true && Bumpers[1].controlReverse) || (keyMap['KeyD'] == true && !Bumpers[1].controlReverse)) && !(Bumpers[1].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[1].lenghtHalf))
            Bumpers[1].cubeUpdate.x -= bumperSubtick;

          Ball.sphereUpdate.z += ballSubtickZ * Ball.velocity.z;
          if ((Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf) || (Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf)) {
            Coin.velocity.x *= -1
            console.log("oui")
          }
          Coin.cylinderUpdate.x += Coin.velocity.x;
          Ball.sphereUpdate.x += ballSubtickX * Ball.velocity.x;
          handleAiBehavior();
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
    }

    document.addEventListener('keydown', onDocumentKeyDown, true);
    document.addEventListener('keyup', onDocumentKeyUp, true);
    function onDocumentKeyDown(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      keyMap[keyCode] = true;
      event.preventDefault();
    }
    function onDocumentKeyUp(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.code;
      keyMap[keyCode] = false;
      event.preventDefault();
    }
  
    return [camera, renderer, animate];
  }

  render() {
    this.innerHTML = ``;

    const [camera, renderer, animate] = this.game();
    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        let rendererWidth = renderer.domElement.offsetWidth;
        let rendererHeight = renderer.domElement.offsetHeight;
        camera.aspect = rendererWidth / rendererHeight;
        camera.updateProjectionMatrix();
    });
    animate()
  }
}

customElements.define('singleplayer-game', Game);
