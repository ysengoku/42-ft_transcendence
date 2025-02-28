import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer

"""
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
"""
class GameConsumer(AsyncWebsocketConsumer):
    def initialize_or_load_the_state(self):
        self.state = {
            "ball": {
                "x": 0,
                "y": 3,
                "z": 0,
            },

            "bumper_1": {
                "x": 0,
                "y": 1,
                "z": 9,
            },

            "bumper_2": {
                "x": 0,
                "y": 1,
                "z": -9,
            },

            "wall_left": {
                "x": 10,
                "y": 2.5,
                "z": 0,
            },

            "wall_right": {
                "x": -10,
                "y": 2.5,
                "z": 0,
            },
        }

    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)

        await self.accept()

        self.initialize_or_load_the_state()
        self.should_run = False
        await self.send(text_data=json.dumps({"state": self.state}))

    async def disconnect(self, close_code):
        self.should_run = False
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        await self.channel_layer.group_send(self.match_group_name, {"type": "match.command", "action": action})

    def calculate_sleeping_time(self):
        return 1

    async def match_command(self, event):
        action = event["action"]
        match action:
            case "start":
                if not self.should_run:
                    self.should_run = True
                    asyncio.create_task(self.timer())
            case "stop":
                self.should_run = False

    def update_the_state(self):
        self.state += 1

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"message": event["state"]}))

    async def game_tick(self):
        self.update_the_state()
        await self.channel_layer.group_send(
            self.match_group_name,
            {"type": "state_update", "state": self.state},
        )
