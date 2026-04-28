import { NextResponse } from 'next/server'

// GET /api/v1/docs - API Documentation
export async function GET() {
  const documentation = {
    title: 'Storify API Documentation',
    version: '1.0.0',
    description: 'Multi-Store Order Management System REST API',
    baseUrl: '/api/v1',
    
    authentication: {
      type: 'Bearer Token (JWT)',
      description: 'Include the access token in the Authorization header',
      example: 'Authorization: Bearer <access_token>',
      endpoints: {
        login: {
          method: 'POST',
          path: '/auth/login',
          body: { email: 'string', password: 'string' },
          response: { user: 'object', accessToken: 'string', refreshToken: 'string', expiresIn: 'number' },
        },
        refresh: {
          method: 'POST',
          path: '/auth/refresh',
          body: { refreshToken: 'string' },
          response: { accessToken: 'string', refreshToken: 'string', expiresIn: 'number' },
        },
      },
    },
    
    endpoints: {
      stores: {
        list: {
          method: 'GET',
          path: '/stores',
          auth: true,
          query: { page: 'number', limit: 'number', search: 'string' },
          response: { data: 'Store[]', pagination: 'object' },
        },
        create: {
          method: 'POST',
          path: '/stores',
          auth: true,
          body: { name: 'string', nameAr: 'string', slug: 'string', description: 'string?', descriptionAr: 'string?' },
          response: { data: 'Store' },
        },
        get: {
          method: 'GET',
          path: '/stores/{slug}',
          auth: false,
          response: { data: 'Store with products' },
        },
      },
      
      products: {
        list: {
          method: 'GET',
          path: '/products',
          auth: true,
          query: {
            page: 'number',
            limit: 'number',
            store_id: 'string?',
            category_id: 'string?',
            product_type_id: 'string?',
            search: 'string?',
            min_price: 'number?',
            max_price: 'number?',
          },
          response: { data: 'Product[]', pagination: 'object' },
        },
        create: {
          method: 'POST',
          path: '/products',
          auth: true,
          body: {
            storeId: 'string',
            productTypeId: 'string?',
            categoryId: 'string?',
            name: 'string',
            nameAr: 'string',
            description: 'string?',
            descriptionAr: 'string?',
            price: 'number',
            discount: 'number?',
            discountEndDate: 'string?',
            customData: 'object?',
            images: 'string[]?',
            videos: 'string[]?',
          },
          response: { data: 'Product' },
        },
      },
      
      orders: {
        list: {
          method: 'GET',
          path: '/orders',
          auth: true,
          query: {
            page: 'number',
            limit: 'number',
            store_id: 'string?',
            status: 'OrderStatus?',
            buyer_id: 'string?',
            start_date: 'string?',
            end_date: 'string?',
          },
          response: { data: 'Order[]', pagination: 'object' },
        },
        create: {
          method: 'POST',
          path: '/orders',
          auth: true,
          body: {
            storeId: 'string',
            productId: 'string',
            buyerId: 'string',
            quantity: 'number?',
            notes: 'string?',
          },
          response: { data: 'Order' },
        },
        updateStatus: {
          method: 'PATCH',
          path: '/orders/{id}/status',
          auth: true,
          body: { status: 'OrderStatus', internalNotes: 'string?' },
          response: { data: { order: 'Order', auditLog: 'AuditLog' } },
        },
      },
      
      buyers: {
        list: {
          method: 'GET',
          path: '/buyers',
          auth: true,
          query: {
            page: 'number',
            limit: 'number',
            phone: 'string?',
            risk_level: 'low|medium|high?',
            blacklisted: 'boolean?',
          },
          response: { data: 'Buyer | Buyer[]', pagination: 'object?' },
        },
        create: {
          method: 'POST',
          path: '/buyers',
          auth: true,
          body: {
            phone: 'string',
            name: 'string',
            governorate: 'string',
            district: 'string',
            landmark: 'string?',
          },
          response: { data: 'Buyer' },
        },
      },
      
      analytics: {
        get: {
          method: 'GET',
          path: '/analytics',
          auth: true,
          query: { store_id: 'string?', period: 'number?' },
          response: {
            data: {
              summary: 'object',
              statusDistribution: 'object',
              topProducts: 'array',
              dailyOrders: 'array',
              storePerformance: 'array',
              riskDistribution: 'object',
            },
          },
        },
      },
      
      media: {
        get: {
          method: 'GET',
          path: '/media/{id}',
          auth: 'required for private/restricted',
          query: { token: 'string? (signed URL token)' },
          response: { data: 'Media' },
        },
        generateSignedUrl: {
          method: 'POST',
          path: '/media/{id}',
          auth: true,
          response: { data: { signedUrl: 'string', expiresAt: 'string' } },
        },
      },
    },
    
    types: {
      OrderStatus: ['pending', 'confirmed', 'delivered', 'returned', 'problematic'],
      BuyerRisk: ['low', 'medium', 'high'],
      MediaVisibility: ['public', 'private', 'restricted'],
      UserRole: ['admin', 'store_owner'],
      UserMode: ['controlled', 'unlimited'],
      SubscriptionPlan: ['starter', 'pro', 'business', 'enterprise'],
    },
    
    rateLimit: {
      description: 'Rate limiting is applied per user/IP',
      limits: {
        authenticated: '100 requests per minute',
        unauthenticated: '20 requests per minute',
      },
    },
    
    errors: {
      400: 'Bad Request - Invalid input',
      401: 'Unauthorized - Missing or invalid token',
      403: 'Forbidden - Insufficient permissions or plan limits',
      404: 'Not Found - Resource does not exist',
      409: 'Conflict - Resource already exists',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error',
    },
  }

  return NextResponse.json(documentation)
}
