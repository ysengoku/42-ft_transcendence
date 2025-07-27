![Peacemakers](./assets/peacemakers-cover.jpg)

<div align="center">
  <img src="https://img.shields.io/github/commit-activity/t/ysengoku/42-ft_transcendence?style=flat-square&color=9D9E0A" />
  <img src="https://img.shields.io/github/created-at/ysengoku/42-ft_transcendence?style=flat-square" />
  <img src="https://img.shields.io/github/issues/ysengoku/42-ft_transcendence?style=flat-square&color=9D9E0A" />
  <img src="https://img.shields.io/github/languages/count/ysengoku/42-ft_transcendence?style=flat-square&color=9D9E0A" />
  <img src="https://img.shields.io/github/languages/code-size/ysengoku/42-ft_transcendence?style=flat-square&color=9D9E0A" />
  <br>
  
  <img alt="Contributors" src="https://img.shields.io/github/contributors/ysengoku/42-ft_transcendence?style=social" />
  &nbsp
  <img alt="GitHub stars" src="https://img.shields.io/github/stars/ysengoku/42-ft_transcendence?style=social">
</div>
<br>

Real-time multiplayer PONG Game built as a Single Page Application, developed by five students during 42 school curriculum.
This project combines authentication, live gameplay, chat, and 3D rendering using modern web technologies.   
   
## Demo video 🛠️👷🏻‍♂️

## Usage 🛠️👷🏻‍♂️

## Features 🛠️👷🏻‍♂️

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

- Containerized environment using Docker
- Responsive design
- Two color themes: Light and Dark
- Google Chrome Compatibility
- Hand-made 3D models, animation and art!
- Forgotten password reset functionality
- Workflows and templated for issue/task creation

## Technologies 🛠️👷🏻‍♂️


### Front-end

[![JavaScript](https://img.shields.io/badge/-Javascript-F7DF1E.svg?logo=javascript&style=for-the-badge&logoColor=000)](#)
[![Bootstrap](https://img.shields.io/badge/-Bootstrap-563D7C.svg?logo=bootstrap&style=for-the-badge&logoColor=fff)](#)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&style=for-the-badge&logoColor=fff)](#)
- Vanilla JavaScript
- Bootstrap
- WebSocket
- Vite

### Game

[![Three.js](https://img.shields.io/badge/Three.js-000?logo=threedotjs&style=for-the-badge&logoColor=fff)](#)
[![Blender](https://img.shields.io/badge/Blender-%23F5792A.svg?logo=blender&style=for-the-badge&logoColor=fff)](#)
- Three.js
- Blender (3D modeling)

### Back-end

[![Django](https://img.shields.io/badge/-Django-092E20.svg?logo=django&style=for-the-badge&logoColor=fff)](#)
[![Redis](https://img.shields.io/badge/-Redis-D82C20.svg?logo=redis&style=for-the-badge&logoColor=fff)](#)
- Django
- Django Ninja for API
- Django Channel, WebSocket
- Redis
- Crontab

### Data base

[![PostgreSQL](https://img.shields.io/badge/-Postgres-%23316192.svg?logo=postgresql&style=for-the-badge&logoColor=fff)](#)
- PostgreSQL

### DevOps & CI/CD

[![Docker](https://img.shields.io/badge/-Docker-1488C6.svg?logo=docker&style=for-the-badge&logoColor=fff)](#)
[![Nginx](https://img.shields.io/badge/-Nginx-269539.svg?logo=nginx&style=for-the-badge&logoColor=fff)](#)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&style=for-the-badge&logoColor=fff)](#)
- Docker
- Nginx

### Testing

- Jest
- Vitest
- pytest

### UI design

[![Figma](https://img.shields.io/badge/-Figma-F24E1E.svg?logo=figma&style=for-the-badge&logoColor=fff)](#)
- Figma

## Documentation 🛠️👷🏻‍♂️

## Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        UI[Frontend SPA<br/>Vanilla JS + Bootstrap]
        WS_CLIENT[WebSocket Client]
        GAME_ENGINE[3D Game Engine<br/>Three.js]
    end

    subgraph "Load Balancer"
        NGINX[Nginx<br/>Reverse Proxy<br/>Static Files]
    end

    subgraph "Application Server"
        DJANGO[Django Application<br/>Django Ninja API]
        WS_SERVER[WebSocket Server<br/>Django Channels]
        CRON[Crontab<br/>Background Tasks]
    end

    subgraph "Data Layer"
        POSTGRES[PostgreSQL<br/>Primary Database]
        REDIS[Redis<br/>WebSocket Sessions<br/>Pubsub]
    end

    subgraph "External Services"
        GITHUB[GitHub OAuth]
        FORTYTWO[42 School OAuth]
        GMAIL[Gmail SMTP<br/>MFA Emails]
    end

    %% Client connections
    UI --> NGINX
    WS_CLIENT -.->|WebSocket| NGINX
    GAME_ENGINE --> UI

    %% Load balancer routing
    NGINX --> DJANGO
    NGINX -.->|WebSocket Upgrade| WS_SERVER

    %% Application layer
    DJANGO --> POSTGRES
    DJANGO --> REDIS
    WS_SERVER --> REDIS
    CRON --> POSTGRES

    %% External integrations
    DJANGO --> GITHUB
    DJANGO --> FORTYTWO
    DJANGO --> GMAIL

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef logs fill:#fce4ec

    class UI,WS_CLIENT,GAME_ENGINE frontend
    class NGINX,DJANGO,WS_SERVER,CRON backend
    class POSTGRES,REDIS database
    class GITHUB,FORTYTWO,GMAIL external
```

### Component Responsibilities

#### Frontend Layer
- **SPA (Single Page Application)**: Vanilla JavaScript with component-based architecture
- **WebSocket Client**: Real-time communication for chat, notifications, and game state
- **3D Game Engine**: Three.js for rendering

#### Infrastructure Layer
- **Nginx**: Load balancing, static file serving, WebSocket proxy
- **Docker**: Containerized architecture

#### Application Layer
- **Django API**: RESTful API with Django Ninja, JWT authentication
- **WebSocket Server**: Django Channels for real-time features
- **Background Tasks**: Crontab for scheduled operations

#### Data Layer
- **PostgreSQL**: Primary database for user data, game records, chat history
- **Redis**: WebSocket session management, pub/sub messaging

#### External Integrations
- **OAuth Providers**: GitHub and 42 School for third-party authentication
- **Email Service**: Gmail SMTP for MFA verification codes

### Key Features
- **Real-time Multiplayer**: WebSocket-based game synchronization
- **Multi-factor Authentication**: Email-based verification system
- **OAuth 2.0 Integration**: Third-party authentication support
- **3D Gaming**: Hardware-accelerated 3D graphics with Three.js
- **Tournament System**: Bracket-based competitive play
- **Live Chat**: Real-time messaging with notifications

### Front-end

- [Web component](/doc/front/Component.md)
- [Router](doc/front/Router.md)
- [WebScoket manager](doc/front/SocketManager.md)
- [API request](doc/front/ApiRequest.md)
- [Components](/doc/front/components/)

### Server

- [Multi-factor authentication](/doc/server/MFA.md)
- [Remote Authentication (OAuth 2.0)](/doc/server/OAUTH2.md)

### Database

### Protocol

- [Live chat modules (Chat, notifications, Game invitation)](/doc/protocol/livechatModuleProtocol.md)

### UI design

- [Wireframe and Mock-up design](https://www.figma.com/design/bIKKWAFQjcnPiEDc63jWa1/ft_transcendence?node-id=1067-3755&p=f&t=DtKd9eHDPjN8xQfA-0)

## 👥 Contributors

<!--
<a href="https://github.com/ysengoku/42-ft_transcendence/graphs/contributors?anon=1">
  <img src="https://contrib.rocks/image?repo=ysengoku/42-ft_transcendence" />
</a>


Made with [contrib.rocks](https://contrib.rocks)
-->

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
This project is for educational purposes only - not licensed for commercial use.
