# API Documentation

## Base URL

```
http://localhost:3001
```

## Endpoints

### Health Check

```
GET /health
```

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:15:00Z"
}
```

### Lessons

#### List Lessons

```
GET /api/lessons
```

Returns all available lessons.

**Response:**
```json
{
  "lessons": [
    {
      "id": 1,
      "title": "Lesson Title",
      "description": "Lesson description",
      "difficulty": "Beginner",
      "duration_minutes": 15
    }
  ]
}
```

#### Get Lesson Details

```
GET /api/lessons/:id
```

Returns specific lesson content and exercises.

**Response:**
```json
{
  "id": 1,
  "title": "Lesson Title",
  "content": "Lesson content...",
  "exercises": []
}
```

### Authentication

#### Login

```
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### User Profile

#### Get Profile

```
GET /api/users/profile
```

Requires Bearer token in Authorization header.

**Response:**
```json
{
  "id": 1,
  "name": "User Name",
  "email": "user@example.com",
  "lessonProgress": []
}
```

## Telegram Webhook

```
POST /webhook/telegram
```

Receives Telegram updates. Set webhook URL in BotFather.

**Handled Types:**
- Messages
- Callback queries (button clicks)

---

More endpoints coming soon!
