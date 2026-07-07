FROM alpine:3.18

WORKDIR /app

# 拷贝本地已编译好的 Linux 二进制文件到容器中
COPY animal-chess-server /app/animal-chess-server

# 赋予执行权限（以防上传或拷贝时丢失执行权限）
RUN chmod +x /app/animal-chess-server

# 暴露端口 8083
EXPOSE 8083

# 启动服务
CMD ["./animal-chess-server"]
