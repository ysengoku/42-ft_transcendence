import os
import requests
import datetime
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

print("Last inactive users check:")
print(datetime.date.today(), datetime.datetime.now().time())

CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = "http://server:8000/api/cronjob/cron/check-inactive-users"

session = requests.Session()
base_url = ENDPOINT.rsplit("/api", 1)[0]
headers = {
    "Authorization": f"Bearer {CRON_SECRET}",
    "Referer": base_url,
}

response = session.delete(f"{ENDPOINT}", headers=headers, verify=False)
print(f"Status: {response.status_code}")
