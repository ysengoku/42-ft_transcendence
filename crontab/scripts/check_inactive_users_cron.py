# crontab/check_inactive_users_cron.py
import os
import requests
import datetime
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
print("Script de vérification des utilisateurs inactifs via cronjob")
print(datetime.date.today(), datetime.datetime.now().time())
print("Variables d'environnement disponibles :")
with open('/proc/1/environ', 'r') as env_file:
    env_vars = env_file.read().split('\0')
    for var in env_vars:
        if var.startswith("CRON_ENDPOINT=") or var.startswith("CRON_SECRET="):
            key, value = var.split('=', 1)
            os.environ[key] = value
CRON_SECRET = os.getenv("CRON_SECRET")
ENDPOINT = os.getenv("CRON_ENDPOINT")
print(CRON_SECRET)
print(ENDPOINT)
if not ENDPOINT:
    raise ValueError("CRON_ENDPOINT is not set in the environment variables")
else:
    response = requests.delete(
        ENDPOINT,
        headers={"Authorization": f"Bearer {CRON_SECRET}"},
        verify=False #'/etc/ssl/certs/ca-certificates.crt'  # Certificats officiels
    )
    print(f"Status: {response.status_code}, Response: {response.text}")
