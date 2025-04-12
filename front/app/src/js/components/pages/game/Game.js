import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
// import * as CANNON from '/node_modules/cannon-es/dist/cannon-es.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import lilguy from '/3d_models/lilguy.glb?url';
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js';


export class Game extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  game() {
    var keyMap = [];
    const BUMPER_1 = 1
    const BUMPER_2 = 2
    const WALL_LEFT_X = 10;
    const WALL_RIGHT_X = -WALL_LEFT_X;
    const WALL_WIDTH_HALF = 0.5;
    const BUMPER_LENGTH_HALF = 2.5;
    const BUMPER_WIDTH = 1;
    const BUMPER_WIDTH_HALF = BUMPER_WIDTH / 2;
    const BUMPER_1_BORDER = -10;
    const BUMPER_2_BORDER = -BUMPER_1_BORDER;
    const BUMPER_SPEED = 0.25;
    const BALL_DIAMETER = 1;
    const BALL_RADIUS = BALL_DIAMETER / 2;
    // const STARTING_BUMPER_1_POS = 0, -9
    // const STARTING_BUMPER_2_POS = 0, 9
    // const STARTING_BALL_POS = 0, 0
    // const Z_VELOCITY = 0.25
    // const STARTING_BALL_VELOCITY = 0, Z_VELOCITY
    const SUBTICK = 0.05;
    const BOUNCING_ANGLE_DEGREES = 55;
    const BALL_VELOCITY_CAP = 1
    // const TEMPORAL_SPEED_DEFAULT = 1, 1
    const TEMPORAL_SPEED_INCREASE = SUBTICK * 0;
    const TEMPORAL_SPEED_DECAY = 0.005;



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

    // const world = new CANNON.World();
    // world.gravity.set(0, -9.82, 0);

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
			// this.sphereShape = new CANNON.Sphere(0.5);
			// this.sphereBody = new CANNON.Body({ mass: 1, velocity: new CANNON.Vec3(0, 0, -10) });
			// this.sphereBody.addShape(this.sphereShape);
            this.sphereUpdate = new THREE.Vector3(posX, posY, posZ);
			// this.sphereBody.position.x = this.sphereMesh.position.x;
			// this.sphereBody.position.y = this.sphereMesh.position.y;
			// this.sphereBody.position.z = this.sphereMesh.position.z;
            this.temporal_speed = new THREE.Vector3(1, 0, 1);
            this.velocity = new THREE.Vector3(0, 0, 0.25);
			scene.add(this.sphereMesh);
			// world.addBody(this.sphereBody);
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
            this.cubeUpdate = new THREE.Vector3(posX, posY, posZ);
            this.dir_z = -Math.sign(posZ);
            this.score = 0;
			scene.add(this.cubeMesh);
			// world.addBody(this.cubeBody);
			return this;
		}
	}
	const Bumpers = [new Bumper_obj(0, 1, -9), new Bumper_obj(0, 1, 9)];



    // const playerShape = new CANNON.Cylinder(1, 1, 3, 32);
    // const playerBody = new CANNON.Body({ mass: 10 });
    // playerBody.addShape(playerShape);
    // playerBody.position.x = 3;
    // playerBody.position.y = 3;
    // playerBody.position.z = 3;
    // world.addBody(playerBody);

	class Wall_obj {
		constructor(posX, posY, posZ){
			this.wallGeometry = new THREE.BoxGeometry(20, 5, 1);
			this.wallMesh = new THREE.Mesh(this.wallGeometry, normalMaterial);
			this.wallMesh.position.x = posX;
			this.wallMesh.position.y = posY;
			this.wallMesh.position.z = posZ;
			this.wallMesh.rotation.y = -Math.PI / 2;
			this.wallMesh.castShadow = true;
			// this.wallBody = new CANNON.Body({ mass: 0 });
			// this.wallShape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5));
			// this.wallBody.addShape(this.wallShape);
			// this.wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
			// this.wallBody.position.x = this.wallMesh.position.x;
			// this.wallBody.position.y = this.wallMesh.position.y;
			// this.wallBody.position.z = this.wallMesh.position.z;
			scene.add(this.wallMesh);
			// world.addBody(this.wallBody);
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
			// this.planeShape = new CANNON.Plane();
			// this.planeBody = new CANNON.Body({ mass: 0 });
			// this.planeBody.addShape(this.planeShape);
			// this.planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
			scene.add(this.planeMesh);
			// world.addBody(this.planeBody);
			return this;
		}
	}
	const Plane = new Plane_obj();

    const clock = new THREE.Clock();
    let delta;

    // let collided_cube = false;
    // let collided_cube1 = false;
    // let collided_cube2 = false;
    // let collided_wall = false;

    // Ball.sphereBody.addEventListener('collide', function (e) {
    //   collided_cube1 = e.body.id == Bumpers[0].cubeBody.id;
    //   collided_cube2 = e.body.id == Bumpers[1].cubeBody.id;
    //   collided_cube = collided_cube1 || collided_cube2;
    //   collided_wall = e.body.id == Walls[0].wallBody.id || e.body.id == Walls[1].wallBody.id;
    // });

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

    //     total_distance_x = abs((self.ball.temporal_speed.x) * self.ball.velocity.x)
    //     total_distance_z = abs((self.ball.temporal_speed.z) * self.ball.velocity.z)
    //     self.ball.temporal_speed.x = max(TEMPORAL_SPEED_DEFAULT[0], self.ball.temporal_speed.x - TEMPORAL_SPEED_DECAY)
    //     self.ball.temporal_speed.z = max(TEMPORAL_SPEED_DEFAULT[1], self.ball.temporal_speed.z - TEMPORAL_SPEED_DECAY)
    //     current_subtick = 0
    //     ball_subtick_z = SUBTICK
    //     total_subticks = total_distance_z / ball_subtick_z
    //     ball_subtick_x = total_distance_x / total_subticks
    //     bumper_subtick = BUMPER_SPEED / total_subticks
    //     while current_subtick <= total_subticks:
    //         if self.ball.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF:
    //             self.ball.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
    //             self.ball.velocity.x *= -1
    //         if self.ball.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF:
    //             self.ball.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
    //             self.ball.velocity.x *= -1

    //         if self.ball.velocity.z <= 0 and self.is_collided_with_ball(self.bumper_1, ball_subtick_z, ball_subtick_x):
    //             self.calculate_new_dir(self.bumper_1)
    //         elif self.ball.velocity.z > 0 and self.is_collided_with_ball(self.bumper_2, ball_subtick_z, ball_subtick_x):
    //             self.calculate_new_dir(self.bumper_2)

    //         if self.ball.z >= BUMPER_2_BORDER:
    //             self.bumper_1.score += 1
    //             self.reset_ball(-1)
    //             self.someone_scored = True
    //         elif self.ball.z <= BUMPER_1_BORDER:
    //             self.bumper_2.score += 1
    //             self.reset_ball(1)
    //             self.someone_scored = True

    //         if self.bumper_1.moves_left and not self.bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
    //             self.bumper_1.x += bumper_subtick
    //         if self.bumper_1.moves_right and not self.bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
    //             self.bumper_1.x -= bumper_subtick

    //         if self.bumper_2.moves_left and not self.bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
    //             self.bumper_2.x += bumper_subtick
    //         if self.bumper_2.moves_right and not self.bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
    //             self.bumper_2.x -= bumper_subtick

    //         self.ball.z += ball_subtick_z * self.ball.velocity.z
    //         self.ball.x += ball_subtick_x * self.ball.velocity.x
    //         current_subtick += 1

    function degrees_to_radians(degrees)
    {
    // Store the value of pi.
        var pi = Math.PI;
    // Multiply degrees by pi divided by 180 to convert to radians.
        return degrees * (pi/180);
    }
    
    function is_collided_with_ball(bumper, ball_subtick_z, ball_subtick_x) {
        return (
            (Ball.sphereUpdate.x - BALL_RADIUS + ball_subtick_x * Ball.velocity.x <= bumper.cubeUpdate.x + BUMPER_LENGTH_HALF)
            && (Ball.sphereUpdate.x + BALL_RADIUS + ball_subtick_x * Ball.velocity.x >= bumper.cubeUpdate.x - BUMPER_LENGTH_HALF)
            && (Ball.sphereUpdate.z - BALL_RADIUS + ball_subtick_z * Ball.velocity.z <= bumper.cubeUpdate.z + BUMPER_WIDTH_HALF)
            && (Ball.sphereUpdate.z + BALL_RADIUS + ball_subtick_z * Ball.velocity.z >= bumper.cubeUpdate.z - BUMPER_WIDTH_HALF));
    }

    function calculate_new_dir(bumper) {
        let collision_pos_x = bumper.cubeUpdate.x - Ball.sphereUpdate.x;
        let normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + BUMPER_LENGTH_HALF);
        let bounce_angle_radians = degrees_to_radians(BOUNCING_ANGLE_DEGREES * normalized_collision_pos_x);
        Ball.velocity.z = (Math.min(BALL_VELOCITY_CAP, Math.abs(Ball.velocity.z * 1.025 * Ball.temporal_speed.z)) * bumper.dir_z);
        Ball.velocity.x = Ball.velocity.z * -Math.tan(bounce_angle_radians) * bumper.dir_z;
        Ball.velocity.x = Math.max(Math.abs(Ball.velocity.x), 0.05) * Math.sign(Ball.velocity.x);

        let collision_pos_z = bumper.cubeUpdate.z - Ball.sphereUpdate.z
        let normalized_collision_pos_z = collision_pos_z / (BALL_RADIUS + BUMPER_WIDTH_HALF)
        normalized_collision_pos_z
        if ((Ball.sphereUpdate.z - BALL_RADIUS * Ball.velocity.z <= bumper.cubeUpdate.z + BUMPER_WIDTH_HALF) && (Ball.sphereUpdate.z + BALL_RADIUS * Ball.velocity.z >= bumper.cubeUpdate.z - BUMPER_WIDTH_HALF))
            Ball.temporal_speed.x += TEMPORAL_SPEED_INCREASE;
    }

    function reset_ball(direction) {
        Ball.temporal_speed.x = 1;
        Ball.temporal_speed.z = 1;
        Ball.sphereUpdate.x = 0;
        Ball.sphereUpdate.z = 0;
        Ball.velocity.x = 0;
        Ball.velocity.z = 0.25;
        Ball.velocity.z *= direction;
    }
    
    // self.bumper_1 = () => {
        //     // *STARTING_BUMPER_1_POS,
        //     score=0,
        //     moves_left=False,
        //     moves_right=False,
        //     dir_z=1,
        //     user_id="",
        //     player_id="",
        // };
        // self.bumper_2 = Bumper(
    //     // *STARTING_BUMPER_2_POS,
    //     score=0,
    //     moves_left=False,
    //     moves_right=False,
    //     dir_z=-1,
    //     user_id="",
    //     player_id="",
    // )
    // self.ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))
    // scored_last = BUMPER_1;
    let someone_scored = false;
	function animate2() {
        requestAnimationFrame(animate2);
        
        let total_distance_x = Math.abs((Ball.temporal_speed.x) * Ball.velocity.x);
        let total_distance_z = Math.abs((Ball.temporal_speed.z) * Ball.velocity.z);
        Ball.temporal_speed.x = Math.max(1, Ball.temporal_speed.x - TEMPORAL_SPEED_DECAY);
        Ball.temporal_speed.z = Math.max(1, Ball.temporal_speed.z - TEMPORAL_SPEED_DECAY);
        let current_subtick = 0;
        let ball_subtick_z = SUBTICK;
        let total_subticks = total_distance_z / ball_subtick_z;
        let ball_subtick_x = total_distance_x / total_subticks;
        let bumper_subtick = BUMPER_SPEED / total_subticks;
        while (current_subtick <= total_subticks) {
            if (Ball.sphereUpdate.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF) {
                Ball.sphereUpdate.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF;
                Ball.velocity.x *= -1;
            }
            if (Ball.sphereUpdate.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF) {
                Ball.sphereUpdate.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF;
                Ball.velocity.x *= -1;
            }
            if (Ball.velocity.z <= 0 && is_collided_with_ball(Bumpers[0], ball_subtick_z, ball_subtick_x))
            {
                console.log("oui");
                calculate_new_dir(Bumpers[0]);

            }
            else if (Ball.velocity.z > 0 && is_collided_with_ball(Bumpers[1], ball_subtick_z, ball_subtick_x))
            {
                console.log("oui");
                calculate_new_dir(Bumpers[1]);
            }

            if (Ball.sphereUpdate.z >= BUMPER_2_BORDER) {
                Bumpers[0].score++;
                reset_ball(-1);
                someone_scored = true;
            }
            else if (Ball.sphereUpdate.z <= BUMPER_1_BORDER) {
                Bumpers[1].score++;
                reset_ball(1);
                someone_scored = true;
            }

            if (keyMap['ArrowLeft'] == true && !(Bumpers[0].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF))
                Bumpers[0].cubeUpdate.x += bumper_subtick;
            if (keyMap['ArrowRight'] == true && !(Bumpers[0].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF))
                Bumpers[0].cubeUpdate.x -= bumper_subtick;

            if (keyMap['q'] == true && !(Bumpers[1].cubeUpdate.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF))
                Bumpers[1].cubeUpdate.x += bumper_subtick;
            if (keyMap['d'] == true && !(Bumpers[1].cubeUpdate.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF))
                Bumpers[1].cubeUpdate.x -= bumper_subtick;

            Ball.sphereUpdate.z += ball_subtick_z * Ball.velocity.z;
            Ball.sphereUpdate.x += ball_subtick_x * Ball.velocity.x;
            current_subtick++;
        }
        
		// collided_cube = false;
		// collided_wall = false;
        Ball.sphereMesh.position.set(Ball.sphereUpdate.x, 1, Ball.sphereUpdate.z);
        Bumpers[0].cubeMesh.position.set(Bumpers[0].cubeUpdate.x, Bumpers[0].cubeUpdate.y, Bumpers[0].cubeUpdate.z);
        Bumpers[1].cubeMesh.position.set(Bumpers[1].cubeUpdate.x, Bumpers[1].cubeUpdate.y, Bumpers[1].cubeUpdate.z);
		// if (Ball.sphereBody.position.z >= 10) {
		// 	p1_score++;
		// 	last_score = 1;
		// 	reset();
		// }
		// if (Ball.sphereBody.position.z <= -10) {
		// 	p2_score++;
		// 	last_score = 0;
		// 	reset();
		// }
		// delta = Math.min(clock.getDelta(), 0.1);
		// world.step(delta);

		// if (collided_cube == true) {
		// 	let hit_pos;

		// 	collided_cube2 == true
		// 	? (hit_pos = get_coll_pos(Bumpers[1].cubeBody, Bumpers[1].cubeGeometry, Ball.sphereMesh))
		// 	: (hit_pos = get_coll_pos(Bumpers[0].cubeBody, Bumpers[0].cubeGeometry, Ball.sphereMesh));
		// 	if (Ball.z_value < 30 && Ball.z_value > -30)
		// 		collided_cube2 == true ? (Ball.z_value += 0.5) : (Ball.z_value -= 0.5);
		// 	Ball.z_value *= -1;
		// 	Ball.x_value = hit_pos_angle_calculator(hit_pos);
		// }
		// if (collided_wall == true) Ball.x_value *= -1;

		// for (let i = 0; i < 2; i++)
		// {
		// 	if (Bumpers[i].cubeBody.position.x > 7) {
		// 		Bumpers[i].cubeBody.position.x = 7;
		// 		Bumpers[i].cubeMesh.position.x = 7;
		// 	}
		// 	if (Bumpers[i].cubeBody.position.x < -7) {
		// 		Bumpers[i].cubeBody.position.x = -7;
		// 		Bumpers[i].cubeMesh.position.x = -7;
		// 	}
		// }
		// Ball.sphereBody.velocity.set(Ball.x_value * 0.3, -9, Ball.z_value);

		// // Copy coordinates from Cannon to Three.js
		// // playerMesh.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z)
		// playerglb.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z);
		// // playerMesh.quaternion.set(playerBody.quaternion.x, playerBody.quaternion.y, playerBody.quaternion.z, playerBody.quaternion.w)
		// playerglb.quaternion.set(
		// 	playerBody.quaternion.x,
		// 	playerBody.quaternion.y,
		// 	playerBody.quaternion.z,
		// 	playerBody.quaternion.w,
		// );
		// Ball.sphereMesh.position.set(Ball.sphereBody.position.x, Ball.sphereBody.position.y, Ball.sphereBody.position.z);
		// Ball.sphereMesh.quaternion.set(
		// 	Ball.sphereBody.quaternion.x,
		// 	Ball.sphereBody.quaternion.y,
		// 	Ball.sphereBody.quaternion.z,
		// 	Ball.sphereBody.quaternion.w,
		// );
		// for (let i = 0; i < 2; i++)
		// {
		// 	Bumpers[i].cubeMesh.position.set(Bumpers[i].cubeBody.position.x, Bumpers[i].cubeBody.position.y, Bumpers[i].cubeBody.position.z);
		// 	Bumpers[i].cubeMesh.quaternion.set(
		// 		Bumpers[i].cubeBody.quaternion.x,
		// 		Bumpers[i].cubeBody.quaternion.y,
		// 		Bumpers[i].cubeBody.quaternion.z,
		// 		Bumpers[i].cubeBody.quaternion.w,
		// 	);
		// }
		if (mixer) {
			mixer.update(delta);
		}
		renderer.render(scene, camera);
		// input_manager();
    }

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
      if (keyMap['ArrowLeft'] == true) Bumpers[0].cubeMesh.position.x += 0.25;
      if (keyMap['ArrowRight'] == true) Bumpers[0].cubeMesh.position.x -= 0.25;
      if (keyMap['q'] == true) Bumpers[1].cubeMesh.position.x += 0.25;
      if (keyMap['d'] == true) Bumpers[1].cubeMesh.position.x -= 0.25;
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
