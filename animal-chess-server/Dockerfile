# 编译阶段
FROM golang:1.23-alpine AS builder

WORKDIR /app

# 安装 git 以确保 Go 可以正常拉取依赖
RUN apk add --no-cache git

# 复制依赖定义文件并下载依赖
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 编译成静态链接的二进制文件
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o animal-chess-server .

# 运行阶段
FROM alpine:3.18

WORKDIR /app

# 从编译阶段拷贝二进制文件
COPY --from=builder /app/animal-chess-server /app/animal-chess-server

# 暴露后端监听端口 8083
EXPOSE 8083

# 启动服务
CMD ["./animal-chess-server"]
