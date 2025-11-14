# Docker 部署指南

## 1. 建立環境變數

在專案根目錄建立 `.env`，內容如下（Token 需先在 Cloudflare Dashboard 建立 Named Tunnel 後取得）：

```
CLOUDFLARE_TUNNEL_TOKEN=xxxxxxx
```

在建立 Public Hostname 時，請將 Service 設定為 `http://app:3000`，Cloudflare 會透過 docker 網路解析 `app` 這個服務名稱。

## 2. 建立與啟動服務

```bash
docker compose build
docker compose up -d
```

說明：

- `app` 服務會使用 `Dockerfile` 進行多階段建置，並將 SQLite 資料放在命名為 `app-data` 的 volume，可持久化在 `/var/lib/docker/volumes/...`。
- 預設容器內資料庫目錄為 `/data`，如需更改，可在 `docker-compose.yml` 調整 `POKER_DB_DIR` 並對應到新的 volume。

## 3. Cloudflare Tunnel

`cloudflared` 服務會使用 `.env` 內的 `CLOUDFLARE_TUNNEL_TOKEN` 自動連線。確認以下事項：

1. 已在 Cloudflare Dashboard 中針對該 Tunnel 綁定網域 (Public Hostname)。
2. 該 Hostname 的 Service 設為 `http://app:3000`。
3. 需要查看 Tunnel 日誌時，可使用 `docker compose logs -f cloudflared`。

完成後即可透過 Cloudflare 指定的網域安全地存取 `app` 服務。若只想在區網測試，可暫時停用 `cloudflared`，單獨啟動 `app` 服務並使用 `http://localhost:3000` 測試。
