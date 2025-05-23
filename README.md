
# BFF File Handler

**BFF File Handler** is a robust Express.js TypeScript backend service designed to handle file uploads with enterprise-grade resilience patterns. It provides secure authentication, file processing capabilities, and comprehensive health monitoring endpoints. The service follows Domain-Driven Design (DDD) principles and implements modern backend practices such as circuit breakers, rate limiting, and graceful error handling.

---

## 🚀 Features

### 🔐 Authentication System
- User registration with email validation  
- Secure login with JWT authentication  
- Protected routes requiring valid tokens  

### 📁 File Management
- Secure file uploads with validation  
- Asynchronous file processing  
- Resilient operations with retry mechanisms  
- Dynamic rate limiting based on system load  
- Concurrency control for optimal performance  

### 🛡️ Resilience Patterns
- Circuit breakers to prevent cascading failures  
- Retry mechanisms with exponential backoff  
- Fallback strategies for graceful degradation  
- Dynamic rate limiting based on system health  

### 📚 API Documentation
- Interactive Swagger/OpenAPI documentation  
- Comprehensive JSDoc comments  
- Example requests and responses  

### 🩺 Health Monitoring
- Basic and detailed health check endpoints  
- System resource monitoring  
- Dependency status checks  
- Process and OS information  

---

## ⚙️ Installation

### Prerequisites
- Node.js 18.x or higher  
- npm 8.x or higher  
- TypeScript 5.x  

### Setup Instructions
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/bff-file-handler.git
cd bff-file-handler

# 2. Install dependencies
npm install

# 3. Create environment files
touch .env         # For development
touch .env.test    # For testing

# 4. Build the project
npm run build

# 5. Run the server
npm run dev        # For development with hot reload
npm run start      # For production
```

---

## 🛠️ Configuration

Configure the app via a `.env` file:

```env
# Server configuration
NODE_ENV=development
PORT=3000

# JWT configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Upload configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_IN_BYTES=250000000  # 250MB

# Rate limiting
RATE_LIMIT_WINDOW=10000           # 10 seconds
RATE_LIMIT_MAX=5
MAX_CONCURRENT_UPLOADS=5

# Circuit breaker options
CIRCUIT_TIMEOUT=30000
ERROR_THRESHOLD=50
RESET_TIMEOUT=30000

# System health thresholds
CPU_THRESHOLD_PERCENT=80
MEMORY_THRESHOLD_PERCENT=80
HIGH_LOAD_LIMIT_FACTOR=0.5
CACHE_DURATION_MS=5000
```

---

## 📡 API Overview

### 🔐 Authentication Endpoints

- **POST /api/v1/auth/login**  
  Login with username and password. Returns JWT token.

- **POST /api/v1/auth/register**  
  Register with username, email, and password. Validates input.

### 📁 File Management Endpoints

- **POST /api/v1/files**  
  Upload CSV files asynchronously. Requires JWT authentication.

- **GET /api/v1/files**  
  List user-uploaded files. Requires authentication.

### 🩺 Health Check Endpoints

- **GET /api/v1/health**  
  Basic system status and health overview.

- **GET /api/v1/health/details**  
  Detailed system metrics including OS and process info.

### 📄 API Docs

- Swagger UI available at: **`/api-docs`**

---

## 💡 Example Usage

### ✅ User Registration
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### 🔑 User Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepassword123"
  }'
```

### 📤 File Upload
```bash
curl -X POST http://localhost:3000/api/v1/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/your/file.csv"
```

### 🩺 Check Health
```bash
curl http://localhost:3000/api/v1/health
```

---

## 🔒 Security Considerations

1. **JWT Authentication**
   - Expiry & token storage
   - Secure secret management

2. **File Upload Security**
   - File size limits
   - File type validation
   - Randomized file naming

3. **Rate Limiting**
   - Brute-force protection
   - Dynamic load handling

4. **Error Handling**
   - Sanitized production errors
   - Verbose errors in dev mode

5. **System Protection**
   - Circuit breakers & resource guards

---

## 🧪 Testing

Run tests with:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

---

## 🤝 Contributing

1. Fork the repo  
2. Create a branch: `git checkout -b feature-name`  
3. Commit: `git commit -m 'Add feature'`  
4. Push: `git push origin feature-name`  
5. Submit a pull request  

---

## 📄 License

**ISC License**  
This project follows best practices for resilient TypeScript + Express.js backends, using DDD principles and modern architecture patterns.
