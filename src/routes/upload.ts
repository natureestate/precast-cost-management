import { Hono } from 'hono';
import { Env, APIResponse } from '../types';
import { DatabaseQueries } from '../db/queries';
import { RAGService } from '../services/rag';

const upload = new Hono<{ Bindings: Env }>();

// POST /api/documents/upload - Upload and index document
upload.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('project_id') as string;
    const fileType = formData.get('file_type') as string;

    // Validation
    if (!file) {
      return c.json(
        {
          success: false,
          error: 'No file provided',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    if (!fileType) {
      return c.json(
        {
          success: false,
          error: 'File type is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json(
        {
          success: false,
          error: 'File size exceeds 10MB limit',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = file.name;
    const filePath = `${timestamp}-${filename}`;

    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(filePath, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Save document metadata to D1
    const dbQueries = new DatabaseQueries(c.env.DB);
    const documentId = await dbQueries.createDocument({
      project_id: projectId ? parseInt(projectId) : undefined,
      filename,
      file_path: filePath,
      file_type: fileType,
      file_size: file.size,
      vector_indexed: false,
    });

    // Extract text and index (for text-based documents)
    let indexed = false;
    if (file.type === 'text/plain' || fileType === 'report') {
      try {
        const text = await file.text();
        const ragService = new RAGService(c.env.AI, c.env.DB, c.env.VECTORIZE);

        await ragService.indexDocument(documentId, text, {
          project_id: projectId ? parseInt(projectId) : undefined,
          file_type: fileType,
          filename,
        });

        indexed = true;
      } catch (error) {
        console.error('Error indexing document:', error);
        // Continue even if indexing fails
      }
    }

    const response: APIResponse = {
      success: true,
      data: {
        document_id: documentId,
        filename,
        file_path: filePath,
        file_size: file.size,
        file_type: fileType,
        vector_indexed: indexed,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error uploading document:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to upload document',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/documents - Get documents
upload.get('/', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const projectId = c.req.query('project_id');

    let documents;
    if (projectId) {
      documents = await dbQueries.getDocumentsByProject(parseInt(projectId));
    } else {
      // For now, return empty array if no project_id
      // Could implement getAllDocuments if needed
      documents = [];
    }

    const response: APIResponse = {
      success: true,
      data: documents,
      metadata: {
        timestamp: new Date().toISOString(),
        count: documents.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch documents',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/documents/:id - Get document by ID
upload.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid document ID',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const document = await dbQueries.getDocument(id);

    if (!document) {
      return c.json(
        {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const response: APIResponse = {
      success: true,
      data: document,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching document:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch document',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/documents/:id/download - Download document from R2
upload.get('/:id/download', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid document ID',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const document = await dbQueries.getDocument(id);

    if (!document) {
      return c.json(
        {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Get file from R2
    const object = await c.env.BUCKET.get(document.file_path);

    if (!object) {
      return c.json(
        {
          success: false,
          error: 'File not found in storage',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Return file
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to download document',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default upload;
