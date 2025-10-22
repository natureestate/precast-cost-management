import { EmbeddingService } from './embeddings';
import { DatabaseQueries } from '../db/queries';
import { RAGQueryInput, RAGResponse, VectorSearchResult } from '../types';

export class RAGService {
  private embeddingService: EmbeddingService;
  private dbQueries: DatabaseQueries;

  constructor(
    private ai: Ai,
    private db: D1Database,
    private vectorize: VectorizeIndex
  ) {
    this.embeddingService = new EmbeddingService(ai);
    this.dbQueries = new DatabaseQueries(db);
  }

  /**
   * Index a document into the vector database
   */
  async indexDocument(
    documentId: number,
    documentText: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Chunk the text
      const chunks = this.embeddingService.chunkText(documentText);

      // Generate embeddings for all chunks
      const embeddings = await this.embeddingService.generateBatchEmbeddings(chunks);

      // Prepare vectors for insertion
      const vectors = chunks.map((chunk, index) => ({
        id: `doc_${documentId}_chunk_${index}`,
        values: embeddings[index].embedding,
        metadata: {
          document_id: documentId,
          chunk_index: index,
          chunk_text: chunk,
          ...metadata,
        },
      }));

      // Insert into Vectorize
      await this.vectorize.insert(vectors);

      // Store metadata in D1
      for (let i = 0; i < chunks.length; i++) {
        await this.dbQueries.createVectorMetadata({
          document_id: documentId,
          chunk_index: i,
          chunk_text: chunks[i],
          vector_id: `doc_${documentId}_chunk_${i}`,
        });
      }

      // Update document status
      await this.dbQueries.updateDocumentVectorStatus(
        documentId,
        `doc_${documentId}`
      );

      console.log(`Indexed document ${documentId} with ${chunks.length} chunks`);
    } catch (error) {
      console.error('Error indexing document:', error);
      throw new Error('Failed to index document');
    }
  }

  /**
   * Query the RAG system
   */
  async query(input: RAGQueryInput): Promise<RAGResponse> {
    try {
      // Step 1: Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(input.query);

      // Step 2: Search for similar vectors
      const topK = input.topK || 5;
      const vectorResults = await this.vectorize.query(queryEmbedding.embedding, {
        topK,
        returnMetadata: true,
      });

      // Step 3: Retrieve full context from D1
      const sources = await this.retrieveSourceContext(vectorResults.matches);

      // Step 4: Get relevant cost data
      const costContext = await this.getCostContext(input.project_id);

      // Step 5: Generate response using LLM
      const answer = await this.generateAnswer(
        input.query,
        sources,
        costContext
      );

      // Step 6: Extract cost breakdown if available
      const costBreakdown = this.extractCostBreakdown(answer, costContext);

      return {
        answer,
        sources: sources.map((s) => ({
          document: s.filename || 'Unknown',
          relevance: s.score,
          chunk_text: s.chunk_text,
        })),
        cost_breakdown: costBreakdown,
      };
    } catch (error) {
      console.error('Error processing RAG query:', error);
      throw new Error('Failed to process query');
    }
  }

  /**
   * Retrieve source context from vector search results
   */
  private async retrieveSourceContext(
    matches: VectorSearchResult[]
  ): Promise<any[]> {
    const sources = [];

    for (const match of matches) {
      const metadata = match.metadata as any;
      const documentId = metadata?.document_id;

      if (documentId) {
        const document = await this.dbQueries.getDocument(documentId);
        sources.push({
          ...metadata,
          filename: document?.filename,
          score: match.score,
        });
      }
    }

    return sources;
  }

  /**
   * Get cost context for the query
   */
  private async getCostContext(projectId?: number): Promise<string> {
    let context = '';

    try {
      // Get recent production costs
      const productionCosts = await this.dbQueries.getProductionCosts(
        undefined,
        undefined,
        undefined
      );

      if (productionCosts.length > 0) {
        const avgProductionCost =
          productionCosts.reduce((sum, c) => sum + c.cost_per_unit, 0) /
          productionCosts.length;
        context += `ต้นทุนการผลิตเฉลี่ยต่อหน่วย: ${avgProductionCost.toFixed(2)} บาท\n`;
      }

      // Get project-specific costs if project_id provided
      if (projectId) {
        const project = await this.dbQueries.getProject(projectId);
        if (project) {
          context += `\nโปรเจค: ${project.name}\n`;
          context += `ต้นทุนประมาณการ: ${project.total_estimated_cost || 0} บาท\n`;
          context += `ต้นทุนจริง: ${project.total_actual_cost || 0} บาท\n`;
        }

        const transportCosts = await this.dbQueries.getTransportationCosts(projectId);
        if (transportCosts.length > 0) {
          const avgTransportCost =
            transportCosts.reduce((sum, c) => sum + c.total_cost, 0) /
            transportCosts.length;
          context += `ต้นทุนขนส่งเฉลี่ย: ${avgTransportCost.toFixed(2)} บาท\n`;
        }

        const installCosts = await this.dbQueries.getInstallationCosts(projectId);
        if (installCosts.length > 0) {
          const avgInstallCost =
            installCosts.reduce((sum, c) => sum + c.total_cost, 0) /
            installCosts.length;
          context += `ต้นทุนติดตั้งเฉลี่ย: ${avgInstallCost.toFixed(2)} บาท\n`;
        }
      }
    } catch (error) {
      console.error('Error getting cost context:', error);
    }

    return context || 'ไม่มีข้อมูลต้นทุนในระบบ';
  }

  /**
   * Generate answer using LLM
   */
  private async generateAnswer(
    query: string,
    sources: any[],
    costContext: string
  ): Promise<string> {
    // Build context from sources
    const documentContext = sources
      .map((s, i) => `[เอกสาร ${i + 1}]: ${s.chunk_text}`)
      .join('\n\n');

    const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ต้นทุนสำหรับบริษัทผลิตคอนกรีตพรีคาสท์ในประเทศไทย

บทบาทของคุณ:
- วิเคราะห์ต้นทุนการผลิต ขนส่ง และติดตั้ง
- ให้การประมาณการต้นทุนที่แม่นยำจากข้อมูลในอดีต
- อธิบายการแบ่งต้นทุนอย่างชัดเจนเป็นภาษาไทย
- แนะนำกลยุทธ์การลดต้นทุน

บริบทจากเอกสาร:
${documentContext}

ข้อมูลต้นทุนปัจจุบัน:
${costContext}

แนวทางในการตอบ:
- อ้างอิงแหล่งที่มาเมื่อพูดถึงเอกสารเฉพาะ
- ใช้หน่วยเงินบาท (฿) สำหรับค่าทั้งหมด
- จัดรูปแบบตัวเลขด้วยเครื่องหมายจุลภาค (เช่น 8,500 บาท)
- ให้รายละเอียดและแบ่งย่อยที่ชัดเจน
- ถ้าข้อมูลไม่เพียงพอ ให้ระบุชัดเจนว่าขาดอะไร`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      return (response as any).response || 'ไม่สามารถสร้างคำตอบได้';
    } catch (error) {
      console.error('Error generating answer:', error);
      return 'เกิดข้อผิดพลาดในการสร้างคำตอบ กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * Extract cost breakdown from answer and context
   */
  private extractCostBreakdown(
    answer: string,
    costContext: string
  ): { material?: number; labor?: number; overhead?: number; total?: number } | undefined {
    // This is a simple extraction - could be enhanced with more sophisticated parsing
    const breakdown: any = {};

    // Try to extract numbers from the answer
    const materialMatch = answer.match(/วัตถุดิบ[:\s]+([0-9,]+)/);
    const laborMatch = answer.match(/ค่าแรง[:\s]+([0-9,]+)/);
    const overheadMatch = answer.match(/ค่าโสหุ้ย[:\s]+([0-9,]+)/);
    const totalMatch = answer.match(/รวม[:\s]+([0-9,]+)/);

    if (materialMatch) breakdown.material = parseFloat(materialMatch[1].replace(/,/g, ''));
    if (laborMatch) breakdown.labor = parseFloat(laborMatch[1].replace(/,/g, ''));
    if (overheadMatch) breakdown.overhead = parseFloat(overheadMatch[1].replace(/,/g, ''));
    if (totalMatch) breakdown.total = parseFloat(totalMatch[1].replace(/,/g, ''));

    return Object.keys(breakdown).length > 0 ? breakdown : undefined;
  }
}
