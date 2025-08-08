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

## Features

### Key Features

- **Real-time Multiplayer**: WebSocket-based game synchronization
- **Multi-factor Authentication**: Email-based verification system
- **OAuth 2.0 Integration**: Third-party authentication support
- **3D Gaming**: Hardware-accelerated 3D graphics with Three.js
- **Tournament System**: Bracket-based competitive play
- **Live Chat**: Real-time messaging with notifications

### Other Features

#### User management

- Secure registration with validation and connection using JWT
- User profile page including customizable avatar and Game stat (win/loss rate, duel history, Elo change chart, best/worst opponents)
- User blocking system
- Forgotten password reset functionality

#### Game

- Local game with AI opponent option
- Game customization
- Game worker: Background processing of game logic
- Matchmaking and Game invitation for Multiplayer Game

#### UI & Graphics

- Responsive design
- Two color themes: Light and Dark
- Google Chrome Compatibility
- Hand-made 3D models, animation and art!

#### DevOps and CD/CI

- Containerized environment using Docker
- Workflows and templated for issue/task creation


## Technologies

### Front-end

[![JavaScript](https://img.shields.io/badge/-Javascript-F7DF1E.svg?logo=javascript&style=for-the-badge&logoColor=000)](#)
[![Bootstrap](https://img.shields.io/badge/-Bootstrap-563D7C.svg?logo=bootstrap&style=for-the-badge&logoColor=fff)](#)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&style=for-the-badge&logoColor=fff)](#)

### Game

[![Three.js](https://img.shields.io/badge/Three.js-000?logo=threedotjs&style=for-the-badge&logoColor=fff)](#)
[![Blender](https://img.shields.io/badge/Blender-E87D0D.svg?logo=blender&style=for-the-badge&logoColor=fff)](#)

### UI design

[![Figma](https://img.shields.io/badge/-Figma-F24E1E.svg?logo=figma&style=for-the-badge&logoColor=fff)](#)

### Back-end

[![Django](https://img.shields.io/badge/Django-092E20?logo=django&style=for-the-badge&logoColor=fff)](#)
[![Django Ninja](https://img.shields.io/badge/DJANGO_Ninja-ff1709?style=for-the-badge&color=326342)](#)
[![Django Channels](https://img.shields.io/badge/DJANGO_Channels-ff1709?style=for-the-badge&color=326342)](#)
[![Cron](https://img.shields.io/badge/Cron_Job-4A4A4A?style=for-the-badge&logo=linux&logoColor=fff)](#)

### Data base

[![PostgreSQL](https://img.shields.io/badge/-Postgres-%23316192.svg?logo=postgresql&style=for-the-badge&logoColor=fff)](#)
[![Redis](https://img.shields.io/badge/-Redis-D82C20.svg?logo=redis&style=for-the-badge&logoColor=fff)](#)

### DevOps & CI/CD

[![Docker](https://img.shields.io/badge/-Docker-1488C6.svg?logo=docker&style=for-the-badge&logoColor=fff)](#)
[![Nginx](https://img.shields.io/badge/-Nginx-269539.svg?logo=nginx&style=for-the-badge&logoColor=fff)](#)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&style=for-the-badge&logoColor=fff)](#)

### Testing

[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&style=for-the-badge&logoColor=fff)](#)
[![Django Test Framework](https://img.shields.io/badge/Django%20Tests-092E20?logo=django&style=for-the-badge&logoColor=fff)](#)

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
    classDef frontend fill:#e1f5fe,color:#01579b
    classDef backend fill:#f3e5f5,color:#4a148c
    classDef database fill:#e8f5e9,color:#1b5e20
    classDef logs fill:#fce4ec,color:#880e4f
    classDef external fill:#fff3e0,color:#e65100

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


## Documentation 🛠️👷🏻‍♂️

### Front-end

- [Front-end overview](/doc/front/FRONTEND.md)
- [Web component](/doc/front/Component.md)
- [Router](doc/front/Router.md)
- [Auth manager](/doc/front/AUTH_MANAGER.md)
- [WebScoket manager](/doc/front/SocketManager.md)
- [Data visualization](/doc/front/DATA_VISUALIZATION.md)
- [Tournament UI](/doc/front/TOURNAMENT_UI.md)

### Server

- [Multi-factor authentication](/doc/server/MFA.md)
- [Remote Authentication (OAuth 2.0)](/doc/server/OAUTH2.md)
- [Live chat](/doc/server/CHAT.md)
- [Tournament system](/doc/server/TOURNAMENT.md)

### Protocol

- [Live chat modules (Chat, notifications, Game invitation)](/doc/protocol/LIVECHAT_MODULE_WS_PROTOCOL.md)
- [Tournament state](/doc/protocol/TOURNAMENT_WS_PROTOCOL.md)

### UI design

- [Wireframe and Mock-up design](https://www.figma.com/design/bIKKWAFQjcnPiEDc63jWa1/ft_transcendence?node-id=37-340&t=AJvSNhCCjxhZqsCV-1)

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
This project is for educational purposes only - not licensed for commercial use.
