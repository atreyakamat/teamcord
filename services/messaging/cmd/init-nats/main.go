package main

import (
	"log"
	"os"
	"time"

	"github.com/nats-io/nats.go"
)

func main() {
	url := os.Getenv("NATS_URL")
	if url == "" {
		url = nats.DefaultURL
	}

	nc, err := nats.Connect(url)
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	js, err := nc.JetStream()
	if err != nil {
		log.Fatal(err)
	}

	// ─── Stream Definitions ──────────────────────────────────────────────────

	streams := []struct {
		name     string
		subjects []string
		retention nats.RetentionPolicy
	}{
		{
			name:     "MESSAGES",
			subjects: []string{"channel.*"},
			retention: nats.LimitsPolicy,
		},
		{
			name:     "PRESENCE",
			subjects: []string{"presence.*"},
			retention: nats.InterestPolicy,
		},
		{
			name:     "VOICE",
			subjects: []string{"voice.*"},
			retention: nats.InterestPolicy,
		},
		{
			name:     "AGENT",
			subjects: []string{"agent.*"},
			retention: nats.LimitsPolicy,
		},
	}

	for _, s := range streams {
		_, err := js.AddStream(&nats.StreamConfig{
			Name:      s.name,
			Subjects:  s.subjects,
			Retention: s.retention,
			MaxAge:    24 * time.Hour,
			Storage:   nats.FileStorage,
		})
		if err != nil {
			log.Printf("Error creating stream %s: %v", s.name, err)
		} else {
			log.Printf("Stream %s created/verified", s.name)
		}
	}

	log.Println("✓ NATS JetStream initialization complete")
}
