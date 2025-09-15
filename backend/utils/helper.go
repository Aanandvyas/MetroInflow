package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

/* SendGmailNotification sends an email via Gmail SMTP

 */

func SendGmailNotification(toEmail, subject, body string) error {
	from := os.Getenv("GMAIL_ADDRESS")
	password := os.Getenv("GMAIL_APP_PASSWORD")
	if from == "" || password == "" {
		return fmt.Errorf("Gmail credentials not set in environment variables")
	}
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	auth := smtp.PlainAuth("", from, password, smtpHost)
	msg := []byte("To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-version: 1.0;\r\nContent-Type: text/plain; charset=\"UTF-8\";\r\n\r\n" +
		body)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
}
