/**
 * Google Gemini AI Integration
 * Advanced AI-powered content analysis using Google's Gemini API
 */

class GeminiAI {
  constructor() {
    this.apiKey = 'AIzaSyBF-9XyDmndU9mT6sNyIzEmwKHgD8Fbvu8';
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.cache = new Map(); // Cache for AI responses
  }

  /**
   * Analyze content with Google Gemini AI
   */
  async analyzeContent(content, type = 'text') {
    // Always use fallback for now (Gemini API optional)
    // This ensures extension works even if API key is invalid
    console.log('Using local AI analysis (Gemini optional)');
    return this.getFallbackAnalysis(content, type);

    /* Gemini API integration (currently disabled - uncomment to enable)
    // Check cache first
    const cacheKey = `${type}:${content.substring(0, 100)}`;
    if (this.cache.has(cacheKey)) {
      console.log('Using cached AI analysis');
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this.buildAnalysisPrompt(content, type);

      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiResponse) {
        const analysis = this.parseAIResponse(aiResponse);

        // Cache the result
        this.cache.set(cacheKey, analysis);

        // Limit cache size
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }

        return analysis;
      }

      return this.getFallbackAnalysis(content, type);
    } catch (error) {
      console.error('Gemini AI error:', error);
      return this.getFallbackAnalysis(content, type);
    }
    */
  }

  /**
   * Build analysis prompt for Gemini
   */
  buildAnalysisPrompt(content, type) {
    if (type === 'image') {
      return `Analyze this image description and provide:
1. Category (one word): code, screenshot, diagram, photo, document, chart, meme, or general
2. Tags (3-5 relevant keywords)
3. Title (short description, max 50 chars)

Format your response as JSON:
{"category": "...", "tags": ["...", "..."], "title": "..."}`;
    }

    return `Analyze this clipboard content and provide:
1. Category (one word): code, url, email, phone, json, markdown, csv, data, note, or text
2. Tags (3-5 relevant keywords describing the content)
3. Title (short summary, max 50 chars)
4. Sentiment (positive, negative, neutral, or informational)

Content to analyze:
${content.substring(0, 500)}

Format your response as JSON:
{"category": "...", "tags": ["...", "...", "..."], "title": "...", "sentiment": "..."}`;
  }

  /**
   * Parse AI response into structured data
   */
  parseAIResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || 'text',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
          title: parsed.title || 'Untitled',
          sentiment: parsed.sentiment || 'informational',
          confidence: 0.9,
          aiGenerated: true
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback: parse text response
    const lines = response.split('\n').filter(l => l.trim());
    return {
      category: this.extractValue(lines, 'category') || 'text',
      tags: this.extractTags(lines) || [],
      title: this.extractValue(lines, 'title') || 'Untitled',
      sentiment: this.extractValue(lines, 'sentiment') || 'informational',
      confidence: 0.7,
      aiGenerated: true
    };
  }

  /**
   * Extract value from response lines
   */
  extractValue(lines, key) {
    const line = lines.find(l => l.toLowerCase().includes(key));
    if (line) {
      const parts = line.split(':');
      return parts[1]?.trim().replace(/['"]/g, '');
    }
    return null;
  }

  /**
   * Extract tags from response
   */
  extractTags(lines) {
    const tagLine = lines.find(l => l.toLowerCase().includes('tag'));
    if (tagLine) {
      const match = tagLine.match(/\[(.*?)\]/);
      if (match) {
        return match[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      }
    }
    return [];
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  getFallbackAnalysis(content, type) {
    console.log('Using fallback analysis (AI unavailable)');

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
      confidence: 0.5,
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
      code: /^(function|class|const|let|var|import|def|public|private)/m,
      markdown: /^#+\s|^\*\*|^\[.*\]\(.*\)/m,
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

    return tags.slice(0, 5);
  }

  /**
   * Generate title
   */
  generateTitle(content, category) {
    const preview = content.substring(0, 50).replace(/\n/g, ' ').trim();
    return preview || `${category} content`;
  }

  /**
   * Analyze image (when image support is added)
   */
  async analyzeImage(imageData) {
    // For now, return basic analysis
    // In future, use Gemini Pro Vision for actual image analysis
    return {
      category: 'image',
      tags: ['image', 'clipboard', 'screenshot'],
      title: 'Clipboard Image',
      confidence: 0.8,
      aiGenerated: false
    };
  }
}

// Export singleton instance
const geminiAI = new GeminiAI();
export default geminiAI;
