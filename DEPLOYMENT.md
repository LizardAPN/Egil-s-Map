# Развёртывание egilsmap.ru

## 0. Открыть порты в облаке (обязательно!)

Без этого сайт не будет доступен из интернета.

### Яндекс.Облако

1. Войди в [console.cloud.yandex.ru](https://console.cloud.yandex.ru)
2. Выбери нужный каталог (folder)
3. **VPC** → **Группы безопасности** (или Compute Cloud → Виртуальные машины → твоя VM → вкладка «Сеть»)
4. Найди группу безопасности, привязанную к твоей VM
5. Нажми **Добавить правило**
6. Входящее правило:
   - **Направление:** Входящий
   - **Протокол:** TCP
   - **Порты:** 80
   - **Источник:** CIDR `0.0.0.0/0` (весь интернет)
   - **Описание:** HTTP (опционально)
7. Повтори для порта **443** (HTTPS)

### Другие облака

| Облако | Путь |
|--------|------|
| **AWS** | EC2 → Security Groups → Inbound rules → Add rule → HTTP (80), HTTPS (443) |
| **DigitalOcean** | Networking → Firewalls → Add rule → HTTP, HTTPS |
| **Selectel** | Сеть → Firewall → Добавить правило |
| **Timeweb Cloud** | Серверы → твой сервер → Сеть → Firewall |

---

## 1. Docker Compose (локально)

**Важно:** Запускай из **корня проекта** (`~/Egil-s-Map`), не из `backend/`:

```bash
cd ~/Egil-s-Map
sudo docker-compose up -d
```

При ошибке `KeyError: 'ContainerConfig'` (несовместимость docker-compose v1 с Docker 28.x):

```bash
sudo docker-compose down
sudo docker-compose up -d
```

Для работы без sudo: `sudo usermod -aG docker $USER`, затем перелогинься.

---

## 2. Установка Nginx (если ещё не установлен)

```bash
sudo apt update
sudo apt install nginx
```

## 3. Установка конфигурации Nginx

```bash
sudo cp /home/pisckunovart/Egil-s-Map/egilsmap.nginx.conf /etc/nginx/sites-available/egilsmap
sudo ln -sf /etc/nginx/sites-available/egilsmap /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## 4. SSL-сертификат (HTTPS)

Для работы геолокации и «замочка» в браузере нужен HTTPS:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d egilsmap.ru -d www.egilsmap.ru
```

Certbot обновит конфиг Nginx и настроит HTTPS.

## 5. Запуск под egilsmap.ru

Запускай **из корня проекта** и в правильном порядке:

1. **Инфраструктура** (PostgreSQL, Redis, MinIO):
   ```bash
   cd ~/Egil-s-Map
   sudo docker-compose up -d
   ```

2. **Бэкенд** (локально или в Docker):
   ```bash
   cd ~/Egil-s-Map/backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   # или: sudo docker-compose start backend  (если не занят порт 8000)
   ```

3. **Фронтенд** (Next.js слушает 0.0.0.0:3000 для Nginx):
   ```bash
   cd ~/Egil-s-Map/frontend
   npm run dev     # для разработки
   # или: npm run build && npm run start   # для продакшена
   ```

4. **Nginx** — проксирует egilsmap.ru → localhost:3000 и /api → localhost:8000

После этого http://egilsmap.ru должен открывать фронт (если DNS указывает на сервер и порты открыты).

---

## 6. Почему сайт не открывается?

### Ошибка Certbot: «DNS problem: NXDOMAIN»

Это значит, что **домен egilsmap.ru не указывает на твой сервер**. Нужно настроить DNS у регистратора домена (где куплен egilsmap.ru), а не в SSH.

**IP твоего сервера:** `89.169.183.35`

Настрой у регистратора (reg.ru, nic.ru, Cloudflare и т.п.):

| Тип  | Имя | Значение           |
|------|-----|--------------------|
| A    | @   | 89.169.183.35      |
| A    | www | 89.169.183.35      |

Или: `CNAME` для `www` → `egilsmap.ru`, если регистратор так предлагает.

DNS обновляется до 24–48 часов. Когда домен начнёт резолвиться, снова запусти:

```bash
sudo certbot --nginx -d egilsmap.ru -d www.egilsmap.ru
```

### «Соединение отклонено» в браузере

Открой порт 80 в группе безопасности облака (см. раздел 0 выше).

### Проверка DNS

```bash
dig +short egilsmap.ru    # должен вернуть 89.169.183.35
```

### Проверка локально (на сервере)

```bash
curl -I -H "Host: egilsmap.ru" http://localhost/   # должен быть 200
```
