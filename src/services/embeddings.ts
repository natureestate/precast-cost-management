import { EmbeddingResult } from '../types';

export class EmbeddingService {
  constructor(private ai: Ai) {}

  /**
   * Generate embeddings for text using Workers AI
   * Model: @cf/baai/bge-base-en-v1.5 (768 dimensions)
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
        text: [text],
      });

      // Workers AI returns embeddings in the format: { data: [[...]] }
      const embedding = (response as any).data[0];

      return {
        embedding,
        dimensions: embedding.length,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
        text: texts,
      });

      const embeddings = (response as any).data;

      return embeddings.map((embedding: number[]) => ({
        embedding,
        dimensions: embedding.length,
      }));
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error('Failed to generate batch embeddings');
    }
  }

  /**
   * Chunk text into smaller pieces for embedding
   * Default chunk size: 512 tokens (~400 words)
   * Default overlap: 50 tokens
   */
  chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
    // Simple word-based chunking
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
      i += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Prepare text for embedding (clean and normalize)
   */
  prepareText(text: string): string {
    // Remove extra whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Remove special characters that might interfere
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return cleaned;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
