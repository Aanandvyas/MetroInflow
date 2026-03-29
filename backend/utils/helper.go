// bring some of the fns here, so that i can delete the files
package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

/* SendGmailNotification sends an email via Gmail SMTP

 */

func SendGmailNotification(toEmail, subject, body string) error {
	smtpHost := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}

	smtpPort := strings.TrimSpace(os.Getenv("SMTP_PORT"))
	if smtpPort == "" {
		smtpPort = "587"
	}

	username := strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	password := strings.TrimSpace(os.Getenv("SMTP_PASSWORD"))
	from := strings.TrimSpace(os.Getenv("SMTP_FROM"))

	// Backward-compatible fallback to existing Gmail env vars.
	if username == "" {
		username = strings.TrimSpace(os.Getenv("GMAIL_ADDRESS"))
	}
	if password == "" {
		password = strings.TrimSpace(os.Getenv("GMAIL_APP_PASSWORD"))
	}
	if from == "" {
		from = username
	}

	if smtpHost == "" || smtpPort == "" || username == "" || password == "" || from == "" {
		return fmt.Errorf("SMTP credentials are not fully configured")
	}

	auth := smtp.PlainAuth("", username, password, smtpHost)
	msg := []byte("To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\nContent-Type: text/plain; charset=\"UTF-8\";\r\n\r\n" +
		body)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
}
