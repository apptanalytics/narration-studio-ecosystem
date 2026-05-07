package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppName            string
	Port               string
	Env                string
	DatabaseDriver     string
	DatabaseDSN        string
	RedisURL           string
	QueueDriver        string
	JWTSecret          string
	AccessTokenMinutes int
	RefreshTokenDays   int
	CookieDomain       string
	FrontendURL        string
	FastAPITTSURL      string
	AudioStorageDir    string
	WorkerCount        int
	MaxGPUConcurrency  int
	MaxCharsPerChunk   int
	SMTPHost           string
	SMTPPort           int
	SMTPUser           string
	SMTPPassword       string
	SMTPFrom           string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	AdminEmail         string
	AdminPassword      string
}

func Load() Config {
	loadDotEnv(".env")

	return Config{
		AppName:            "Narration Studio",
		Port:               env("PORT", "8080"),
		Env:                env("APP_ENV", "development"),
		DatabaseDriver:     env("DATABASE_DRIVER", "sqlite"),
		DatabaseDSN:        env("DATABASE_DSN", "reader_outputs/auth.db"),
		RedisURL:           env("REDIS_URL", "redis://localhost:6379"),
		QueueDriver:        env("QUEUE_DRIVER", "redis"),
		JWTSecret:          env("JWT_SECRET", "change-me-in-production"),
		AccessTokenMinutes: envInt("ACCESS_TOKEN_MINUTES", 15),
		RefreshTokenDays:   envInt("REFRESH_TOKEN_DAYS", 7),
		CookieDomain:       env("COOKIE_DOMAIN", ""),
		FrontendURL:        env("FRONTEND_URL", "http://localhost:3000"),
		FastAPITTSURL:      env("FASTAPI_TTS_URL", "http://localhost:8810"),
		AudioStorageDir:    env("AUDIO_STORAGE_DIR", "reader_outputs/audio"),
		WorkerCount:        envInt("WORKER_COUNT", 3),
		MaxGPUConcurrency:  envInt("MAX_GPU_CONCURRENCY", 1),
		MaxCharsPerChunk:   envInt("MAX_CHARS_PER_CHUNK", 1500),
		SMTPHost:           env("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:           envInt("SMTP_PORT", 587),
		SMTPUser:           env("SMTP_USER", ""),
		SMTPPassword:       env("SMTP_PASSWORD", ""),
		SMTPFrom:           env("SMTP_FROM", ""),
		GoogleClientID:     env("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: env("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  env("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
		AdminEmail:         env("ADMIN_BOOTSTRAP_EMAIL", ""),
		AdminPassword:      env("ADMIN_BOOTSTRAP_PASSWORD", ""),
	}
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "export ") {
			if strings.HasPrefix(line, "export ") {
				line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
			} else {
				continue
			}
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func (c Config) IsProduction() bool {
	return strings.EqualFold(c.Env, "production")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(env(key, ""))
	if err != nil {
		return fallback
	}
	return value
}
