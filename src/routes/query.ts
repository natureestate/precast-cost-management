import { Hono } from 'hono';
import { Env, RAGQueryInput, APIResponse } from '../types';
import { RAGService } from '../services/rag';

const query = new Hono<{ Bindings: Env }>();

// POST /api/query - Query the RAG system
query.post('/', async (c) => {
  try {
    const body = await c.req.json<RAGQueryInput>();

    // Validation
    if (!body.query) {
      return c.json(
        {
          success: false,
          error: 'Query is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Initialize RAG service
    const ragService = new RAGService(c.env.AI, c.env.DB, c.env.VECTORIZE);

    // Execute query
    const result = await ragService.query({
      query: body.query,
      project_id: body.project_id,
      topK: body.topK || 5,
    });

    const response: APIResponse = {
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to process query',
        code: 'SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /api/query/index - Manually index a document
query.post('/index', async (c) => {
  try {
    const body = await c.req.json<{
      document_id: number;
      text: string;
      metadata?: Record<string, any>;
    }>();

    // Validation
    if (!body.document_id || !body.text) {
      return c.json(
        {
          success: false,
          error: 'document_id and text are required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Initialize RAG service
    const ragService = new RAGService(c.env.AI, c.env.DB, c.env.VECTORIZE);

    // Index the document
    await ragService.indexDocument(
      body.document_id,
      body.text,
      body.metadata || {}
    );

    const response: APIResponse = {
      success: true,
      data: {
        message: 'Document indexed successfully',
        document_id: body.document_id,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error indexing document:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to index document',
        code: 'SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default query;
