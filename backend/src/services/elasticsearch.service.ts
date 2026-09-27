import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { prisma } from '../config/db';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const esClient = new Client({
  node: esNode,
});

const INDEX_NAME = 'emails';
let isEsConnected = false;

export async function initElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (ping) {
      isEsConnected = true;
      console.log('✅ Elasticsearch connected successfully');

      const exists = await esClient.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await esClient.indices.create({
          index: INDEX_NAME,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: { type: 'text' },
              subject: { type: 'text' },
              bodyHtml: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        });
        console.log(`🔍 Elasticsearch index '${INDEX_NAME}' created`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Elasticsearch not reachable. Falling back to DB search mode.');
    isEsConnected = false;
  }
}

export async function indexEmailInEs(emailData: any) {
  if (!isEsConnected) return;

  try {
    await esClient.index({
      index: INDEX_NAME,
      id: emailData.id,
      document: {
        id: emailData.id,
        senderEmail: emailData.senderEmail,
        recipientEmail: emailData.recipientEmail,
        subject: emailData.subject,
        bodyHtml: emailData.bodyHtml,
        status: emailData.status,
        scheduledAt: emailData.scheduledAt ? new Date(emailData.scheduledAt).toISOString() : null,
        sentAt: emailData.sentAt ? new Date(emailData.sentAt).toISOString() : null,
        createdAt: emailData.createdAt ? new Date(emailData.createdAt).toISOString() : new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.warn('⚠️ ES Indexing warning:', err.message);
  }
}

export async function searchEmailsInEs(searchTerm: string, status?: string) {
  if (isEsConnected) {
    try {
      const mustClauses: any[] = [];
      
      if (searchTerm && searchTerm.trim() !== '') {
        mustClauses.push({
          multi_match: {
            query: searchTerm,
            fields: ['recipientEmail', 'subject', 'bodyHtml', 'senderEmail'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (status) {
        mustClauses.push({ term: { status: status.toUpperCase() } });
      }

      const response = await esClient.search({
        index: INDEX_NAME,
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
        sort: [{ scheduledAt: { order: 'desc' } }],
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error: any) {
      console.warn('⚠️ ES Search error, falling back to DB:', error.message);
    }
  }

  // Database fallback search
  const whereClause: any = {};
  if (status) {
    whereClause.status = status.toUpperCase();
  }
  if (searchTerm && searchTerm.trim() !== '') {
    whereClause.OR = [
      { recipientEmail: { contains: searchTerm } },
      { subject: { contains: searchTerm } },
      { bodyHtml: { contains: searchTerm } },
    ];
  }

  return await prisma.emailSchedule.findMany({
    where: whereClause,
    orderBy: { scheduledAt: 'desc' },
  });
}
