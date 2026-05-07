package services

import (
	"regexp"
	"strings"
)

type TextChunker struct {
	MaxChars int
}

func NewTextChunker(maxChars int) *TextChunker {
	return &TextChunker{MaxChars: maxChars}
}

func (c *TextChunker) Normalize(text string) string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	space := regexp.MustCompile(`[ \t]+`)
	return strings.TrimSpace(space.ReplaceAllString(text, " "))
}

func (c *TextChunker) Split(text string) []string {
	text = c.Normalize(text)
	if len(text) <= c.MaxChars {
		return []string{text}
	}
	var chunks []string
	for _, paragraph := range strings.Split(text, "\n") {
		paragraph = strings.TrimSpace(paragraph)
		if paragraph == "" {
			continue
		}
		chunks = append(chunks, c.splitParagraph(paragraph)...)
	}
	return chunks
}

func (c *TextChunker) splitParagraph(paragraph string) []string {
	sentenceEnd := regexp.MustCompile(`([.!?។])\s+`)
	parts := sentenceEnd.Split(paragraph, -1)
	var chunks []string
	var current strings.Builder
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if len(part) > c.MaxChars {
			if current.Len() > 0 {
				chunks = append(chunks, strings.TrimSpace(current.String()))
				current.Reset()
			}
			for len(part) > c.MaxChars {
				chunks = append(chunks, strings.TrimSpace(part[:c.MaxChars]))
				part = part[c.MaxChars:]
			}
		}
		if current.Len()+len(part)+1 > c.MaxChars {
			chunks = append(chunks, strings.TrimSpace(current.String()))
			current.Reset()
		}
		current.WriteString(part)
		current.WriteString(" ")
	}
	if current.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(current.String()))
	}
	return chunks
}
