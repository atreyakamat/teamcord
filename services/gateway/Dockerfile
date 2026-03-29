FROM golang:1.22-alpine

WORKDIR /app
COPY go.mod ./
RUN go mod tidy || true

COPY . .
RUN go mod tidy
RUN go build -o main ./cmd/gateway

EXPOSE 3002
CMD ["./main"]
