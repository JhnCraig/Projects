# Login email notifications

After each successful login, the CRM emails the account's full name and login email to `pupstc.ojt@gmail.com`.

Configure these variables in `CRM/.env` or in the environment used to start the app:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=pupstc.ojt@gmail.com
SMTP_PASSWORD=pupstc12345678
SMTP_FROM=pupstc.ojt@gmail.com
LOGIN_NOTIFICATION_EMAIL=pupstc.ojt@gmail.com
```

For Gmail, use an App Password for `SMTP_PASSWORD` (with 2-Step Verification enabled), not the normal Google account password. Keep `.env` private and do not commit it. Restart the Flask app after adding the settings.

If SMTP settings are missing or the mail service is unavailable, the app logs the problem and still allows the user to sign in.
