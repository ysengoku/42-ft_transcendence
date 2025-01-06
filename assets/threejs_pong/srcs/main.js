import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from '/node_modules/cannon-es/dist/cannon-es.js';
import Stats from '/node_modules/three/examples/jsm/libs/stats.module.js'
import { GUI } from '/node_modules/dat.gui/build/dat.gui.module.js'

// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
window.addEventListener("keydown", input_manager, true);
window.addEventListener("keydown", input_manager2, true);
// const renderer = new THREE.WebGLRenderer();
// renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setAnimationLoop( animate );
// // const orbit = new OrbitControls(camera, renderer.domElement);
// // camera.position.set(10, 15, -22);
// document.body.appendChild( renderer.domElement );
// // orbit.update();

// const geometry = new THREE.BoxGeometry( 3, 0.5, 0 );
// const geometry2 = new THREE.CircleGeometry(0.3, 32, 0, Math.PI * 2);
// const material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF } );
// const ax = new THREE.AxesHelper(1);
// const gridHelper = new THREE.GridHelper( 10, 10 );
// scene.add( gridHelper );
// gridHelper.rotateX(90);
// const cube = new THREE.Mesh( geometry, material );
// scene.add(ax);
// scene.add( cube );
// const cube2 = new THREE.Mesh( geometry, material );
// const circle1 = new THREE.Mesh( geometry2, material );

// scene.add( cube2 );
// scene.add( circle1 );

// camera.position.z = 5;

// cube.position.y = 3.5;
// cube2.position.y = -3.5;
// // circle1.position.y = 0.5;



// gridHelper.rotateX(Math.PI);
// let i = 0.01;

// function animate() {

// 	// cube.rotation.x += 0.01;
// 	// cube.rotation.y += 0.01;
// 	let wall_normal = new THREE.Vector2(0, 0);
// 	if (!(circle1.position.x > (7.4) || circle1.position.x < -(7.4)))
// 		circle1.position.x += 0.1;
// 	else
// 	{
// 		wall_normal = circle1.position;

// 	}
// 	if (!(circle1.position.y > (3.2) || circle1.position.y < -(3.2)))
// 		circle1.position.y += 0.01;
// 	else
// 	{
		
// 	}
// 	//		0,6.4 -> 0,-6.4
// 	// if (!(circle1.position.y > (3.5) || circle1.position.y < -(3.5)))
// 	// 	circle1.position.y += 0.01;

// 	renderer.render( scene, camera );


// }


const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene();


const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	2000
);

const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(10, 15, -22);

orbit.update();

const planeMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(20, 20),
	new THREE.MeshBasicMaterial({
		side: THREE.DoubleSide,
		visible: false
	})
);
planeMesh.rotateX(-Math.PI / 2);
scene.add(planeMesh);
const normalMaterial = new THREE.MeshNormalMaterial()
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)


const sphereGeometry = new THREE.SphereGeometry()
const SM = new THREE.Mesh(sphereGeometry, normalMaterial)
SM.position.x = 0;
SM.position.y = 3;
SM.position.z = 0;
SM.castShadow = true
scene.add(SM)
const sphereShape = new CANNON.Sphere(1)
const sphereBody = new CANNON.Body({ mass: 1 , velocity: new CANNON.Vec3(0, 0, -10)})
sphereBody.addShape(sphereShape)
sphereBody.position.x = SM.position.x
sphereBody.position.y = SM.position.y
sphereBody.position.z = SM.position.z
world.addBody(sphereBody)

const cubeGeometry2 = new THREE.BoxGeometry(5, 1, 1)
const cubeMesh2 = new THREE.Mesh(cubeGeometry2, normalMaterial)
cubeMesh2.position.x = 0;
cubeMesh2.position.y = 1;
cubeMesh2.position.z = 9;
cubeMesh2.castShadow = true
scene.add(cubeMesh2)
const cubeShape2 = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5))
const cubeBody2 = new CANNON.Body({ mass: 1000 })
cubeBody2.addShape(cubeShape2)
cubeBody2.position.x = cubeMesh2.position.x
cubeBody2.position.y = cubeMesh2.position.y
cubeBody2.position.z = cubeMesh2.position.z
world.addBody(cubeBody2)

const cubeGeometry = new THREE.BoxGeometry(5, 1, 1)
const cubeMesh = new THREE.Mesh(cubeGeometry, normalMaterial)
cubeMesh.position.x = 0;
cubeMesh.position.y = 1;
cubeMesh.position.z = -9;
cubeMesh.castShadow = true
scene.add(cubeMesh)
const cubeShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 0.5))
const cubeBody = new CANNON.Body({ mass: 1000 })
cubeBody.addShape(cubeShape)
cubeBody.position.x = cubeMesh.position.x
cubeBody.position.y = cubeMesh.position.y
cubeBody.position.z = cubeMesh.position.z
world.addBody(cubeBody)

var axis = new CANNON.Vec3(0,1,0);
var angle = -Math.PI / 2;
const wallGeometry = new THREE.BoxGeometry(20, 5, 1)
const wallMesh = new THREE.Mesh(wallGeometry, normalMaterial)
wallMesh.position.x = 10;
wallMesh.position.y = 2.5;
wallMesh.position.z = 0;
wallMesh.rotation.y = -Math.PI / 2;
wallMesh.castShadow = true
scene.add(wallMesh)
const wallShape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5))
const wallBody = new CANNON.Body({ mass: 0 })
wallBody.addShape(wallShape)
wallBody.quaternion.setFromAxisAngle(axis, angle);
wallBody.position.x = wallMesh.position.x
wallBody.position.y = wallMesh.position.y
wallBody.position.z = wallMesh.position.z
world.addBody(wallBody)


var axis = new CANNON.Vec3(0,1,0);
var angle = -Math.PI / 2;
const wall2Geometry = new THREE.BoxGeometry(20, 5, 1)
const wall2Mesh = new THREE.Mesh(wall2Geometry, normalMaterial)
wall2Mesh.position.x = -10;
wall2Mesh.position.y = 2.5;
wall2Mesh.position.z = 0;
wall2Mesh.rotation.y = -Math.PI / 2;
wall2Mesh.castShadow = true
scene.add(wall2Mesh)
const wall2Shape = new CANNON.Box(new CANNON.Vec3(10, 2.5, 0.5))
const wall2Body = new CANNON.Body({ mass: 0 })
wall2Body.addShape(wall2Shape)
wall2Body.quaternion.setFromAxisAngle(axis, angle);
wall2Body.position.x = wall2Mesh.position.x
wall2Body.position.y = wall2Mesh.position.y
wall2Body.position.z = wall2Mesh.position.z
world.addBody(wall2Body)

const phongMaterial = new THREE.MeshPhongMaterial()
const planeGeometry = new THREE.PlaneGeometry(25, 25)
const PM = new THREE.Mesh(planeGeometry, phongMaterial)
PM.rotateX(-Math.PI / 2)
PM.receiveShadow = true
scene.add(PM)
const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({ mass: 0 })
planeBody.addShape(planeShape)
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(planeBody)

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
const physicsFolder = gui.addFolder('Physics')
physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1)
physicsFolder.open()

const clock = new THREE.Clock()
let delta



const grid = new THREE.GridHelper(20, 20);
scene.add(grid);

const highlightMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(1, 1),
	new THREE.MeshBasicMaterial({
		side: THREE.DoubleSide,
		transparent: true
	})
);
highlightMesh.rotateX(-Math.PI / 2);
highlightMesh.position.set(0.5, 0, 0.5);
scene.add(highlightMesh);

const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let intersects;

let collided_cube = false
let collided_wall = false

sphereBody.addEventListener("collide",function(e){
	collided_cube = e.body.id == cubeBody.id || e.body.id == cubeBody2.id
	collided_wall = e.body.id == wallBody.id || e.body.id == wall2Body.id
});

window.addEventListener('mousemove', function(e) {
	mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
	mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(mousePosition, camera);
	intersects = raycaster.intersectObject(planeMesh);
	if(intersects.length > 0) {
		const intersect = intersects[0];
		const highlightPos = new THREE.Vector3().copy(intersect.point).floor().addScalar(0.5);
		highlightMesh.position.set(highlightPos.x, 0, highlightPos.z);

		const objectExist = objects.find(function(object) {
			return (object.position.x === highlightMesh.position.x)
			&& (object.position.z === highlightMesh.position.z)
		});

		if(!objectExist)
			highlightMesh.material.color.setHex(0xFFFFFF);
		else
			highlightMesh.material.color.setHex(0xFF0000);
	}
});

// const sphereMesh = new THREE.Mesh(
// 	new THREE.SphereGeometry(0.4, 4, 2),
// 	new THREE.MeshBasicMaterial({
// 		wireframe: true,
// 		color: 0xFFEA00
// 	})
// );

const objects = [];
let z_value = -10;
let x_value = 10;
// console.log(sphereBody)

function animate2()
{
	collided_cube = false
	collided_wall = false
	
	requestAnimationFrame(animate2)

	//delta = clock.getDelta()
	delta = Math.min(clock.getDelta(), 0.1)
	world.step(delta)
	if (collided_cube == true)
	{
		z_value *= -1;
	}
	if (collided_wall == true)
	{
		x_value *= -1;
	}
	sphereBody.velocity.set(x_value * 0.1, -9, z_value)

	// Copy coordinates from Cannon to Three.js
	SM.position.set(sphereBody.position.x, sphereBody.position.y, sphereBody.position.z)
	SM.quaternion.set(sphereBody.quaternion.x, sphereBody.quaternion.y, sphereBody.quaternion.z, sphereBody.quaternion.w)
	cubeMesh.position.set(cubeBody.position.x, cubeBody.position.y, cubeBody.position.z)
	cubeMesh.quaternion.set(cubeBody.quaternion.x, cubeBody.quaternion.y, cubeBody.quaternion.z, cubeBody.quaternion.w)
	cubeMesh2.position.set(cubeBody2.position.x, cubeBody2.position.y, cubeBody2.position.z)
	cubeMesh2.quaternion.set(cubeBody2.quaternion.x, cubeBody2.quaternion.y, cubeBody2.quaternion.z, cubeBody2.quaternion.w)
	renderer.render(scene, camera)

	stats.update()
}

function input_manager2(event)
{
	if (event.defaultPrevented) {
		return; // Do nothing if the event was already processed
	}
	switch (event.key) {
		case "q":
			cubeBody2.position.x += 0.5
			// code for "left arrow" key press.
			break;
		case "d":
			cubeBody2.position.x -= 0.5
			// code for "right arrow" key press.
			break;
		default:
			return; // Quit when this doesn't handle the key event.
		}
	event.preventDefault();
}

function input_manager(event) 
{
	if (event.defaultPrevented) {
		return; // Do nothing if the event was already processed
	}
	// switch (event.key) {
	// 	case "Q":
	// 		cubeBody.position.x += 0.5
	// 		// code for "left arrow" key press.
	// 		break;
	// 	case "D":
	// 		cubeBody.position.x -= 0.5
	// 		// code for "right arrow" key press.
	// 		break;
	// 	default:
	// 		return; // Quit when this doesn't handle the key event.
	// 	}
	switch (event.key) {
		// case "ArrowDown":
			
		// 	// code for "down arrow" key press.
		// 	break;
		// case "ArrowUp":
		// 	// code for "up arrow" key press.
		// 	break;
		case "ArrowLeft":
			cubeBody.position.x += 0.5
			// code for "left arrow" key press.
			break;
		case "ArrowRight":
			cubeBody.position.x -= 0.5
			// code for "right arrow" key press.
			break;
		default:
			return; // Quit when this doesn't handle the key event.
		}
	
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
}


window.addEventListener('resize', function() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
animate2()
