# piano_vinhquang

Project hiện có frontend tĩnh và một backend Node/Express tối giản để lưu form liên hệ vào MongoDB local.

## MongoDB local

- Host: `localhost:27017`
- Database: `piano_vinhquang`
- Collection: `customers`

## Chạy project

1. Cài dependencies:
   `npm install`
2. Tạo file env từ mẫu:
   `cp .env.example .env`
3. Chạy server:
   `npm start`
4. Mở:
   `http://localhost:3000`

## API

- `GET /api/health`
- `POST /api/customers`

Payload mẫu:

```json
{
  "interest": "course",
  "interestLabel": "Khóa học online",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0900000000",
  "message": "Muon duoc tu van."
}
```
