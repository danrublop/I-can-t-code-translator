import axios from 'axios';

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_duration: number;
  eval_duration: number;
}

export interface ExplanationRequest {
  code: string;
  language: string;
  detailLevel?: 'beginner' | 'intermediate' | 'expert';
  contextFiles?: string[];
}

export class OllamaService {
  private readonly baseUrl = 'http://127.0.0.1:11434';
  private readonly model = 'mistral:latest';
  private readonly timeout = 300000; // Increased to 5 minutes for very slow responses

  constructor() {
    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      console.log('Ollama connection successful');
    } catch (error) {
      console.warn('Ollama connection failed. Make sure Ollama is running and accessible at http://127.0.0.1:11434');
    }
  }

  async generateExplanation(
    code: string, 
    language: string, 
    detailLevel: 'beginner' | 'intermediate' | 'expert' = 'intermediate',
    contextFiles?: string[],
    onProgress?: (progress: number, partialResponse: string) => void
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(code, language, detailLevel, contextFiles);
      
      console.log('Generating explanation using streaming method for real-time progress...');
      
      // Use streaming for real-time progress updates
      const result = await this.generateExplanationStream(prompt, onProgress);
      
      return result;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama is not running. Please start Ollama and ensure it\'s accessible at http://127.0.0.1:11434');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new Error('Request to Ollama timed out. The model may be taking too long to respond.');
        }
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw new Error(`Failed to generate explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateExplanationStream(prompt: string, onProgress?: (progress: number, partialResponse: string) => void): Promise<string> {
    console.log('Starting streaming request to Ollama...');
    let fullResponse = '';
    let tokenCount = 0;
    let estimatedTotalTokens = 1000; // Estimate for progress calculation

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2000
          }
        },
        {
          timeout: this.timeout,
          responseType: 'stream'
        }
      );

      // Process the streaming response
      return new Promise((resolve, reject) => {
        let buffer = '';
        
        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          // Process complete lines from the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              const data = JSON.parse(line);
              
              if (data.response) {
                fullResponse += data.response;
                tokenCount++;
                
                // Calculate progress based on token count
                const progress = Math.min(Math.round((tokenCount / estimatedTotalTokens) * 100), 95);
                
                if (onProgress) {
                  onProgress(progress, fullResponse);
                }
              }
              
              if (data.done) {
                estimatedTotalTokens = tokenCount;
                if (onProgress) {
                  onProgress(100, fullResponse);
                }
                resolve(this.cleanResponse(fullResponse));
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              continue;
            }
          }
        });
        
        response.data.on('end', () => {
          if (fullResponse) {
            if (onProgress) {
              onProgress(100, fullResponse);
            }
            resolve(this.cleanResponse(fullResponse));
          } else {
            reject(new Error('No response received from Ollama'));
          }
        });
        
        response.data.on('error', (error: Error) => {
          reject(new Error(`Stream error: ${error.message}`));
        });
      });

    } catch (error) {
      console.error('Streaming request failed:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama connection refused. Please check if Ollama is running.');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new Error('Ollama request timed out. The model may be taking too long to respond.');
        }
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }

  private buildPrompt(
    code: string, 
    language: string, 
    detailLevel: 'beginner' | 'intermediate' | 'expert',
    contextFiles?: string[]
  ): string {
    const detailInstructions = this.getDetailLevelInstructions(detailLevel);
    
    let prompt = `You are an expert programming tutor. Please explain the following ${language} code at a ${detailLevel} level.

${detailInstructions}

Code to explain:
\`\`\`${language}
${code}
\`\`\`

`;

    if (contextFiles && contextFiles.length > 0) {
      prompt += `Additional context files that may be relevant:
${contextFiles.map(file => `- ${file}`).join('\n')}

`;
    }

    prompt += `Please provide a clear, structured explanation that includes:

1. **Overview**: A brief summary of what this code does
2. **Line-by-line breakdown**: Explain key parts of the code
3. **Key concepts**: Highlight important programming concepts used
4. **Potential improvements**: Suggest ways to make the code better (if applicable)
5. **Common pitfalls**: Point out potential issues or things to watch out for

Format your response in markdown with clear headings and code examples where helpful.`;

    return prompt;
  }

  private getDetailLevelInstructions(level: 'beginner' | 'intermediate' | 'expert'): string {
    switch (level) {
      case 'beginner':
        return 'Use simple language and explain basic programming concepts. Assume the reader is new to programming.';
      case 'intermediate':
        return 'Use moderate technical language and explain intermediate concepts. Assume the reader has basic programming knowledge.';
      case 'expert':
        return 'Use advanced technical language and explain complex concepts. Assume the reader is an experienced programmer.';
      default:
        return 'Use moderate technical language and explain intermediate concepts.';
    }
  }

  private cleanResponse(response: string): string {
    // Remove any markdown code block markers that might be in the response
    return response
      .replace(/^```\w*\n/, '') // Remove opening code block
      .replace(/\n```$/, '') // Remove closing code block
      .trim();
  }

  async isModelAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      return models.some((model: any) => model.name === this.model);
    } catch (error) {
      return false;
    }
  }

  async pullModel(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: this.model
      }, { timeout: 300000 }); // 5 minutes for model download
      console.log(`Model ${this.model} pulled successfully`);
    } catch (error) {
      throw new Error(`Failed to pull model ${this.model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

