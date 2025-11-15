/**
 * AI-Powered Tagging Engine
 * Intelligently categorizes and tags clipboard content using NLP techniques
 */

class AITagger {
  constructor() {
    // Pattern matchers for content detection
    this.patterns = {
      url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      ipAddress: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
      hexColor: /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i,
      creditCard: /^(?:\d{4}[-\s]?){3}\d{4}$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      date: /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/,
      time: /\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?/i,
      json: /^\s*[\{\[][\s\S]*[\}\]]\s*$/,
      base64: /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/
    };

    // Programming language detection patterns
    this.codePatterns = {
      javascript: [/\bfunction\b/, /\bconst\b/, /\blet\b/, /\bvar\b/, /=>/, /\bimport\b/, /\brequire\(/],
      python: [/\bdef\b/, /\bimport\b/, /\bfrom\b.*\bimport\b/, /\bclass\b/, /\bif\b.*:/, /\belif\b/, /:\s*$/m],
      java: [/\bpublic\b/, /\bprivate\b/, /\bclass\b/, /\bvoid\b/, /\bSystem\.out\.println/, /\bextends\b/],
      cpp: [/\b#include\b/, /\bstd::/, /\bcout\b/, /\bcin\b/, /\bnamespace\b/],
      csharp: [/\busing\b/, /\bnamespace\b/, /\bpublic\b/, /\bprivate\b/, /\bclass\b/, /\bvoid\b/],
      html: [/<\/?[a-z][\s\S]*>/i, /<!DOCTYPE/, /<html/, /<head/, /<body/],
      css: [/[.#]?[a-zA-Z][a-zA-Z0-9_-]*\s*\{/, /:[^:]+;/, /@media/, /@keyframes/],
      sql: [/\bSELECT\b/i, /\bFROM\b/i, /\bWHERE\b/i, /\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i],
      bash: [/^#!/, /\becho\b/, /\bif\b.*\bthen\b/, /\$\{/, /\|\|/, /&&/],
      go: [/\bpackage\b/, /\bfunc\b/, /\bimport\b/, /\btype\b/, /\bstruct\b/, /:=/],
      rust: [/\bfn\b/, /\blet\b/, /\bmut\b/, /\bpub\b/, /\bimpl\b/, /\buse\b/],
      php: [/<\?php/, /\$[a-zA-Z_]/, /\bfunction\b/, /\becho\b/, /->/, /\bnamespace\b/],
      ruby: [/\bdef\b/, /\bend\b/, /\bclass\b/, /\bmodule\b/, /\brequire\b/, /@[a-zA-Z_]/],
      swift: [/\bfunc\b/, /\bvar\b/, /\blet\b/, /\bimport\b/, /\bclass\b/, /\bstruct\b/],
      kotlin: [/\bfun\b/, /\bval\b/, /\bvar\b/, /\bclass\b/, /\bpackage\b/],
      markdown: [/^#{1,6}\s/, /\*\*.*\*\*/, /\[.*\]\(.*\)/, /^-\s/, /^>\s/]
    };

    // Common stop words for topic extraction
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    // Entity patterns
    this.entityPatterns = {
      currency: /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|JPY)/i,
      percentage: /\d+(?:\.\d+)?%/,
      hashtag: /#[a-zA-Z0-9_]+/g,
      mention: /@[a-zA-Z0-9_]+/g,
      path: /(?:\/|[A-Z]:\\)(?:[^\s\/\\:*?"<>|]+[\/\\])*[^\s\/\\:*?"<>|]*/g
    };
  }

  /**
   * Main analysis function - categorizes and tags clipboard content
   * @param {string} content - Clipboard content to analyze
   * @param {string} sourceUrl - URL where content was copied from
   * @returns {Object} - Analysis result with category and tags
   */
  analyze(content, sourceUrl = null) {
    if (!content || typeof content !== 'string') {
      return { category: 'unknown', tags: [], metadata: {} };
    }

    const trimmedContent = content.trim();
    const analysis = {
      category: 'text',
      tags: [],
      metadata: {},
      confidence: 0
    };

    // Try to detect specific types first (highest priority)
    const typeDetection = this.detectContentType(trimmedContent);
    if (typeDetection.type !== 'text') {
      analysis.category = typeDetection.type;
      analysis.tags.push(...typeDetection.tags);
      analysis.metadata = { ...analysis.metadata, ...typeDetection.metadata };
      analysis.confidence = typeDetection.confidence;
    }

    // Detect code language if it's code
    if (analysis.category === 'code') {
      const language = this.detectCodeLanguage(trimmedContent);
      if (language) {
        analysis.tags.push(language);
        analysis.metadata.language = language;
      }
    }

    // Extract entities
    const entities = this.extractEntities(trimmedContent);
    if (entities.length > 0) {
      analysis.tags.push(...entities);
      analysis.metadata.entities = entities;
    }

    // Extract topics for text content
    if (analysis.category === 'text' || analysis.category === 'markdown') {
      const topics = this.extractTopics(trimmedContent);
      if (topics.length > 0) {
        analysis.tags.push(...topics.slice(0, 3)); // Top 3 topics
        analysis.metadata.topics = topics;
      }
    }

    // Analyze source URL if provided
    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        analysis.metadata.domain = url.hostname;
        analysis.tags.push(`from-${url.hostname.replace(/^www\./, '')}`);
      } catch (e) {
        // Invalid URL, ignore
      }
    }

    // Add content length metadata
    analysis.metadata.length = content.length;
    analysis.metadata.wordCount = this.countWords(content);
    analysis.metadata.lineCount = content.split('\n').length;

    // Generate descriptive title
    analysis.metadata.title = this.generateTitle(content, analysis.category);

    // Remove duplicates and clean tags
    analysis.tags = [...new Set(analysis.tags)].filter(tag => tag && tag.length > 0);

    return analysis;
  }

  /**
   * Detect the type of content
   * @param {string} content - Content to analyze
   * @returns {Object} - Type detection result
   */
  detectContentType(content) {
    const result = { type: 'text', tags: [], metadata: {}, confidence: 0.5 };

    // Check JSON first (most specific)
    if (this.patterns.json.test(content)) {
      try {
        JSON.parse(content);
        result.type = 'json';
        result.tags.push('json', 'structured-data');
        result.confidence = 1.0;
        return result;
      } catch (e) {
        // Not valid JSON
      }
    }

    // Check for credit card (sensitive)
    if (this.patterns.creditCard.test(content)) {
      result.type = 'sensitive';
      result.tags.push('credit-card', 'sensitive');
      result.confidence = 0.95;
      return result;
    }

    // Check for URL
    if (this.patterns.url.test(content) && content.length < 2000) {
      result.type = 'url';
      result.tags.push('url', 'link');
      result.metadata.url = content;
      result.confidence = 0.95;

      // Detect URL type
      if (content.includes('github.com')) result.tags.push('github');
      else if (content.includes('stackoverflow.com')) result.tags.push('stackoverflow');
      else if (content.match(/\.(pdf|doc|docx|zip|rar)$/i)) result.tags.push('file-link');

      return result;
    }

    // Check for email
    if (this.patterns.email.test(content)) {
      result.type = 'email';
      result.tags.push('email', 'contact');
      result.confidence = 0.95;
      return result;
    }

    // Check for phone
    if (this.patterns.phone.test(content)) {
      result.type = 'phone';
      result.tags.push('phone', 'contact');
      result.confidence = 0.9;
      return result;
    }

    // Check for UUID
    if (this.patterns.uuid.test(content)) {
      result.type = 'uuid';
      result.tags.push('uuid', 'identifier');
      result.confidence = 1.0;
      return result;
    }

    // Check for IP address
    if (this.patterns.ipAddress.test(content)) {
      result.type = 'ip-address';
      result.tags.push('ip', 'network');
      result.confidence = 0.95;
      return result;
    }

    // Check for hex color
    if (this.patterns.hexColor.test(content) && content.length <= 7) {
      result.type = 'color';
      result.tags.push('color', 'hex-color');
      result.metadata.color = content;
      result.confidence = 1.0;
      return result;
    }

    // Check for Base64
    if (content.length > 20 && content.length % 4 === 0 && this.patterns.base64.test(content)) {
      result.type = 'base64';
      result.tags.push('base64', 'encoded');
      result.confidence = 0.8;
      return result;
    }

    // Check for code (contains common code patterns)
    const codeIndicators = ['{', '}', '(', ')', ';', '=', '<', '>', '[', ']'];
    const codeScore = codeIndicators.reduce((score, char) => {
      return score + (content.includes(char) ? 1 : 0);
    }, 0);

    if (codeScore >= 4 || content.includes('function') || content.includes('class')) {
      result.type = 'code';
      result.tags.push('code', 'programming');
      result.confidence = 0.7 + (codeScore * 0.03);
      return result;
    }

    // Check for markdown
    if (content.includes('##') || content.includes('**') || content.includes('[') && content.includes('](')) {
      result.type = 'markdown';
      result.tags.push('markdown', 'formatted-text');
      result.confidence = 0.7;
      return result;
    }

    return result;
  }

  /**
   * Detect programming language
   * @param {string} code - Code content
   * @returns {string|null} - Detected language
   */
  detectCodeLanguage(code) {
    const scores = {};

    for (const [language, patterns] of Object.entries(this.codePatterns)) {
      scores[language] = patterns.reduce((score, pattern) => {
        return score + (pattern.test(code) ? 1 : 0);
      }, 0);
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return null;

    const detectedLanguage = Object.entries(scores)
      .find(([_, score]) => score === maxScore)?.[0];

    return detectedLanguage || null;
  }

  /**
   * Extract entities from content
   * @param {string} content - Content to analyze
   * @returns {Array<string>} - Extracted entities
   */
  extractEntities(content) {
    const entities = [];

    // Extract currency mentions
    const currencyMatches = content.match(this.entityPatterns.currency);
    if (currencyMatches) {
      entities.push('currency', 'financial');
    }

    // Extract percentages
    const percentageMatches = content.match(this.entityPatterns.percentage);
    if (percentageMatches) {
      entities.push('percentage', 'numeric');
    }

    // Extract hashtags
    const hashtags = content.match(this.entityPatterns.hashtag);
    if (hashtags && hashtags.length > 0) {
      entities.push('hashtag', 'social-media');
    }

    // Extract mentions
    const mentions = content.match(this.entityPatterns.mention);
    if (mentions && mentions.length > 0) {
      entities.push('mention', 'social-media');
    }

    // Extract file paths
    const paths = content.match(this.entityPatterns.path);
    if (paths && paths.length > 0) {
      entities.push('file-path', 'system');
    }

    // Extract dates
    const dates = content.match(this.patterns.date);
    if (dates && dates.length > 0) {
      entities.push('date', 'temporal');
    }

    // Extract times
    const times = content.match(this.patterns.time);
    if (times && times.length > 0) {
      entities.push('time', 'temporal');
    }

    return [...new Set(entities)];
  }

  /**
   * Extract key topics from text
   * @param {string} text - Text to analyze
   * @returns {Array<string>} - Extracted topics
   */
  extractTopics(text) {
    // Tokenize and clean
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word)
      );

    // Count word frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top words
    const topWords = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    return topWords;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Generate a descriptive title for clipboard item
   * @param {string} content - Content
   * @param {string} category - Content category
   * @returns {string} - Generated title
   */
  generateTitle(content, category) {
    const maxLength = 50;

    switch (category) {
      case 'url':
        try {
          const url = new URL(content);
          return `Link: ${url.hostname}`;
        } catch {
          return content.substring(0, maxLength);
        }

      case 'email':
        return `Email: ${content}`;

      case 'phone':
        return `Phone: ${content}`;

      case 'code':
        const firstLine = content.split('\n')[0].trim();
        return firstLine.substring(0, maxLength) || 'Code snippet';

      case 'json':
        return 'JSON data';

      case 'uuid':
        return `UUID: ${content.substring(0, 13)}...`;

      case 'color':
        return `Color: ${content}`;

      default:
        const preview = content.substring(0, maxLength).trim();
        return preview + (content.length > maxLength ? '...' : '');
    }
  }
}

// Export as singleton
const aiTagger = new AITagger();
export default aiTagger;
