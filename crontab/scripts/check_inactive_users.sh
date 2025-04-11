
#!/bin/sh
curl -X DELETE -k -H "Authorization: Bearer ${CRON_SECRET}" \
	-H "Referer: https://nginx:1026/" \
	https://nginx:1026/api/cronjob/cron/check-inactive-users
