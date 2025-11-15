/**
 * GROQ AI Integration
 * Ultra-fast AI-powered content analysis using GROQ API (faster than GPT!)
 */

class GroqAI {
  constructor() {
    // API key is loaded from chrome.storage.sync (user configurable)
    this.apiKey = '';
    this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.1-8b-instant'; // Ultra-fast Llama model
    this.cache = new Map(); // Cache for AI responses
    this.isInitialized = false;
  }

  /**
   * Initialize and load API key from storage
   */
  async init() {
    if (this.isInitialized) return;

    try {
      const result = await chrome.storage.sync.get(['groqApiKey']);
      this.apiKey = result.groqApiKey || '';
      this.isInitialized = true;
      console.log('✓ GROQ AI initialized', this.apiKey ? '(API key loaded)' : '(no API key)');
    } catch (error) {
      console.error('Failed to load GROQ API key:', error);
    }
  }

  /**
   * Set API key
   */
  async setApiKey(key) {
    this.apiKey = key;
    await chrome.storage.sync.set({ groqApiKey: key });
    console.log('✓ GROQ API key saved');
  }

  /**
   * Analyze content with GROQ AI (super fast!)
   */
  async analyzeContent(content, type = 'text') {
    // Initialize if needed
    await this.init();

    // If no API key, use fallback
    if (!this.apiKey) {
      console.log('No GROQ API key - using fallback');
      return this.getFallbackAnalysis(content, type);
    }

    // Check cache first
    const cacheKey = `${type}:${content.substring(0, 100)}`;
    if (this.cache.has(cacheKey)) {
      console.log('✓ Using cached AI analysis');
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this.buildAnalysisPrompt(content, type);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.3,
          max_tokens: 200,
          top_p: 1
        })
      });

      if (!response.ok) {
        console.error('GROQ API error:', response.status);
        throw new Error(`GROQ API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        console.log('✓ GROQ AI response received');
        const analysis = this.parseAIResponse(aiResponse, content);

        // Cache the result
        this.cache.set(cacheKey, analysis);

        // Limit cache size
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }

        return analysis;
      }

      throw new Error('No AI response');
    } catch (error) {
      console.log('Using fallback analysis (GROQ unavailable)');
      return this.getFallbackAnalysis(content, type);
    }
  }

  /**
   * Build analysis prompt for GROQ
   */
  buildAnalysisPrompt(content, type) {
    const preview = content.substring(0, 500);

    return `Analyze this clipboard content and provide a JSON response:

Content: "${preview}"

Provide:
1. category (ONE word): code, url, email, phone, json, markdown, csv, data, note, or text
2. tags (3-5 keywords describing content)
3. title (short summary, max 40 chars)
4. sentiment: positive, negative, neutral, or informational

Respond ONLY with valid JSON:
{"category": "...", "tags": ["...", "...", "..."], "title": "...", "sentiment": "..."}`;
  }

  /**
   * Parse GROQ AI response into structured data
   */
  parseAIResponse(response, content) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          category: this.normalizeCategory(parsed.category) || 'text',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
          title: parsed.title || content.substring(0, 40),
          sentiment: parsed.sentiment || 'informational',
          confidence: 0.95,
          aiGenerated: true,
          aiProvider: 'GROQ'
        };
      }
    } catch (error) {
      console.error('Failed to parse GROQ response:', error);
    }

    // Fallback parsing
    return this.getFallbackAnalysis(content, 'text');
  }

  /**
   * Normalize category to valid values
   */
  normalizeCategory(cat) {
    const validCategories = ['code', 'url', 'email', 'phone', 'json', 'markdown', 'csv', 'data', 'note', 'text', 'image'];
    const normalized = cat?.toLowerCase().trim();

    if (validCategories.includes(normalized)) {
      return normalized;
    }

    // Map common variations
    const mappings = {
      'link': 'url',
      'website': 'url',
      'mail': 'email',
      'number': 'phone',
      'programming': 'code',
      'script': 'code',
      'document': 'text',
      'message': 'text',
      'table': 'csv'
    };

    return mappings[normalized] || 'text';
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  getFallbackAnalysis(content, type) {
    console.log('Using pattern-based analysis fallback');

    if (type === 'image') {
      return {
        category: 'image',
        tags: ['image', 'clipboard'],
        title: 'Clipboard Image',
        confidence: 0.5,
        aiGenerated: false
      };
    }

    // Basic pattern matching for fallback
    const category = this.detectCategory(content);
    const tags = this.generateBasicTags(content, category);

    return {
      category: category,
      tags: tags,
      title: this.generateTitle(content, category),
      sentiment: 'informational',
      confidence: 0.6,
      aiGenerated: false
    };
  }

  /**
   * Detect category using patterns
   */
  detectCategory(content) {
    const patterns = {
      url: /^https?:\/\//i,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\d\s\-\+\(\)]{10,}$/,
      json: /^\s*[\{\[]/,
      code: /^(function|class|const|let|var|import|def|public|private|package)/m,
      markdown: /^#+\s|^\*\*|^\[.*\]\(.*\)|^```/m,
      csv: /^[^,\n]+,[^,\n]+/m
    };

    for (const [cat, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        return cat;
      }
    }

    return 'text';
  }

  /**
   * Generate basic tags
   */
  generateBasicTags(content, category) {
    const tags = [category];

    if (content.length > 500) tags.push('long');
    if (content.includes('\n')) tags.push('multiline');
    if (/\d{4}-\d{2}-\d{2}/.test(content)) tags.push('date');
    if (/\$[\d,]+/.test(content)) tags.push('price');
    if (/https?:\/\//.test(content)) tags.push('link');

    return tags.slice(0, 5);
  }

  /**
   * Generate title
   */
  generateTitle(content, category) {
    const preview = content.substring(0, 40).replace(/\n/g, ' ').trim();
    return preview || `${category} content`;
  }
}

// Export singleton instance
const groqAI = new GroqAI();
export default groqAI;
