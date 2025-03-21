import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from '/node_modules/cannon-es/dist/cannon-es.js';
import Stats from '/node_modules/three/examples/jsm/libs/stats.module.js';
import { GUI } from '/node_modules/dat.gui/build/dat.gui.module.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import lilguy from '/3d_models/lilguy.glb?url';

export class Game extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  game() {
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
    camera.position.set(10, 15, -22);
    orbit.update();

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    let mixer, idleAction, idleAction2;
    const playerglb = new THREE.Object3D();
    let model;
    const normalMaterial = new THREE.MeshNormalMaterial();
    loader.load(
      lilguy,
      function (gltf) {
        model = gltf.scene;
        model.position.y = 7;
        model.position.z = 0;
        model.position.x = 0;
        mixer = new THREE.AnimationMixer(model);
        idleAction = mixer
          .clipAction(THREE.AnimationUtils.subclip(gltf.animations[0], 'idle', 0, 221))
          .setDuration(6)
          .play();
        idleAction2 = mixer
          .clipAction(THREE.AnimationUtils.subclip(gltf.animations[1], 'idle', 0, 221))
          .setDuration(6)
          .play();
        idleAction.play();
        idleAction2.play();
        playerglb.add(gltf.scene);
      },
      undefined,
      function (error) {
        console.error(error);
      },
    );
	playerglb.scale.set(0.1, 0.1, 0.1);
    scene.add(playerglb);

	const	ligths = [new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff)];
    
    ligths[0].position.set(0, 10, 30);
    ligths[1].position.set(10, 0, 30);
    ligths[2].position.set(0, 10, -30);
    ligths[3].position.set(0, -10, 0);
	for (let i = 0; i < 4; i++)
		scene.add(ligths[i]);
	
	class	Ball_obj {
		constructor(posX, posY, posZ){
			this.z_value = -15;
			this.x_value = 0;
			this.sphereGeometry = new THREE.SphereGeometry(0.5);
			this.sphereMesh = new THREE.Mesh(this.sphereGeometry, normalMaterial);
			this.sphereMesh.position.x = posX;
			this.sphereMesh.position.y = posY;
			this.sphereMesh.position.z = posZ;
			this.sphereMesh.castShadow = true;
			this.sphereShape = new CANNON.Sphere(0.5);
			this.sphereBody = new CANNON.Body({ mass: 1, velocity: new CANNON.Vec3(0, 0, -10) });
			this.sphereBody.addShape(this.sphereShape);
			this.sphereBody.position.x = this.sphereMesh.position.x;
			this.sphereBody.position.y = this.sphereMesh.position.y;
			this.sphereBody.position.z = this.sphereMesh.position.z;
			scene.add(this.sphereMesh);
			world.addBody(this.sphereBody);
			return this;
		}
	}
	const	Ball = new Ball_obj(0, 3, 0);
	
	class Bumper_obj {
		constructor(posX, posY, posZ){
			this.cubeGeometry = new THREE.BoxGeometry(5, 1, 1);
			this.cubeMesh = new THREE.Mesh(this.cubeGeometry, normalMaterial);
			this.cubeMesh.position.x = posX;
			this.cubeMesh.position.y = posY;
			this.cubeMesh.position.z = posZ;
			this.cubeMesh.castShadow = true;
			this.cubeShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5));
			this.cubeBody = new CANNON.Body({ mass: 0 });
			this.cubeBody.addShape(this.cubeShape);
			this.cubeBody.position.x = this.cubeMesh.position.x;
			this.cubeBody.position.y = this.cubeMesh.position.y;
			this.cubeBody.position.z = this.cubeMesh.position.z;
			scene.add(this.cubeMesh);
			world.addBody(this.cubeBody);
			return this;
		}
	}
	const Bumpers = [new Bumper_obj(0, 1, -9), new Bumper_obj(0, 1, 9)];



    const playerShape = new CANNON.Cylinder(1, 1, 3, 32);
    const playerBody = new CANNON.Body({ mass: 10 });
    playerBody.addShape(playerShape);
    playerBody.position.x = 3;
    playerBody.position.y = 3;
    playerBody.position.z = 3;
    world.addBody(playerBody);

	class Wall_obj {
		constructor(posX, posY, posZ){
			this.wallGeometry = new THREE.BoxGeometry(20, 5, 1);
			this.wallMesh = new THREE.Mesh(this.wallGeometry, normalMaterial);
			this.wallMesh.position.x = posX;
			this.wallMesh.position.y = posY;
			this.wallMesh.position.z = posZ;
			this.wallMesh.rotation.y = -Math.PI / 2;
			this.wallMesh.castShadow = true;
			this.wallBody = new CANNON.Body({ mass: 0 });
			this.wallShape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5));
			this.wallBody.addShape(this.wallShape);
			this.wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
			this.wallBody.position.x = this.wallMesh.position.x;
			this.wallBody.position.y = this.wallMesh.position.y;
			this.wallBody.position.z = this.wallMesh.position.z;
			scene.add(this.wallMesh);
			world.addBody(this.wallBody);
			return this;
		}
	}
	const Walls = [new Wall_obj(10, 2.5, 0), new Wall_obj(-10, 2.5, 0)];


	class Plane_obj {
		constructor(){
			this.phongMaterial = new THREE.MeshPhongMaterial();
			this.planeGeometry = new THREE.PlaneGeometry(25, 25);
			this.planeMesh = new THREE.Mesh(this.planeGeometry, this.phongMaterial);
			this.planeMesh.rotateX(-Math.PI / 2);
			this.planeMesh.receiveShadow = true;
			this.planeShape = new CANNON.Plane();
			this.planeBody = new CANNON.Body({ mass: 0 });
			this.planeBody.addShape(this.planeShape);
			this.planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
			scene.add(this.planeMesh);
			world.addBody(this.planeBody);
			return this;
		}
	}
	const Plane = new Plane_obj();

    const clock = new THREE.Clock();
    let delta;

    let collided_cube = false;
    let collided_cube1 = false;
    let collided_cube2 = false;
    let collided_wall = false;

    Ball.sphereBody.addEventListener('collide', function (e) {
      collided_cube1 = e.body.id == Bumpers[0].cubeBody.id;
      collided_cube2 = e.body.id == Bumpers[1].cubeBody.id;
      collided_cube = collided_cube1 || collided_cube2;
      collided_wall = e.body.id == Walls[0].wallBody.id || e.body.id == Walls[1].wallBody.id;
    });

    // let z_value = -15;
    // let Ball.x_value = 0;

    let p1_score = 0;
    let p2_score = 0;
    let last_score = 0;

    function get_coll_pos(cubeBody, cubeGeom, sphereMesh) {
      let hit_pos;

      hit_pos = cubeBody.position.x - cubeGeom.parameters.depth - sphereMesh.position.x;
      return hit_pos;
    }

    function hit_pos_angle_calculator(hit_pos) {
      if (hit_pos >= -1.5 && hit_pos < -0.5) {
        return 0;
      }
      if (hit_pos >= -0.5 && hit_pos < 0.5) {
        return -10;
      }

      if (hit_pos >= 0.5 && hit_pos < 1.5) {
        return -20;
      }

      if (hit_pos >= 1.5 && hit_pos < 2.5) {
        return -30;
      }
      if (hit_pos < -1.5 && hit_pos >= -2.5) {
        return 10;
      }

      if (hit_pos < -2.5 && hit_pos >= -3.5) {
        return 20;
      }

      if (hit_pos < -3.5 && hit_pos >= -4.5) {
        return 30;
      }
      return 0;
    }

    function reset() {
      if (last_score == 0) {
        if (p2_score % 2 == 0)
        	Ball.z_value = 10;
        else
        	Ball.z_value = -10;
      }
      if (last_score == 1) {
        if (p1_score % 2 == 0)
       		Ball.z_value = -10;
        else
        	Ball.z_value = 10;
      }
      if (p1_score == 10 || p2_score == 10) {
        p1_score = 0;
        p2_score = 0;
      }
      Ball.x_value = 0;
      Ball.sphereMesh.position.x = 0;
      Ball.sphereMesh.position.y = 0.5;
      Ball.sphereMesh.position.z = 0;
      Ball.sphereBody.position.x = Ball.sphereMesh.position.x;
      Ball.sphereBody.position.y = Ball.sphereMesh.position.y;
      Ball.sphereBody.position.z = Ball.sphereMesh.position.z;
      // document.getElementById("divA").textContent ="P1 " + p1_score;
      // document.getElementById("divB").textContent ="P2 " + p2_score;
    }

	function animate2() {
		collided_cube = false;
		collided_wall = false;

		requestAnimationFrame(animate2);
		if (Ball.sphereBody.position.z >= 10) {
			p1_score++;
			last_score = 1;
			reset();
		}
		if (Ball.sphereBody.position.z <= -10) {
			p2_score++;
			last_score = 0;
			reset();
		}
		delta = Math.min(clock.getDelta(), 0.1);
		world.step(delta);

		if (collided_cube == true) {
			let hit_pos;

			collided_cube2 == true
			? (hit_pos = get_coll_pos(Bumpers[1].cubeBody, Bumpers[1].cubeGeometry, Ball.sphereMesh))
			: (hit_pos = get_coll_pos(Bumpers[0].cubeBody, Bumpers[0].cubeGeometry, Ball.sphereMesh));
			if (Ball.z_value < 30 && Ball.z_value > -30)
				collided_cube2 == true ? (Ball.z_value += 0.5) : (Ball.z_value -= 0.5);
			Ball.z_value *= -1;
			Ball.x_value = hit_pos_angle_calculator(hit_pos);
		}
		if (collided_wall == true) Ball.x_value *= -1;

		for (let i = 0; i < 2; i++)
		{
			if (Bumpers[i].cubeBody.position.x > 7) {
				Bumpers[i].cubeBody.position.x = 7;
				Bumpers[i].cubeMesh.position.x = 7;
			}
			if (Bumpers[i].cubeBody.position.x < -7) {
				Bumpers[i].cubeBody.position.x = -7;
				Bumpers[i].cubeMesh.position.x = -7;
			}
		}
		Ball.sphereBody.velocity.set(Ball.x_value * 0.3, -9, Ball.z_value);

		// Copy coordinates from Cannon to Three.js
		// playerMesh.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z)
		playerglb.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z);
		// playerMesh.quaternion.set(playerBody.quaternion.x, playerBody.quaternion.y, playerBody.quaternion.z, playerBody.quaternion.w)
		playerglb.quaternion.set(
			playerBody.quaternion.x,
			playerBody.quaternion.y,
			playerBody.quaternion.z,
			playerBody.quaternion.w,
		);
		Ball.sphereMesh.position.set(Ball.sphereBody.position.x, Ball.sphereBody.position.y, Ball.sphereBody.position.z);
		Ball.sphereMesh.quaternion.set(
			Ball.sphereBody.quaternion.x,
			Ball.sphereBody.quaternion.y,
			Ball.sphereBody.quaternion.z,
			Ball.sphereBody.quaternion.w,
		);
		for (let i = 0; i < 2; i++)
		{
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
		input_manager();
    }

    var keyMap = [];
    document.addEventListener('keydown', onDocumentKeyDown, true);
    document.addEventListener('keyup', onDocumentKeyUp, true);
    function onDocumentKeyDown(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.key;
      keyMap[keyCode] = true;
      event.preventDefault();
    }
    function onDocumentKeyUp(event) {
      if (event.defaultPrevented) {
        return; // Do noplayerglb if the event was already processed
      }
      var keyCode = event.key;
      keyMap[keyCode] = false;
      event.preventDefault();
    }

    function input_manager() {
      if (keyMap['ArrowLeft'] == true) Bumpers[0].cubeBody.position.x += 0.25;
      if (keyMap['ArrowRight'] == true) Bumpers[0].cubeBody.position.x -= 0.25;
      if (keyMap['q'] == true) Bumpers[1].cubeBody.position.x += 0.25;
      if (keyMap['d'] == true) Bumpers[1].cubeBody.position.x -= 0.25;
    }
    window.addEventListener('resize', function () {
      camera.aspect = rendererWidth / rendererHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(rendererWidth, rendererHeight);
    });
    animate2();
  }

  render() {
    this.innerHTML = ``;

    this.game();
  }
}

customElements.define('singleplayer-game', Game);
