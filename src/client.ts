import axios from 'axios';
import MediumAuth from './auth';

interface PublishArticleParams {
  title: string;
  content: string;
  tags?: string[];
  publicationId?: string;
}

interface SearchArticlesParams {
  keywords?: string[];
  publicationId?: string;
  tags?: string[];
}

class MediumClient {
  private auth: MediumAuth;
  private baseUrl = 'https://api.medium.com/v1';

  constructor(auth: MediumAuth) {
    this.auth = auth;
  }

  private async makeRequest(method: 'get' | 'post', endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.auth.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data
      });
      return response.data;
    } catch (error: any) {
      console.error('Medium API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async publishArticle(params: PublishArticleParams) {
    return this.makeRequest('post', '/publications', {
      title: params.title,
      contentFormat: 'markdown',
      content: params.content,
      tags: params.tags,
      publishStatus: 'draft'
    });
  }

  async getUserPublications() {
    return this.makeRequest('get', '/publications');
  }

  async searchArticles(params: SearchArticlesParams) {
    const queryParams = new URLSearchParams();
    
    if (params.keywords) {
      params.keywords.forEach(keyword => 
        queryParams.append('q', keyword)
      );
    }

    if (params.publicationId) {
      queryParams.append('publicationId', params.publicationId);
    }

    if (params.tags) {
      params.tags.forEach(tag => 
        queryParams.append('tag', tag)
      );
    }

    return this.makeRequest('get', `/articles?${queryParams.toString()}`);
  }

  async getDrafts() {
    return this.makeRequest('get', '/drafts');
  }

  async getUserProfile() {
    return this.makeRequest('get', '/me');
  }

  async createDraft(params: { 
    title: string, 
    content: string, 
    tags?: string[] 
  }) {
    return this.makeRequest('post', '/drafts', {
      title: params.title,
      contentFormat: 'markdown',
      content: params.content,
      tags: params.tags
    });
  }
}

export default MediumClient;
