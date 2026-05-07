package services

import (
	"github.com/pquerna/otp/totp"
)

type TOTPService struct{}

func NewTOTPService() *TOTPService {
	return &TOTPService{}
}

func (s *TOTPService) Generate(email string) (secret, url string, err error) {
	key, err := totp.Generate(totp.GenerateOpts{Issuer: "Narration Studio", AccountName: email})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

func (s *TOTPService) Validate(code, secret string) bool {
	return totp.Validate(code, secret)
}
