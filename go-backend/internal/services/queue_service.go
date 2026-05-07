package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
	"unicode/utf8"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/models"
)

type QueueService struct {
	db         *gorm.DB
	redis      *redis.Client
	cfg        config.Config
	fastapi    *FastAPIClient
	chunker    *TextChunker
	merger     *AudioMergeService
	notify     *NotificationService
	webhooks   *WebhookService
	memoryJobs chan string
	gpuLock    chan struct{}
}

func NewQueueService(db *gorm.DB, redis *redis.Client, cfg config.Config, notify *NotificationService, webhooks *WebhookService) *QueueService {
	return &QueueService{
		db:         db,
		redis:      redis,
		cfg:        cfg,
		fastapi:    NewFastAPIClient(cfg.FastAPITTSURL),
		chunker:    NewTextChunker(cfg.MaxCharsPerChunk),
		merger:     NewAudioMergeService(),
		notify:     notify,
		webhooks:   webhooks,
		memoryJobs: make(chan string, 1000),
		gpuLock:    make(chan struct{}, cfg.MaxGPUConcurrency),
	}
}

func (q *QueueService) Start(ctx context.Context) {
	for i := 0; i < q.cfg.WorkerCount; i++ {
		go q.worker(ctx, i)
	}
}

func (q *QueueService) Enqueue(jobID string) error {
	if q.redis != nil && q.cfg.QueueDriver == "redis" {
		return q.redis.XAdd(context.Background(), &redis.XAddArgs{Stream: "nstudio:generation_jobs", Values: map[string]interface{}{"job_id": jobID}}).Err()
	}
	q.memoryJobs <- jobID
	return nil
}

func (q *QueueService) worker(ctx context.Context, workerID int) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		jobID := ""
		if q.redis != nil && q.cfg.QueueDriver == "redis" {
			streams, err := q.redis.XRead(ctx, &redis.XReadArgs{Streams: []string{"nstudio:generation_jobs", "$"}, Count: 1, Block: 5 * time.Second}).Result()
			if err == nil && len(streams) > 0 && len(streams[0].Messages) > 0 {
				if raw, ok := streams[0].Messages[0].Values["job_id"].(string); ok {
					jobID = raw
				}
			}
		} else {
			select {
			case jobID = <-q.memoryJobs:
			case <-ctx.Done():
				return
			}
		}
		if jobID != "" {
			log.Printf("worker %d processing job %s", workerID, jobID)
			q.Process(jobID)
		}
	}
}

func (q *QueueService) Process(jobID string) {
	var job models.GenerationJob
	if err := q.db.First(&job, "id = ?", jobID).Error; err != nil {
		return
	}
	now := time.Now()
	q.db.Model(&job).Updates(map[string]interface{}{"status": "running", "started_at": now})
	chunks := q.chunker.Split(job.Text)
	q.db.Model(&job).Updates(map[string]interface{}{"total_chunks": len(chunks)})
	for i, text := range chunks {
		q.db.Create(&models.GenerationChunk{JobID: job.ID, ChunkIndex: i, TextChunk: text, Status: "pending"})
	}
	var dbChunks []models.GenerationChunk
	q.db.Where("job_id = ?", job.ID).Order("chunk_index asc").Find(&dbChunks)
	paths := make([]string, 0, len(dbChunks))
	for _, chunk := range dbChunks {
		if err := q.processChunk(&job, &chunk); err != nil {
			q.failJob(&job, err.Error())
			return
		}
		paths = append(paths, filepath.Join(q.cfg.AudioStorageDir, job.ID, fmt.Sprintf("chunk_%04d.wav", chunk.ChunkIndex)))
		completed := chunk.ChunkIndex + 1
		q.db.Model(&job).Updates(map[string]interface{}{"completed_chunks": completed})
		q.setProgress(job.ID, completed, len(dbChunks), "running")
		q.notify.Push(job.UserID, map[string]interface{}{"type": "job.progress", "job_id": job.ID, "completed_chunks": completed, "total_chunks": len(dbChunks)})
	}
	q.db.Model(&job).Update("status", "merging")
	finalPath := filepath.Join(q.cfg.AudioStorageDir, job.ID, "final.wav")
	if err := q.merger.Merge(paths, finalPath); err != nil {
		q.failJob(&job, err.Error())
		return
	}
	mp3Path := filepath.Join(q.cfg.AudioStorageDir, job.ID, "final.mp3")
	if err := q.merger.ConvertToMP3(finalPath, mp3Path); err != nil {
		log.Printf("job %s MP3 export failed: %v", job.ID, err)
	}
	done := time.Now()
	audioURL := "/audio/" + job.ID + "/final.wav"
	credits := int64(utf8.RuneCountInString(job.Text))
	q.db.Model(&job).Updates(map[string]interface{}{"status": "completed", "audio_url": audioURL, "credits_used": credits, "completed_at": done})
	q.db.Model(&models.User{}).Where("id = ?", job.UserID).UpdateColumn("credits_used", gorm.Expr("credits_used + ?", credits))
	q.notify.Create(job.UserID, "generation.completed", "Generation completed", "Your speech generation is ready.", map[string]interface{}{"job_id": job.ID, "audio_url": audioURL})
	q.webhooks.Trigger(job.UserID, "generation.completed", job)
}

func (q *QueueService) processChunk(job *models.GenerationJob, chunk *models.GenerationChunk) error {
	start := time.Now()
	q.db.Model(chunk).Updates(map[string]interface{}{"status": "running", "started_at": start})
	q.gpuLock <- struct{}{}
	defer func() { <-q.gpuLock }()
	path := filepath.Join(q.cfg.AudioStorageDir, job.ID, fmt.Sprintf("chunk_%04d.wav", chunk.ChunkIndex))
	err := q.fastapi.Generate(chunk.TextChunk, job.Voice, job.Model, path)
	done := time.Now()
	if err != nil {
		q.db.Model(chunk).Updates(map[string]interface{}{"status": "failed", "error_message": err.Error(), "completed_at": done})
		return err
	}
	if info, statErr := os.Stat(path); statErr != nil {
		return statErr
	} else if info.Size() <= 44 {
		return fmt.Errorf("generated chunk audio is empty: %s", path)
	}
	return q.db.Model(chunk).Updates(map[string]interface{}{"status": "completed", "audio_url": path, "duration_ms": time.Since(start).Milliseconds(), "completed_at": done}).Error
}

func (q *QueueService) failJob(job *models.GenerationJob, message string) {
	now := time.Now()
	q.db.Model(job).Updates(map[string]interface{}{"status": "failed", "error_message": message, "completed_at": now})
	q.notify.Create(job.UserID, "generation.failed", "Generation failed", message, map[string]interface{}{"job_id": job.ID})
	q.webhooks.Trigger(job.UserID, "generation.failed", job)
}

func (q *QueueService) setProgress(jobID string, done, total int, status string) {
	if q.redis == nil {
		return
	}
	percent := 0
	if total > 0 {
		percent = done * 100 / total
	}
	_ = q.redis.HSet(context.Background(), "job_progress:"+jobID, map[string]interface{}{"completed": done, "total": total, "percent": percent, "status": status}).Err()
	_ = q.redis.Expire(context.Background(), "job_progress:"+jobID, 24*time.Hour).Err()
}
