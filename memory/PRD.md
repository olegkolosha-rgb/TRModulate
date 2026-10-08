# PRD — Modulate Velma-2 STT Studio

## Original problem statement
Пользователь имел Python-консольный скрипт транскрибации через Modulate Velma-2 STT и попросил «улучшить код». Решение: веб-приложение для транскрибации аудио/видео с просмотром результата, экспортом (TXT/SRT/JSON) и историей.

## Architecture
- **Backend** (FastAPI, /app/backend/server.py): приём файла, ffmpeg-извлечение аудио из видео и сжатие в MP3 (mono, 16kHz), отправка в реальный Modulate API (`velma-2-stt-batch`) с ретраем при 413 (понижение битрейта 64k→32k), сохранение записей в MongoDB (`transcriptions`). Эндпоинты: `/api/config`, `/api/transcribe`, `/api/history`, `/api/history/{id}` (GET/DELETE).
- **Frontend** (React 19 + Tailwind v4 + shadcn): тёмный «Acoustic Workbench» UI на русском. Drag&drop загрузка, переключатели параметров Velma-2, аудиоплеер с перемоткой по клику на сегмент, вкладки Сегменты/Полный текст, экспорт, History drawer.
- Ключ Modulate хранится в `backend/.env` → `MODULATE_API_KEY`.

## Personas
- Аналитик/редактор, которому нужно быстро получить транскрипт с разбивкой по спикерам и эмоциям без запуска скрипта в консоли.

## Core requirements (static)
- Загрузка аудио и видео, авто-подготовка, отправка в Modulate, просмотр, экспорт TXT/SRT/JSON, история.

## Implemented (2026-10-08)
- Полный pipeline загрузка→ffmpeg→Modulate→MongoDB→UI. Экспорт TXT/SRT (с разбивкой по предложениям и интерполяцией времени)/JSON. История с просмотром/скачиванием/удалением. Переключение темы. Протестировано (backend+frontend 100%).

## Backlog (P1/P2)
- P1: Синхронный highlight активного сегмента во время воспроизведения.
- P2: Поиск/фильтр в истории, предзагруженные русские аудио-сэмплы.
- P2: Экспорт VTT, копирование текста в буфер.
- P2: Отображение акцента/дипфейк-сигнала, если включены соответствующие параметры.

## Next tasks
- По обратной связи пользователя.
