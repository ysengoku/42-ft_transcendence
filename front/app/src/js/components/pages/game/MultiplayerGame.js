import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from '/node_modules/cannon-es/dist/cannon-es.js';
import Stats from '/node_modules/three/examples/jsm/libs/stats.module.js';
import { GUI } from '/node_modules/dat.gui/build/dat.gui.module.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import pedro from '/3d_models/lilguy.glb?url';
import auidourl from '/audio/score_sound.mp3?url';

export class MultiplayerGame extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    game() {
        const audio = new Audio(auidourl);
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

        const pongSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/pong/'
            + 'asd'
            + '/'
        );

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

        pongSocket.addEventListener("open", function(_) {
            console.log('Success! :3')
        });

        let data;
        let player_id = '';
        pongSocket.addEventListener("message", function(e) {
            data = JSON.parse(e.data)
            switch (data.event) {
                case "game_tick":
                    updateState(data.state);
                    if (data.state.someone_scored)
                        audio.cloneNode().play();
                    break;
                case "joined":
                    player_id = data.player_id;
                    break;
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

customElements.define('multiplayer-game', MultiplayerGame);
