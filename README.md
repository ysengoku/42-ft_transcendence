# Peacemakers Ponggers Edition - ft_transcendence
🛠️👷🏻‍♂️ On working   
Real-time multiplayer PONG Game built as a Single Page Application, developed by five students during 42 school curriculum.
This project combines authentication, live gameplay, chat, and 3D rendering using modern web technologies.

![Peacemakers](./assets/PeaceMakers_cover.png)

## Usage
🛠️👷🏻‍♂️

## Features
🛠️👷🏻‍♂️
### User management
- Secure registration with validation and connection using JWT
- Remote Authentication (OAuth 2.0) with 42 and GitHub profiles
- Multi-factor authentication with code sent by email
- User profile page including customizable avatar and Game stat (win/loss rate, duel history, Elo change chart, best/worst opponents)

### Game
- Local game
- AI opponent
- Remote players
- Game customization
- Game worker
- 3D graphics and rendering

### Chat and WebSocket communication
- Direct messages one on one
- User blocking system
- Game invitation
- Notifications (new messgaes, new friends, game invitation, tournament related notifications) 

### Other
- Containerized environment using DOcker
- Responsive design
- Google Chrome Compatibility

## Technologies
🛠️👷🏻‍♂️
### Front-end
- Vanilla JavaScript
- Bootstrap
- WebSocket
- Vite
- Jest and Vitest (testing)

### Game
- Three.js
- Blender (3D modeling)

### Back-end
- Django
- Django Ninja for API
- Django Channel, WebSocket
- Redis
- Crontab

### Data base
- PostgreSQL

### DevOps
- Docker
- Nginx

### UI design
- Figma

## Documentation
🛠️👷🏻‍♂️
- Architecture
  
### Front-end
- [Web component](/doc/front/Component.md)
- [Router](doc/front/Router.md)
- [WebScoket manager](doc/front/SocketManager.md)
- [API request](doc/front/ApiRequest.md)
- [Components](/doc/front/components/)

### Server
- [Multi-factor authentication](/doc/server/DOC_mfa.md)
- [Remote Authentication (OAuth 2.0)](/doc/server/DOC_oauth2.md)

### Database

### Protocol
- [Live chat modules (Chat, notifications, Game invitation)](/doc/protocol/livechatModuleProtocol.md)


## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/emuminov">
        <img src="https://avatars.githubusercontent.com/emuminov" width="80px;" alt="emuminov"/><br />
        <sub><b>emuminov</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/melobern">
        <img src="https://avatars.githubusercontent.com/melobern" width="80px;" alt="melobern"/><br />
        <sub><b>melobern</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/faboussard">
        <img src="https://avatars.githubusercontent.com/faboussard" width="80px;" alt="Fanny_BOUSSARD"/><br />
        <sub><b>faboussard</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Celiastral">
        <img src="https://avatars.githubusercontent.com/Celiastral" width="80px;" alt="Celiastral"/><br />
        <sub><b>Celiastral</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ysengoku">
        <img src="https://avatars.githubusercontent.com/ysengoku" width="80px;" alt="Yuko SENGOKU"/><br />
        <sub><b>ysengoku</b></sub>
      </a>
    </td>
  </tr>
</table>

## License
This project is for educational purposes only — not licensed for commercial use.

