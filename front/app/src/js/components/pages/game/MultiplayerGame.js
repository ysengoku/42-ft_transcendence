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
        const world = new CANNON.World();

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
            let z_value = -15;
            let x_value = 0;
            const sphereGeometry = new THREE.SphereGeometry(0.5);
            const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
            sphereMesh.position.x = posX;
            sphereMesh.position.y = posY;
            sphereMesh.position.z = posZ;
            sphereMesh.castShadow = true;
            const sphereShape = new CANNON.Sphere(0.5);
            const sphereBody = new CANNON.Body({ mass: 1, velocity: new CANNON.Vec3(0, 0, -10) });
            sphereBody.addShape(sphereShape);
            sphereBody.position.x = sphereMesh.position.x;
            sphereBody.position.y = sphereMesh.position.y;
            sphereBody.position.z = sphereMesh.position.z;
            scene.add(sphereMesh);
            world.addBody(sphereBody);

            let hasCollidedWithAnyBumper = false;
            let hasCollidedWithBumper1 = false;
            let hasCollidedWithBumper2 = false;
            let hasCollidedWithWall = false;

            return ({
                get z_value () { return z_value },
                set z_value (new_z_value) { z_value = new_z_value },

                get x_value () { return x_value },
                set x_value (new_x_value) { x_value = new_x_value },

                get hasCollidedWithAnyBumper () { return hasCollidedWithBumper1 || hasCollidedWithBumper2 },

                get hasCollidedWithBumper1 () { return hasCollidedWithBumper1 },
                set hasCollidedWithBumper1 (newHasCollidedWithBumper1) { hasCollidedWithBumper1 = newHasCollidedWithBumper1 },

                get hasCollidedWithBumper2 () { return hasCollidedWithBumper2 },
                set hasCollidedWithBumper2 (newHasCollidedWithBumper2) { hasCollidedWithBumper2 = newHasCollidedWithBumper2 },

                get hasCollidedWithWall () { return hasCollidedWithWall },
                set hasCollidedWithWall (newHasCollidedWithWall) { hasCollidedWithWall = newHasCollidedWithWall },

                sphereMesh,
                sphereBody,
            });
        })(0, 3, 0);

        camera.position.set(10, 15, -22);
        orbit.update();

        world.gravity.set(0, -9.82, 0);

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
            const cubeShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5));
            const cubeBody = new CANNON.Body({ mass: 0 });
            cubeBody.addShape(cubeShape);
            cubeBody.position.x = cubeMesh.position.x;
            cubeBody.position.y = cubeMesh.position.y;
            cubeBody.position.z = cubeMesh.position.z;
            scene.add(cubeMesh);
            world.addBody(cubeBody);
            
            let score = 0;
            return ({
                cubeBody,
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
            const wallBody = new CANNON.Body({ mass: 0 });
            const wallShape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5));
            wallBody.addShape(wallShape);
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
            wallBody.position.x = wallMesh.position.x;
            wallBody.position.y = wallMesh.position.y;
            wallBody.position.z = wallMesh.position.z;
            scene.add(wallMesh);
            world.addBody(wallBody);

            return ({
                wallBody,
            });
        }
        const Walls = [WallFactory(10, 2.5, 0), WallFactory(-10, 2.5, 0)];

        (() => {
            const phongMaterial = new THREE.MeshPhongMaterial();
            const planeGeometry = new THREE.PlaneGeometry(25, 25);
            const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
            planeMesh.rotateX(-Math.PI / 2);
            planeMesh.receiveShadow = true;
            const planeShape = new CANNON.Plane();
            const planeBody = new CANNON.Body({ mass: 0 });
            planeBody.addShape(planeShape);
            planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            scene.add(planeMesh);
            world.addBody(planeBody);
        })();

        const clock = new THREE.Clock();

        Ball.sphereBody.addEventListener('collide', function(e) {
            Ball.hasCollidedWithBumper1 = e.body.id == Bumpers[0].cubeBody.id;
            Ball.hasCollidedWithBumper2 = e.body.id == Bumpers[1].cubeBody.id;
            Ball.hasCollidedWithWall = e.body.id == Walls[0].wallBody.id || e.body.id == Walls[1].wallBody.id;
        });

        // let z_value = -15;
        // let Ball.x_value = 0;

        let lastScore = 0;

        function get_coll_pos(cubeBody, cubeGeom, sphereMesh) {
            let hit_pos;

            hit_pos = cubeBody.position.x - cubeGeom.parameters.depth - sphereMesh.position.x;
            return hit_pos;
        }

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

            Ball.sphereBody.position.z = data.ball.z;
            Ball.sphereBody.position.x = data.ball.x;
            Ball.sphereBody.velocity.set(data.ball.velocity.x * 0.3, -9, data.ball.velocity.z);

            Bumpers[0].score = data.bumper_1.score;
            Bumpers[0].cubeBody.position.x = data.bumper_1.x;

            Bumpers[1].score = data.bumper_2.score;
            Bumpers[1].cubeBody.position.x = data.bumper_2.x;
            lastScore = data.last_score;
        }

        pongSocket.addEventListener("open", function(_) {
            console.log('Success! :3')
        });

        let data;
        pongSocket.addEventListener("message", function(e) {
            data = JSON.parse(e.data);
            updateState(data.state);
            if (data.state.someone_scored)
              audio.cloneNode().play();
        });

        pongSocket.addEventListener("close", function(_) {
            console.log('PONG socket was nice! :3');
        });

        function animate() {
            requestAnimationFrame(animate);
            let delta = Math.min(clock.getDelta(), 0.1);
            world.step(delta);

            Ball.sphereMesh.position.set(Ball.sphereBody.position.x, Ball.sphereBody.position.y, Ball.sphereBody.position.z);
            Ball.sphereMesh.quaternion.set(
                Ball.sphereBody.quaternion.x,
                Ball.sphereBody.quaternion.y,
                Ball.sphereBody.quaternion.z,
                Ball.sphereBody.quaternion.w,
            );
            for (let i = 0; i < 2; i++) {
                Bumpers[i].cubeMesh.position.set(Bumpers[i].cubeBody.position.x, Bumpers[i].cubeBody.position.y, Bumpers[i].cubeBody.position.z);
                Bumpers[i].cubeMesh.quaternion.set(
                    Bumpers[i].cubeBody.quaternion.x,
                    Bumpers[i].cubeBody.quaternion.y,
                    Bumpers[i].cubeBody.quaternion.z,
                    Bumpers[i].cubeBody.quaternion.w,
                );
            }
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
                pongSocket.send(JSON.stringify({"action": "bumper1_move_left", "content": true}))
            if (keyCode == 'ArrowRight')
                pongSocket.send(JSON.stringify({"action": "bumper1_move_right", "content": true}))
            if (keyCode == 'KeyA')
                pongSocket.send(JSON.stringify({"action": "bumper2_move_left", "content": true}))
            if (keyCode == 'KeyD')
                pongSocket.send(JSON.stringify({"action": "bumper2_move_right", "content": true}))
            event.preventDefault();
        }
        function onDocumentKeyUp(event) {
            if (event.defaultPrevented) {
                return; // Do noplayerglb if the event was already processed
            }
            var keyCode = event.code;
            if (keyCode == 'ArrowLeft')
                pongSocket.send(JSON.stringify({"action": "bumper1_move_left", "content": false}))
            if (keyCode == 'ArrowRight')
                pongSocket.send(JSON.stringify({"action": "bumper1_move_right", "content": false}))
            if (keyCode == 'KeyA')
                pongSocket.send(JSON.stringify({"action": "bumper2_move_left", "content": false}))
            if (keyCode == 'KeyD')
                pongSocket.send(JSON.stringify({"action": "bumper2_move_right", "content": false}))
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
