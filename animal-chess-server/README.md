# 斗兽棋后端部署指引

本项目后端采用 Go 语言开发，支持在本地（Windows）交叉编译为 Linux 平台二进制文件，并上传到 CentOS 服务器通过 Docker Compose 极速部署。

---

## 一、 本地打包 (Windows)

1. 进入当前目录 `animal-chess-server`。
2. 双击运行 [build_linux.bat](./build_linux.bat) 批处理脚本。
3. 编译完成后，当前目录下会生成一个名为 `animal-chess-server`（**无后缀名**）的 Linux 二进制文件。

---

## 二、 上传至 CentOS 服务器

在 CentOS 服务器上新建一个部署目录（例如 `/opt/animal-chess`），然后将本地 `animal-chess-server` 目录下的以下 **4 个文件** 上传至该目录（同一级平铺）：

### 1. 待上传文件列表
* `animal-chess-server`（刚刚编译出的 Linux 二进制文件）
* `Dockerfile`（容器构建配置文件）
* `docker-compose.yml`（容器编排配置文件）
* `step.sh`（一键重新部署 Shell 脚本）

### 2. 服务器上的目录结构
请确保上传后的文件在服务器上保持如下结构（平铺在同一级目录下）：
```text
/opt/animal-chess/
├── docker-compose.yml
├── Dockerfile
├── step.sh
└── animal-chess-server
```

---

## 三、 在服务器上启动与更新服务

首次上传文件后，您需要为 `step.sh` 赋予执行权限，然后直接执行它即可一键完成容器的清理、构建、拉起与日志查看：

### 1. 赋予执行权限（仅需执行一次）
```bash
chmod +x step.sh
```

### 2. 一键启动或重新部署
```bash
./step.sh
```
> **提示**：运行 `./step.sh` 后，脚本会自动停止旧容器，构建新镜像，并在后台启动新容器，最后会自动开启 `docker compose logs -f` 供您查看实时日志。按 `Ctrl+C` 可以安全退出日志查看，不会影响后台运行的服务。
