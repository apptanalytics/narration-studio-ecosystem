package services

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
)

type AudioMergeService struct{}

func NewAudioMergeService() *AudioMergeService {
	return &AudioMergeService{}
}

func (s *AudioMergeService) Merge(inputs []string, output string) error {
	if len(inputs) == 0 {
		return fmt.Errorf("no audio chunks to merge")
	}
	if err := os.MkdirAll(filepath.Dir(output), 0755); err != nil {
		return err
	}
	if len(inputs) == 1 {
		if err := copyFile(inputs[0], output); err != nil {
			return err
		}
		return validateMergedAudio(output)
	}
	out, err := os.Create(output)
	if err != nil {
		return err
	}
	defer out.Close()
	for _, input := range inputs {
		file, err := os.Open(input)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(out, file)
		_ = file.Close()
		if copyErr != nil {
			return copyErr
		}
	}
	return validateMergedAudio(output)
}

func (s *AudioMergeService) ConvertToMP3(input, output string) error {
	if err := os.MkdirAll(filepath.Dir(output), 0755); err != nil {
		return err
	}
	cmd := exec.Command("ffmpeg", "-y", "-i", input, "-vn", "-acodec", "libmp3lame", "-ar", "24000", "-ac", "1", "-b:a", "128k", output)
	if data, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(output)
		return fmt.Errorf("could not convert audio to MP3: %s", string(data))
	}
	return validateMergedAudio(output)
}

func copyFile(input, output string) error {
	source, err := os.Open(input)
	if err != nil {
		return err
	}
	defer source.Close()
	destination, err := os.Create(output)
	if err != nil {
		return err
	}
	defer destination.Close()
	_, err = io.Copy(destination, source)
	return err
}

func validateMergedAudio(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.Size() <= 44 {
		return fmt.Errorf("merged audio is empty: %s", path)
	}
	return nil
}
