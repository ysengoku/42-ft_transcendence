import * as THREE from 'three';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from '/node_modules/cannon-es/dist/cannon-es.js';
import Stats from '/node_modules/three/examples/jsm/libs/stats.module.js'
import { GUI } from '/node_modules/dat.gui/build/dat.gui.module.js'

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


const sphereGeometry = new THREE.SphereGeometry(0.5)
const SM = new THREE.Mesh(sphereGeometry, normalMaterial)
SM.position.x = 0;
SM.position.y = 3;
SM.position.z = 0;
SM.castShadow = true
scene.add(SM)
const sphereShape = new CANNON.Sphere(0.5)
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
const cubeBody2 = new CANNON.Body({ mass: 0  })
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
const cubeBody = new CANNON.Body({ mass: 0 })
cubeBody.addShape(cubeShape)
cubeBody.position.x = cubeMesh.position.x
cubeBody.position.y = cubeMesh.position.y
cubeBody.position.z = cubeMesh.position.z
world.addBody(cubeBody)

window.addEventListener("keydown", input_manager);
window.addEventListener("keydown", input_manager2);

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
let	collided_wall_p1 = false;
let	collided_wall_p2 = false;

sphereBody.addEventListener("collide",function(e){
	collided_cube = e.body.id == cubeBody.id || e.body.id == cubeBody2.id
	collided_wall = e.body.id == wallBody.id || e.body.id == wall2Body.id
});

cubeBody.addEventListener("collide",function(e){
	collided_wall_p1 = e.body.id == wallBody.id || e.body.id == wall2Body.id
});

cubeBody2.addEventListener("collide",function(e){
	collided_wall_p2 = e.body.id == wallBody.id || e.body.id == wall2Body.id
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

const objects = [];
let z_value = -10;
let x_value = 10;
let	p1_score = 0;
let	p2_score = 0;

function reset()
{
	SM.position.x = 0;
	SM.position.y = 0.5;
	SM.position.z = 0;
	sphereBody.position.x = SM.position.x;
	sphereBody.position.y = SM.position.y;
	sphereBody.position.z = SM.position.z;
	document.getElementById("divA").textContent ="P1 " + p1_score;
	document.getElementById("divB").textContent ="P2 " + p2_score;
	z_value *= -1;
}

function animate2()
{
	collided_cube = false;
	collided_wall = false;
	collided_wall_p2 = false;
	collided_wall_p1 = false;
	
	requestAnimationFrame(animate2)
	if (sphereBody.position.z >= 10)
	{
		p1_score++;
		reset();
	}
	if (sphereBody.position.z <= -10)
	{
		p2_score++;
		reset();
	}
	delta = Math.min(clock.getDelta(), 0.1)
	world.step(delta)
	console.log(cubeBody.position)
	if (collided_cube == true)
	{
		z_value *= -1;
	}
	if (collided_wall == true)
	{
		x_value *= -1;
	}
	if (cubeBody.position.x > 7)
	{
		cubeBody.position.x = 7;
		cubeMesh.position.x = 7;
	}
	if (cubeBody.position.x < -7)
	{
		cubeBody.position.x = -7;
		cubeMesh.position.x = -7;
	}
	if (cubeBody2.position.x > 7)
	{
		cubeBody2.position.x = 7;
		cubeMesh2.position.x = 7;
	}
	if (cubeBody2.position.x < -7)
	{
		cubeBody2.position.x = -7;
		cubeMesh2.position.x = -7;
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
	switch (event.key) {
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
	
		event.preventDefault();
}


window.addEventListener('resize', function() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
animate2()
