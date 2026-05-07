package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type FastAPIClient struct {
	BaseURL string
	Client  *http.Client
}

func NewFastAPIClient(baseURL string) *FastAPIClient {
	return &FastAPIClient{BaseURL: baseURL, Client: &http.Client{Timeout: 5 * time.Minute}}
}

func (c *FastAPIClient) Generate(text, voice, model, outputPath string) error {
	body, _ := json.Marshal(map[string]interface{}{"text": text, "voice": voice, "model": model})
	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("fastapi returned %d: %s", resp.StatusCode, string(raw))
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return err
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType == "audio/wav" || contentType == "audio/mpeg" || contentType == "application/octet-stream" {
		file, err := os.Create(outputPath)
		if err != nil {
			return err
		}
		defer file.Close()
		_, err = io.Copy(file, resp.Body)
		if err != nil {
			return err
		}
		return validateAudioFile(outputPath)
	}
	var payload map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err == nil {
		if value, ok := payload["output_path"].(string); ok && value != "" {
			return copyAudioFile(value, outputPath)
		}
		for _, key := range []string{"audio_url", "url", "path"} {
			if value, ok := payload[key].(string); ok && value != "" {
				if err := c.fetchAudioURL(value, outputPath); err == nil {
					return nil
				}
				return os.WriteFile(outputPath+".source", []byte(value), 0644)
			}
		}
		if value, ok := payload["download_url"].(string); ok && value != "" {
			return c.fetchAudioURL(value, outputPath)
		}
	}
	return fmt.Errorf("fastapi did not return audio data or a usable output path")
}

func (c *FastAPIClient) fetchAudioURL(value, outputPath string) error {
	url := value
	if len(url) > 0 && url[0] == '/' {
		url = c.BaseURL + url
	}
	resp, err := c.Client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("fastapi download returned %d: %s", resp.StatusCode, string(raw))
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return err
	}
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()
	if _, err := io.Copy(file, resp.Body); err != nil {
		return err
	}
	return validateAudioFile(outputPath)
}

func copyAudioFile(sourcePath, outputPath string) error {
	source, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer source.Close()
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return err
	}
	output, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer output.Close()
	if _, err := io.Copy(output, source); err != nil {
		return err
	}
	return validateAudioFile(outputPath)
}

func validateAudioFile(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.Size() <= 44 {
		return fmt.Errorf("generated audio file is empty: %s", path)
	}
	return nil
}
