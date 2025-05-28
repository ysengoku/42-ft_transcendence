import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/lilguy.glb?url';
import audiourl from '/audio/score_sound.mp3?url';

export class MultiplayerGame extends HTMLElement {
  #state = {
    gameId: '',
  };

  constructor() {
    super();
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
            const velocity = new THREE.Vector3(0.01, 0, 0);
            let lenghtHalf = 0.25;

            return ({

                get lenghtHalf() { return lenghtHalf; },
                set lenghtHalf(newLenghtHalf) { lenghtHalf = newLenghtHalf; },
                cylinderMesh,
                cylinderUpdate,
                velocity,
            });
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

            const cubeUpdate = new THREE.Vector3(posX, posY, posZ);
            const dir_z = -Math.sign(posZ);
            const inputQueue = [];
            // let   lenghtHalf = 2.5;
            // let   widthHalf = 0.5;
            // let   controlReverse = false;
            let   speed = 0.25;
            let   score = 0;
            
            return ({
                cubeMesh,
                cubeUpdate,

                get speed() { return speed; },
                set speed(newSpeed) { speed = newSpeed; },
                get score() { return score; },
                set score(newScore) { score = newScore; },
                get inputQueue() { return inputQueue; },
                // get controlReverse() { return controlReverse; },
                // set controlReverse(newControlReverse) { controlReverse = newControlReverse; },
                // get lenghtHalf() { return lenghtHalf; },
                // set lenghtHalf(newLenghtHalf) { lenghtHalf = newLenghtHalf; },
                // get widthHalf() { return widthHalf; },
                // set widthHalf(newWidthHalf) { widthHalf = newWidthHalf; },
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

        const clock = new THREE.Clock();

        const pongSocket = new WebSocket('wss://' + window.location.host + '/ws/pong/' + this.#state.gameId + '/');

        let lastBumperCollided;
        function updateState(data) {
            if (!data)
                return;
            data.last_bumper_collided == "_bumper_1" ? lastBumperCollided = 0 : lastBumperCollided = 1;
            console.log(data.last_bumper_collided)
            
            Ball.hasCollidedWithBumper1 = data.ball.has_collided_with_bumper_1;
            Ball.hasCollidedWithBumper2 = data.ball.has_collided_with_bumper_2;
            Ball.hasCollidedWithWall = data.ball.has_collided_with_wall;

            Ball.sphereUpdate.z = data.ball.z;
            Ball.sphereUpdate.x = data.ball.x;

            Coin.cylinderUpdate.z = data.coin.z;
            Coin.cylinderUpdate.x = data.coin.x;

            Bumpers[0].score = data.bumper_1.score;
            Bumpers[0].cubeMesh.position.x = data.bumper_1.x;

            Bumpers[1].score = data.bumper_2.score;
            Bumpers[1].cubeMesh.position.x = data.bumper_2.x;

            console.log(data.current_buff_or_debuff);
            if (data.current_buff_or_debuff != -1)
            {
                if (data.current_buff_or_debuff == 2)
                    Bumpers[lastBumperCollided].cubeMesh.scale.x = 0.5;
                else if (data.current_buff_or_debuff == 3)
                    Bumpers[lastBumperCollided].cubeMesh.scale.x = 2;
                else if (data.current_buff_or_debuff == 4)
                    Bumpers[lastBumperCollided].cubeMesh.scale.z = 3;
                else if (data.current_buff_or_debuff == -2)
                    Bumpers[lastBumperCollided].cubeMesh.scale.x = 1;
                else if (data.current_buff_or_debuff == -3)
                    Bumpers[lastBumperCollided].cubeMesh.scale.x = 1;
                else if (data.current_buff_or_debuff == -4)
                    Bumpers[lastBumperCollided].cubeMesh.scale.z = 1;
            }
        }

        // function updateBuff(data)
        // {
        //     if (!data)
        //         return;

        //     
        //     if (data.current_buff_or_debuff != -1)
        //     {

        //     }
        // }

        pongSocket.addEventListener("open", function(_) {
            console.log('Success! :3 ')
        });

        let data;
        let ourBumper;
        let player_id = '';
        pongSocket.addEventListener("message", function(e) {
            data = JSON.parse(e.data)
            switch (data.event) {
                case "game_tick":
                    updateState(data.state);
                    // if (data.state.someone_scored)
                    //     audio.cloneNode().play();
                    break;
                case "joined":
                    player_id = data.player_id;
                    console.log(player_id)
                    // console.log(data.bumper)
                    break;
                // case "":
                //     updateBuff(data.state)
                //     break;
                default:
                    break;
            }
        });

        pongSocket.addEventListener("close", function(_) {
            console.log('PONG socket was nice! :3');
        });

        function animate() {
            requestAnimationFrame(animate);
            let delta = Math.min(clock.getDelta(), 0.1);

            Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
            Coin.cylinderMesh.position.set(Coin.cylinderUpdate.x, 1, Coin.cylinderUpdate.z);
            // console.log(Coin.cylinderMesh.position);
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
                
                pongSocket.send(JSON.stringify({ action: "move_left", content: true, player_id }))
            if (keyCode == 'ArrowRight')
                pongSocket.send(JSON.stringify({ action: "move_right", content: true, player_id }))
            if (keyCode == 'KeyA')
                pongSocket.send(JSON.stringify({ action: "move_left", content: true, player_id }))
            if (keyCode == 'KeyD')
                pongSocket.send(JSON.stringify({ action: "move_right", content: true, player_id }))
            event.preventDefault();
        }
        function onDocumentKeyUp(event) {
            if (event.defaultPrevented) {
                return; // Do noplayerglb if the event was already processed
            }
            var keyCode = event.code;
            if (keyCode == 'ArrowLeft')
                pongSocket.send(JSON.stringify({ action: "move_left", content: false, player_id }))
            if (keyCode == 'ArrowRight')
                pongSocket.send(JSON.stringify({ action: "move_right", content: false, player_id }))
            if (keyCode == 'KeyA')
                pongSocket.send(JSON.stringify({ action: "move_left", content: false, player_id }))
            if (keyCode == 'KeyD')
                pongSocket.send(JSON.stringify({ action: "move_right", content: false, player_id }))
            event.preventDefault();
        }

        return [camera, renderer, animate];
  }

  render() {
    this.innerHTML = ``;

    const [camera, renderer, animate] = this.game();
    window.addEventListener('resize', function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      let rendererWidth = renderer.domElement.offsetWidth;
      let rendererHeight = renderer.domElement.offsetHeight;
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
    });
    animate();
  }
}

customElements.define('multiplayer-game', MultiplayerGame);
