# crontab/check_inactive_users_cron.py
import os
import requests
import datetime

print("Inactive users check cronjob script")
print(datetime.date.today(), datetime.datetime.now().time())

with open('/proc/1/environ', 'r') as env_file:
    env_vars = env_file.read().split('\0')
    for var in env_vars:
        if var.startswith("CRON_ENDPOINT=") or var.startswith("CRON_SECRET="):
            key, value = var.split('=', 1)
            os.environ[key] = value

CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = os.getenv("CRON_ENDPOINT")

if not ENDPOINT:
    raise ValueError("CRON_ENDPOINT is not set in the environment variables")

# Get CSRF token
session = requests.Session()
base_url = ENDPOINT.rsplit('/api', 1)[0]
get_response = session.get(f"{base_url}/api/cronjob/csrf-token", verify=False)
csrf_token = session.cookies.get('csrftoken')

if not csrf_token:
    print("Error: Unable to get CSRF token")
    exit(1)

# Make DELETE request
headers = {
    "Authorization": f"Bearer {CRON_SECRET}",
    "X-CSRFToken": csrf_token,
    "Referer": ENDPOINT
}

response = session.delete(ENDPOINT, headers=headers, verify=False)
print(f"Status: {response.status_code}")
