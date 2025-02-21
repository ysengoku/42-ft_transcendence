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
    console.log(rendererWidth, rendererHeight);

    const scene = new THREE.Scene();

    const loader = new GLTFLoader();
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
	var	ligths = [new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff), new THREE.DirectionalLight(0xffffff)];
    scene.add(playerglb);
    
    ligths[0].position.set(0, 10, 30);
    ligths[1].position.set(10, 0, 30);
    ligths[2].position.set(0, 10, -30);
    ligths[3].position.set(0, -10, 0);
	for (let i = 0; i < 4; i++)
		scene.add(ligths[i]);
    playerglb.scale.set(0.1, 0.1, 0.1);

    const camera = new THREE.PerspectiveCamera(45, rendererWidth / rendererHeight, 0.1, 2000);

    const orbit = new OrbitControls(camera, renderer.domElement);
    camera.position.set(10, 15, -22);

    orbit.update();

    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        visible: false,
      }),
    );
    planeMesh.rotateX(-Math.PI / 2);
    scene.add(planeMesh);

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    const sphereGeometry = new THREE.SphereGeometry(0.5);
    const SM = new THREE.Mesh(sphereGeometry, normalMaterial);
    SM.position.x = 0;
    SM.position.y = 3;
    SM.position.z = 0;
    SM.castShadow = true;
    scene.add(SM);
    const sphereShape = new CANNON.Sphere(0.5);
    const sphereBody = new CANNON.Body({ mass: 1, velocity: new CANNON.Vec3(0, 0, -10) });
    sphereBody.addShape(sphereShape);
    sphereBody.position.x = SM.position.x;
    sphereBody.position.y = SM.position.y;
    sphereBody.position.z = SM.position.z;
    world.addBody(sphereBody);

    // const cubeGeometry2 = new THREE.BoxGeometry(5, 1, 1);
    // const cubeMesh2 = new THREE.Mesh(cubeGeometry2, normalMaterial);
    // cubeMesh2.position.x = 0;
    // cubeMesh2.position.y = 1;
    // cubeMesh2.position.z = 9;
    // cubeMesh2.castShadow = true;
    // scene.add(cubeMesh2);
    // const cubeShape2 = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5));
    // const cubeBody2 = new CANNON.Body({ mass: 0 });
    // cubeBody2.addShape(cubeShape2);
    // cubeBody2.position.x = cubeMesh2.position.x;
    // cubeBody2.position.y = cubeMesh2.position.y;
    // cubeBody2.position.z = cubeMesh2.position.z;
    // world.addBody(cubeBody2);
    // console.log(cubeGeometry2.parameters.height * cubeMesh2.scale.x);

	var Bumper_obj = function(posX, posY, posZ){
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
	}
	const Bumpers = [new Bumper_obj(0, 1, -9), new Bumper_obj(0, 1, 9)];
	scene.add(Bumpers[0].cubeMesh);
	world.addBody(Bumpers[0].cubeBody);
	scene.add(Bumpers[1].cubeMesh);
	world.addBody(Bumpers[1].cubeBody);

    // const cubeGeometry = new THREE.BoxGeometry(5, 1, 1);
    // const cubeMesh = new THREE.Mesh(cubeGeometry, normalMaterial);
    // cubeMesh.position.x = 0;
    // cubeMesh.position.y = 1;
    // cubeMesh.position.z = -9;
    // cubeMesh.castShadow = true;

    // const cubeShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5));
    // const cubeBody = new CANNON.Body({ mass: 0 });
    // cubeBody.addShape(cubeShape);
    // cubeBody.position.x = cubeMesh.position.x;
    // cubeBody.position.y = cubeMesh.position.y;
    // cubeBody.position.z = cubeMesh.position.z;



    // const playergeometry = new THREE.CylinderGeometry(1,1,3,32,1,false,0,Math.PI * 2);
    // const playerMesh = new THREE.Mesh(playergeometry, normalMaterial);
    // playerMesh.position.x = 3;
    // playerMesh.position.y = 3;
    // playerMesh.position.z = 2;
    // playerMesh.castShadow = true;
    // scene.add(playerMesh);
    const playerShape = new CANNON.Cylinder(1, 1, 3, 32);
    const playerBody = new CANNON.Body({ mass: 10 });
    playerBody.addShape(playerShape);
    playerBody.position.x = 3;
    playerBody.position.y = 3;
    playerBody.position.z = 3;
    world.addBody(playerBody);

	let axis = new CANNON.Vec3(0, 1, 0);
	let angle = -Math.PI / 2;

	var Wall_obj = function(posX, posY, posZ){
		this.wallGeometry = new THREE.BoxGeometry(20, 5, 1);
		this.wallMesh = new THREE.Mesh(this.wallGeometry, normalMaterial);
		this.wallMesh.position.x = posX;
		this.wallMesh.position.y = posY;
		this.wallMesh.position.z = posZ;
		this.wallShape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5));
		this.wallMesh.position.x = posX;
		this.wallMesh.position.y = posY;
		this.wallMesh.position.z = posZ;
		this.wallMesh.rotation.y = -Math.PI / 2;
		this.wallMesh.castShadow = true;
		this.wallBody = new CANNON.Body({ mass: 0 });
		this.wallBody.addShape(this.wallShape);
		this.wallBody.quaternion.setFromAxisAngle(axis, angle);
		this.wallBody.position.x = this.wallMesh.position.x;
		this.wallBody.position.y = this.wallMesh.position.y;
		this.wallBody.position.z = this.wallMesh.position.z;
		return this;
	}
	const Walls = [new Wall_obj(10, 2.5, 0), new Wall_obj(-10, 2.5, 0)];

	scene.add(Walls[0].wallMesh);
    world.addBody(Walls[0].wallBody);
	scene.add(Walls[1].wallMesh);
    world.addBody(Walls[1].wallBody);

    const phongMaterial = new THREE.MeshPhongMaterial();
    const planeGeometry = new THREE.PlaneGeometry(25, 25);
    const PM = new THREE.Mesh(planeGeometry, phongMaterial);
    PM.rotateX(-Math.PI / 2);
    PM.receiveShadow = true;
    scene.add(PM);
    const planeShape = new CANNON.Plane();
    const planeBody = new CANNON.Body({ mass: 0 });
    planeBody.addShape(planeShape);
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(planeBody);

    // const stats = new Stats()
    // document.body.appendChild(stats.dom)

    // const gui = new GUI()
    // const physicsFolder = gui.addFolder('Physics')
    // physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1)
    // physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1)
    // physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1)
    // physicsFolder.open()

    const clock = new THREE.Clock();
    let delta;

    // const grid = new THREE.GridHelper(20, 20);
    // scene.add(grid);

    // const highlightMesh = new THREE.Mesh(
    //   new THREE.PlaneGeometry(1, 1),
    //   new THREE.MeshBasicMaterial({
    //     side: THREE.DoubleSide,
    //     transparent: true
    //   })
    // );
    // highlightMesh.rotateX(-Math.PI / 2);
    // highlightMesh.position.set(0.5, 0, 0.5);
    // scene.add(highlightMesh);

    const mousePosition = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let intersects;

    let collided_cube = false;
    let collided_cube1 = false;
    let collided_cube2 = false;
    let collided_wall = false;

    sphereBody.addEventListener('collide', function (e) {
      collided_cube1 = e.body.id == Bumpers[0].cubeBody.id;
      collided_cube2 = e.body.id == Bumpers[1].cubeBody.id;
      collided_cube = collided_cube1 || collided_cube2;
      collided_wall = e.body.id == Walls[0].wallBody.id || e.body.id == Walls[1].wallBody.id;
    });

    // window.addEventListener('mousemove', function(e) {
    //   mousePosition.x = (e.clientX / rendererWidth) * 2 - 1;
    //   mousePosition.y = -(e.clientY / rendererHeight) * 2 + 1;
    //   raycaster.setFromCamera(mousePosition, camera);
    //   intersects = raycaster.intersectObject(planeMesh);
    //   if(intersects.length > 0) {
    //     const intersect = intersects[0];
    //     const highlightPos = new THREE.Vector3().copy(intersect.point).floor().addScalar(0.5);
    //     highlightMesh.position.set(highlightPos.x, 0, highlightPos.z);

    //     const objectExist = objects.find(function(object) {
    //       return (object.position.x === highlightMesh.position.x)
    //       && (object.position.z === highlightMesh.position.z)
    //     });

    //     if(!objectExist)
    //       highlightMesh.material.color.setHex(0xFFFFFF);
    //     else
    //       highlightMesh.material.color.setHex(0xFF0000);
    //   }
    // });

    const objects = [];
    let z_value = -15;
    let x_value = 0;
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
        // if (p2_score % 2 == 0)
        z_value = -10;
        // else
        //   z_value = -10;
      }
      if (last_score == 1) {
        // if (p1_score % 2 == 0)
        z_value = 10;
        // else
        // z_value = -10;
      }
      if (p1_score == 10 || p2_score == 10) {
        p1_score = 0;
        p2_score = 0;
      }
      x_value = 0;
      SM.position.x = 0;
      SM.position.y = 0.5;
      SM.position.z = 0;
      sphereBody.position.x = SM.position.x;
      sphereBody.position.y = SM.position.y;
      sphereBody.position.z = SM.position.z;
      // document.getElementById("divA").textContent ="P1 " + p1_score;
      // document.getElementById("divB").textContent ="P2 " + p2_score;
    }

	function animate2() {
		collided_cube = false;
		collided_wall = false;

		requestAnimationFrame(animate2);
		if (sphereBody.position.z >= 10) {
			// p1_score++;
			last_score = 1;
			reset();
		}
		if (sphereBody.position.z <= -10) {
			// p2_score++;
			last_score = 0;
			reset();
		}
		delta = Math.min(clock.getDelta(), 0.1);
		world.step(delta);
		// console.log(cubeBody.position)
		if (collided_cube == true) {
			let hit_pos;

			collided_cube2 == true
			? (hit_pos = get_coll_pos(Bumpers[1].cubeBody, Bumpers[1].cubeGeometry, SM))
			: (hit_pos = get_coll_pos(Bumpers[0].cubeBody, Bumpers[0].cubeGeometry, SM));
			collided_cube2 == true ? (z_value += 0.5) : (z_value -= 0.5);
			z_value *= -1;
			x_value = hit_pos_angle_calculator(hit_pos);
		}
		if (collided_wall == true) x_value *= -1;

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
		sphereBody.velocity.set(x_value * 0.3, -9, z_value);

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
		SM.position.set(sphereBody.position.x, sphereBody.position.y, sphereBody.position.z);
		SM.quaternion.set(
			sphereBody.quaternion.x,
			sphereBody.quaternion.y,
			sphereBody.quaternion.z,
			sphereBody.quaternion.w,
		);
		Bumpers[0].cubeMesh.position.set(Bumpers[0].cubeBody.position.x, Bumpers[0].cubeBody.position.y, Bumpers[0].cubeBody.position.z);
		Bumpers[0].cubeMesh.quaternion.set(
			Bumpers[0].cubeBody.quaternion.x,
			Bumpers[0].cubeBody.quaternion.y,
			Bumpers[0].cubeBody.quaternion.z,
			Bumpers[0].cubeBody.quaternion.w,
		);
		Bumpers[1].cubeMesh.position.set(Bumpers[1].cubeBody.position.x, Bumpers[1].cubeBody.position.y, Bumpers[1].cubeBody.position.z);
		Bumpers[1].cubeMesh.quaternion.set(
			Bumpers[1].cubeBody.quaternion.x,
			Bumpers[1].cubeBody.quaternion.y,
			Bumpers[1].cubeBody.quaternion.z,
			Bumpers[1].cubeBody.quaternion.w,
		);
		if (mixer) {
			mixer.update(delta);
		}
		renderer.render(scene, camera);
		input_manager();

      // stats.update()
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

customElements.define('app-game', Game);
