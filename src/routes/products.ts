import { Hono } from 'hono';
import { Env, Product, APIResponse } from '../types';
import { DatabaseQueries } from '../db/queries';

const products = new Hono<{ Bindings: Env }>();

// GET /api/products - Get all products
products.get('/', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const category = c.req.query('category');

    let productList: Product[];
    if (category) {
      productList = await dbQueries.getProductsByCategory(category);
    } else {
      productList = await dbQueries.getAllProducts();
    }

    const response: APIResponse<Product[]> = {
      success: true,
      data: productList,
      metadata: {
        timestamp: new Date().toISOString(),
        count: productList.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch products',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/products/:id - Get product by ID
products.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid product ID',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const product = await dbQueries.getProduct(id);

    if (!product) {
      return c.json(
        {
          success: false,
          error: 'Product not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const response: APIResponse<Product> = {
      success: true,
      data: product,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch product',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /api/products - Create new product
products.post('/', async (c) => {
  try {
    const body = await c.req.json<Product>();

    // Validation
    if (!body.name || !body.category || !body.unit) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: name, category, unit',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const productId = await dbQueries.createProduct({
      name: body.name,
      category: body.category,
      unit: body.unit,
      description: body.description,
    });

    const product = await dbQueries.getProduct(productId);

    const response: APIResponse<Product> = {
      success: true,
      data: product!,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create product',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default products;
