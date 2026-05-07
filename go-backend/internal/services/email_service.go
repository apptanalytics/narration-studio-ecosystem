package services

import (
	"fmt"
	"log"
	"net/smtp"

	"nstudio/go-backend/internal/config"
)

type EmailService struct {
	cfg config.Config
}

func NewEmailService(cfg config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) Send(to, subject, body string) {
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPassword == "" {
		log.Printf("email skipped to=%s subject=%s body=%s", to, subject, body)
		return
	}
	from := s.cfg.SMTPFrom
	if from == "" {
		from = s.cfg.SMTPUser
	}
	msg := []byte("To: " + to + "\r\nSubject: " + subject + "\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n" + body)
	addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	if err := smtp.SendMail(addr, auth, from, []string{to}, msg); err != nil {
		log.Printf("email failed: %v", err)
	}
}

func (s *EmailService) SendOTP(to, code, purpose string) {
	s.Send(to, "Narration Studio verification code", fmt.Sprintf("Your Narration Studio %s code is %s. It expires in 10 minutes.", purpose, code))
}
