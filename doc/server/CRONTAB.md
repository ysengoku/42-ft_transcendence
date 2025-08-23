# CRONTAB

The Crontab service detects inactive users and updates their status to offline.  
It manages:
- Periodic execution of inactive user checks.
- Secure calls to the Django API : trigger the task via a cronjob running in a separate container.
- Handling Bearer token authentication for endpoint security.
<br />

## Architecture \& Execution Flow

- The cronjob script runs in a **separate Docker container** from the Django backend layer.
- On every scheduled interval (every minute), the cronjob script performs:
  - A GET request to fetch a CSRF token from the `/api/cronjob/csrf-token` endpoint.
  - A DELETE request to the `/api/cronjob/cron/check-inactive-users` endpoint, sending the required headers (`Authorization Bearer` token and `X-CSRFToken`).
- The Django backend layer, secured with HTTPS through Nginx, verifies the Bearer token and bypasses CSRF validation on this endpoint using the `@csrf_exempt` decorator.
- The business logic function `check_inactive_users()` is invoked :
  - Marks users without recent activity as inactive
  - Updates the database
  - Sends a ws message to active users.

<br />

## Docker Container and Configuration

- The `crontab` service is defined in `docker-compose.yaml` with:
  - Volumes providing the Python script and dependencies (`/app/scripts`).
  - An environment variable to secure it: `CRON_SECRET`.
  - A shared Docker network allowing the cronjob container to reach the Django backend layer by its Docker service name.
- The cron script uses Python's `requests` library with `verify=False` to accept self-signed certificate.

<br />

## Cronjob Script (`check_inactive_users_cron.py`)

### Initialization

- Checks that the script wasn't launched in the last 59 seconds.
- Reads environment variables from the container environment to set authentication secret.

### API DELETE Request

- Constructs headers including:
  - `Authorization: Bearer <CRON_SECRET>`
  - `Referer` set based on the base URL.
- Sends a DELETE request to `/api/cronjob/cron/check-inactive-users`.
- Outputs the HTTP status code (200 expected upon success).

<br />

## Django Endpoint (`trigger_inactive_users_check`)

- Declared in Django Ninja with the `@csrf_exempt` decorator to avoid CSRF errors.
- Protected by custom authentication `CronAuth` validating the Bearer token.
- Calls the function `check_inactive_users()` which:
  - Computes inactivity cutoff times (30 minutes).
  - Updates user online status and active connection counters in the database.
  - Sends notifications of disconnections via Channels.

<br />

## Security and Best Practices

- **Authentication:** The Bearer token (`CRON_SECRET`) authorizes the cronjob’s access to this endpoint.
- **Container Isolation:** Docker networking ensures secure communication between separated containers.
- **Monitoring:** The cronjob logs request results to `/var/log/cron.log`.

<br />

## Summary of API Endpoints Used

| Endpoint                                 | Method | Authentication | CSRF Validation           | Description                                 |
| :--------------------------------------- | :----- | :------------- | :------------------------ | :------------------------------------------ |
| `/api/cronjob/cron/check-inactive-users` | DELETE | Bearer Token   | Disabled (`@csrf_exempt`) | Triggers check and update of inactive users |

<br />

## Simplified Execution Example

1. The cron triggers the `check_inactive_users_cron.py` script.
2. The script fetches a CSRF token from `/api/cronjob/csrf-token`.
3. The script sends a DELETE request with Bearer token and CSRF token headers to `/api/cronjob/cron/check-inactive-users`.
4. The Daphne server authenticates the request, skips CSRF validation, and updates the users accordingly.
5. The script logs the HTTP status code for confirmation.

<br />

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
 subgraph CLIENT["CLIENT"]
        W["Websocket"]
  end
 subgraph DOCKER_NETWORK["DOCKER_NETWORK"]
        CRONJOB
        F["Sends ws message to online users"]
        SERVER
        CLIENT
        NGINX["NGINX"]
        DATABASE["DATABASE"]
        REDIS["REDIS"]
  end
    T -- Triggers every minute --> A
    A -- "DELETE /api/cronjob/cron/check-inactive-users" --> SERVER
    D --> E & F
    E --> DATABASE
    F --> W
    DATABASE@{ shape: cyl}
     DATABASE:::Ash
    classDef Ash stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000
    style CRONJOB fill:#AA00FF
    style SERVER fill:#2962FF
    style CLIENT fill:#FF6D00
    style NGINX fill:#00C853
    style REDIS fill:#D50000
    style DOCKER_NETWORK fill:#BBDEFB
```
