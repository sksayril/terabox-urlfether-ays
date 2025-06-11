# Category Management API Documentation

## Base URL
```
http://your-domain.com/api
```

## Authentication
All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. Create Main Category (Admin Only)
Creates a new main category.

**Endpoint:** `POST /categories/main`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "name": "Movies"
}
```

**Example Request:**
```bash
curl -X POST \
  http://your-domain.com/api/categories/main \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Movies"
  }'
```

**Success Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "categoryId": "60d21b4667d0d8992e610c85",
        "name": "Movies",
        "isMainCategory": true
    }
}
```

### 2. Create Subcategory (Admin Only)
Creates a new subcategory under a main category.

**Endpoint:** `POST /categories/sub`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
name: string (required)
parentCategoryId: string (required)
title: string (required)
telegramUrl: string (required)
isPremium: boolean (optional, default: false)
image: file (required, max size: 5MB, formats: jpg, jpeg, png)
```

**Example Request:**
```bash
curl -X POST \
  http://your-domain.com/api/categories/sub \
  -H 'Authorization: Bearer <admin_token>' \
  -F 'name=Action Movies' \
  -F 'parentCategoryId=60d21b4667d0d8992e610c85' \
  -F 'title=Best Action Movies Collection' \
  -F 'telegramUrl=https://t.me/actionmovies' \
  -F 'isPremium=true' \
  -F 'image=@/path/to/image.jpg'
```

**Success Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "categoryId": "60d21b4667d0d8992e610c86",
        "name": "Action Movies",
        "parentCategoryId": "60d21b4667d0d8992e610c85",
        "title": "Best Action Movies Collection",
        "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/categories/1234567890-image.jpg",
        "telegramUrl": "https://t.me/actionmovies",
        "isPremium": true
    }
}
```

### 3. Get All Main Categories
Retrieves all main categories.

**Endpoint:** `GET /categories/main`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Example Request:**
```bash
curl -X GET \
  http://your-domain.com/api/categories/main \
  -H 'Authorization: Bearer <user_token>'
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "categoryId": "60d21b4667d0d8992e610c85",
            "name": "Movies"
        },
        {
            "categoryId": "60d21b4667d0d8992e610c87",
            "name": "TV Shows"
        }
    ]
}
```

### 4. Get Subcategories
Retrieves all subcategories for a specific main category.

**Endpoint:** `GET /categories/sub/:parentId`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Example Request:**
```bash
curl -X GET \
  http://your-domain.com/api/categories/sub/60d21b4667d0d8992e610c85 \
  -H 'Authorization: Bearer <user_token>'
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "categoryId": "60d21b4667d0d8992e610c86",
            "name": "Action Movies",
            "title": "Best Action Movies Collection",
            "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/categories/1234567890-image.jpg",
            "telegramUrl": "https://t.me/actionmovies",
            "isPremium": true
        },
        {
            "categoryId": "60d21b4667d0d8992e610c88",
            "name": "Comedy Movies",
            "title": "Funny Movies Collection",
            "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/categories/1234567891-image.jpg",
            "telegramUrl": "https://t.me/comedymovies",
            "isPremium": false
        }
    ]
}
```

### 5. Get Single Category
Retrieves a specific category with its subcategories (if it's a main category).

**Endpoint:** `GET /categories/:id`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Example Request:**
```bash
curl -X GET \
  http://your-domain.com/api/categories/60d21b4667d0d8992e610c85 \
  -H 'Authorization: Bearer <user_token>'
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "categoryId": "60d21b4667d0d8992e610c85",
        "name": "Movies",
        "isMainCategory": true,
        "parentCategoryId": null,
        "subcategories": [
            {
                "categoryId": "60d21b4667d0d8992e610c86",
                "name": "Action Movies",
                "title": "Best Action Movies Collection",
                "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/categories/1234567890-image.jpg",
                "telegramUrl": "https://t.me/actionmovies",
                "isPremium": true
            }
        ]
    }
}
```

### 6. Update Category (Admin Only)
Updates an existing category.

**Endpoint:** `PUT /categories/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
name: string (required)
title: string (required for subcategories)
telegramUrl: string (required for subcategories)
isPremium: boolean (optional for subcategories)
image: file (optional for subcategories, max size: 5MB, formats: jpg, jpeg, png)
```

**Example Request:**
```bash
curl -X PUT \
  http://your-domain.com/api/categories/60d21b4667d0d8992e610c86 \
  -H 'Authorization: Bearer <admin_token>' \
  -F 'name=Updated Action Movies' \
  -F 'title=Updated Action Movies Collection' \
  -F 'telegramUrl=https://t.me/updatedactionmovies' \
  -F 'isPremium=true' \
  -F 'image=@/path/to/new-image.jpg'
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "categoryId": "60d21b4667d0d8992e610c86",
        "name": "Updated Action Movies",
        "isMainCategory": false,
        "parentCategoryId": "60d21b4667d0d8992e610c85",
        "title": "Updated Action Movies Collection",
        "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/categories/1234567892-image.jpg",
        "telegramUrl": "https://t.me/updatedactionmovies",
        "isPremium": true
    }
}
```

### 7. Delete Category (Admin Only)
Deletes a category. If it's a main category, all its subcategories will also be deleted.

**Endpoint:** `DELETE /categories/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Example Request:**
```bash
curl -X DELETE \
  http://your-domain.com/api/categories/60d21b4667d0d8992e610c85 \
  -H 'Authorization: Bearer <admin_token>'
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "message": "Category deleted successfully"
}
```

## Common Error Codes
- 400: Bad Request - Invalid input data
- 401: Unauthorized - Missing or invalid authentication token
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource not found
- 500: Internal Server Error - Server-side error

## Notes
1. Main categories only require a name
2. Subcategories require name, title, image, and telegram URL
3. All image uploads are limited to 5MB
4. Supported image formats: JPG, JPEG, PNG
5. Premium content is only accessible to premium users
6. Admin operations require admin privileges
7. All timestamps are in UTC
8. Image URLs are stored in AWS S3 and are publicly accessible
9. Deleting a main category will delete all its subcategories 