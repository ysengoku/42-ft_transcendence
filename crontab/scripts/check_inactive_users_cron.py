# crontab/check_inactive_users_cron.py
import os
import requests
import datetime
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

LAST_RUN_FILE = "/tmp/last_run.txt"


def get_last_run_time():
    if not os.path.exists(LAST_RUN_FILE):
        return None
    with open(LAST_RUN_FILE, "r") as f:
        timestamp = f.read().strip()
    try:
        return datetime.datetime.fromisoformat(timestamp)
    except ValueError as e:
        print(e)
        return None


def set_last_run_time(time):
    with open(LAST_RUN_FILE, "w") as f:
        f.write(time.isoformat())


def should_run():
    last_run = get_last_run_time()
    now = datetime.datetime.now()
    if last_run is None or (now - last_run) >= datetime.timedelta(seconds=59):
        set_last_run_time(now)
        return True
    return False


if not should_run():
    exit(0)

print("Last inactive users check :")
print(datetime.date.today(), datetime.datetime.now().time())

# Get env variables from the container
with open("/proc/1/environ", "r") as env_file:
    env_vars = env_file.read().split("\0")
    for var in env_vars:
        if var.startswith("CRON_ENDPOINT=") or var.startswith("CRON_SECRET=") or var.startswith("CRON_CSRF_TOKEN="):
            key, value = var.split("=", 1)
            os.environ[key] = value

CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = os.getenv("CRON_ENDPOINT")
CSRF_TOKEN_URL = os.getenv("CRON_CSRF_TOKEN")


if not ENDPOINT or not CSRF_TOKEN_URL:
    print("Error: CRON_ENDPOINT or CRSF_TOKEN is not set in the env")
    raise ValueError("CRON_ENDPOINT is not set in the environment variables")

# Get CSRF token
session = requests.Session()
base_url = ENDPOINT.rsplit("/api", 1)[0]
get_response = session.get(CSRF_TOKEN_URL, verify=False)
csrf_token = session.cookies.get("csrftoken")

if not csrf_token:
    print("Error: Unable to get CSRF token")
    exit(1)

# Make DELETE request
headers = {
    "Authorization": f"Bearer {CRON_SECRET}",
    "X-CSRFToken": csrf_token,
    "Referer": base_url,
}

response = session.delete(f"{ENDPOINT}", headers=headers, verify=False)
print(f"Status: {response.status_code}")
