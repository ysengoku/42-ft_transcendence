# crontab/check_inactive_users_cron.py
import os

import requests

# from server.chat.consumers import check_inactive_users
#
#
# def main():
#     try:
#         check_inactive_users()
#     except Exception as e:
#         print("Erreur lors de check_inactive_user via cronjob")
#
#
# if __name__ == "__main__":
#     main()
#
#
print("CRONJOB !!!!!!!!!!!!!!!")
CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = os.getenv("CRON_ENDPOINT")

response = requests.delete(
    ENDPOINT,
    headers={"Authorization": f"Bearer {CRON_SECRET}"},
    verify='/etc/ssl/certs/ca-certificates.crt'  # Certificats officiels
)
print(f"Status: {response.status_code}, Response: {response.text}")
