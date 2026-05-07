package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/database"
	"nstudio/go-backend/internal/handlers"
	"nstudio/go-backend/internal/routes"
)

func main() {
	cfg := config.Load()
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	store, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	app := handlers.NewApp(store.DB, store.Redis, cfg)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	app.Queue.Start(ctx)

	router := gin.New()
	routes.Register(router, app)
	server := &http.Server{Addr: ":" + cfg.Port, Handler: router}
	go func() {
		log.Printf("Narration Studio Go backend listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}
