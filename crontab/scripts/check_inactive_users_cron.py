# crontab/check_inactive_users_cron.py
import os
import requests
import datetime

print("Inactive users check cronjob script")
print(datetime.date.today(), datetime.datetime.now().time())
# Get env variables from the container
with open('/proc/1/environ', 'r') as env_file:
    env_vars = env_file.read().split('\0')
    for var in env_vars:
        if var.startswith("CRON_ENDPOINT=") or var.startswith("CRON_SECRET=") or var.startswith("CRON_CSRF_TOKEN="):
            key, value = var.split('=', 1)
            os.environ[key] = value

CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = os.getenv("CRON_ENDPOINT")
CSRF_TOKEN_URL = os.getenv("CRON_CSRF_TOKEN")


if not ENDPOINT or not CSRF_TOKEN_URL:
    print("Error: CRON_ENDPOINT or CRSF_TOKEN is not set in the env")
    raise ValueError("CRON_ENDPOINT is not set in the environment variables")

# Get CSRF token
session = requests.Session()
base_url = ENDPOINT.rsplit('/api', 1)[0]
get_response = session.get(CSRF_TOKEN_URL, verify=False)
csrf_token = session.cookies.get('csrftoken')

if not csrf_token:
    print("Error: Unable to get CSRF token")
    exit(1)

# Make DELETE request
headers = {
    "Authorization": f"Bearer {CRON_SECRET}",
    "X-CSRFToken": csrf_token,
    "Referer": base_url
}

response = session.delete(f"{ENDPOINT}", headers=headers, verify=False)
print(f"Status: {response.status_code}")
