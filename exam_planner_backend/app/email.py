import smtplib
from email.message import EmailMessage

from flask import current_app


def send_email_notification(to, subject, body):
    email_address = current_app.config.get("MAIL_USERNAME")
    email_password = current_app.config.get("MAIL_PASSWORD")

    if not email_address or not email_password:
        raise Exception("Credențialele de email nu sunt configurate corect.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = email_address
    msg["To"] = to
    msg.set_content(body)

    with smtplib.SMTP(current_app.config.get("MAIL_SERVER"), current_app.config.get("MAIL_PORT")) as smtp:
        smtp.starttls()
        smtp.login(email_address, email_password)
        smtp.send_message(msg)
