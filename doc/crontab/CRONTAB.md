# CRONTAB

Objective : detect inactive uses and set them offline.
The **Crontab** manages:

- Periodic execution of inactive user checks.
- Secure calls to the Django API : trigger the task via a cronjob running in a separate container.
- Handling Bearer token authentication for endpoint security.

---

## 1. Architecture \& Execution Flow

- The cronjob script runs in a **separate Docker container** from the Django backend.
- On every scheduled interval (every minute), the cronjob script performs A DELETE request to the `/api/cronjob/cron/check-inactive-users` endpoint, sending the required headers (`Authorization Bearer` token).
- The Django backend verifies the Bearer token and bypasses CSRF validation on this endpoint using the `@csrf_exempt` decorator.
- The business logic function `check_inactive_users()` is invoked :
  - Marks users without recent activity as inactive
  - Updates the database
  - Sends a ws message to active users, to change the online dot from green to gray.

---

## 2. Docker Container and Configuration

- The `crontab` service is defined in `docker-compose.yaml` with:
  - Volumes providing the Python script and dependencies (`/app/scripts`).
  - An environment variable to secure it: `CRON_SECRET`.
  - A shared Docker network allowing the cronjob container to reach the Django backend by its Docker service name.
- The cron script uses Python's `requests` library with `verify=False` to accept self-signed certificate.

---

## 3. Cronjob Script (`check_inactive_users_cron.py`)

### Initialization

- Checks that the script wasn't launched in the last 59 seconds.
- Reads environment variables from the container environment to set authentication secret.

### API DELETE Request

- Constructs headers including:
  - `Authorization: Bearer <CRON_SECRET>`
  - `Referer` set based on the base URL.
- Sends a DELETE request to `/api/cronjob/cron/check-inactive-users`.
- Outputs the HTTP status code (200 expected upon success).

---

## 4. Django Endpoint (`trigger_inactive_users_check`)

- Declared in Django Ninja with the `@csrf_exempt` decorator to avoid CSRF errors.
- Protected by custom authentication `CronAuth` validating the Bearer token.
- Calls the function `check_inactive_users()` which:
  - Computes inactivity cutoff times (30 minutes).
  - Updates user online status and active connection counters in the database.
  - Sends notifications of disconnections via Channels.

---

## 5. Security and Best Practices

- **CSRF:** The endpoint disables CSRF protection because security is enforced through the Bearer token.
- **Authentication:** The Bearer token (`CRON_SECRET`) authorizes the cronjob’s access to this endpoint.
- **Container Isolation:** Docker networking ensures secure communication between separated containers.
- **Logs:** The cronjob script logs HTTP status and messages to `/var/log/cron.log` for monitoring.

---

## 6. Summary of API Endpoints Used

| Endpoint                                 | Method | Authentication | CSRF Validation           | Description                                 |
| :--------------------------------------- | :----- | :------------- | :------------------------ | :------------------------------------------ |
| `/api/cronjob/cron/check-inactive-users` | DELETE | Bearer Token   | Disabled (`@csrf_exempt`) | Triggers check and update of inactive users |

---

## 7. Simplified Execution Example

1. The cron triggers the `check_inactive_users_cron.py` script.
2. The script fetches a CSRF token from `/api/cronjob/csrf-token`.
3. The script sends a DELETE request with Bearer token and CSRF token headers to `/api/cronjob/cron/check-inactive-users`.
4. The backend authenticates the request, skips CSRF validation, and updates the users accordingly.
5. The script logs the HTTP status code for confirmation.

---

<!-- OLD ONE -->

```mermaid
---
config:
  layout: dagre
  look: classic
  theme: base
  themeVariables:
    lineColor: '#f7230c'
    textColor: '#191919'
    fontSize: 15px
    nodeTextColor: '#000'
    edgeLabelBackground: '#fff'
---
flowchart TD
subgraph CRONJOB["CRONTAB"]
A["Cronjob script"]
T["Crontask"]
end
subgraph SERVER["SERVER"]
D["check_inactive_users()"]
E["Updates DB"]
end
subgraph FRONT["FRONT"]
W["Websocket"]
end
subgraph DOCKER_NETWORK["DOCKER_NETWORK"]
CRONJOB
B["Nginx"]
F["Sends ws message to online users"]
SERVER
FRONT
end
T -- "Triggers every minute" --> A
A -- "GET /api/cronjob/csrf-token" --> B
B --> SERVER
SERVER --> B
A -- "DELETE /api/cronjob/cron/check-inactive-users (Bearer)" --> B
D --> E
D --> F --> W

    style CRONJOB fill:#AA00FF
    style B fill:#00C853
    style SERVER fill:#2962FF
    style FRONT fill:#FF6D00
    style DOCKER_NETWORK fill:#BBDEFB
```

<!-- NEW ONE -->

```mermaid
---
config:
  layout: dagre
  look: classic
  theme: base
  themeVariables:
    lineColor: '#f7230c'
    textColor: '#191919'
    fontSize: 15px
    nodeTextColor: '#000'
    edgeLabelBackground: '#fff'
---
flowchart TD
subgraph CRONJOB["CRONTAB"]
A["Cronjob script"]
T["Crontask"]
end
subgraph SERVER["SERVER"]
D["check_inactive_users()"]
E["Updates DB"]
end
subgraph FRONT["FRONT"]
W["Websocket"]
end
subgraph DOCKER_NETWORK["DOCKER_NETWORK"]
CRONJOB
F["Sends ws message to online users"]
SERVER
FRONT
end
T -- "Triggers every minute" --> A
A -- "DELETE /api/cronjob/cron/check-inactive-users (Bearer)" --> SERVER
D --> E
D --> F --> W

    style CRONJOB fill:#AA00FF
    style SERVER fill:#2962FF
    style FRONT fill:#FF6D00
    style DOCKER_NETWORK fill:#BBDEFB
```
