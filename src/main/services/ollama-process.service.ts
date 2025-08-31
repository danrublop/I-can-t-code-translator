import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import { existsSync } from 'fs';
import axios from 'axios';

export interface OllamaProcessStatus {
  isRunning: boolean;
  isStarting: boolean;
  error?: string;
  process?: ChildProcess;
}

export class OllamaProcessService {
  private readonly baseUrl = 'http://127.0.0.1:11434';
  private ollamaProcess: ChildProcess | null = null;
  private status: OllamaProcessStatus = {
    isRunning: false,
    isStarting: false
  };
  private startupPromise: Promise<boolean> | null = null;

  constructor() {
    // Check if Ollama is already running on startup
    this.checkIfRunning();
  }

  async checkIfRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      this.status.isRunning = response.status === 200;
      this.status.isStarting = false;
      this.status.error = undefined;
      return this.status.isRunning;
    } catch (error) {
      this.status.isRunning = false;
      return false;
    }
  }

  async startOllama(): Promise<boolean> {
    // If already running, return true
    if (this.status.isRunning) {
      return true;
    }

    // If startup is in progress, wait for it
    if (this.startupPromise) {
      return this.startupPromise;
    }

    // Start the startup process
    this.startupPromise = this.performStartup();
    return this.startupPromise;
  }

  private async performStartup(): Promise<boolean> {
    try {
      this.status.isStarting = true;
      this.status.error = undefined;
      
      console.log('Starting Ollama...');
      
      // Determine the command based on platform
      const command = this.getOllamaCommand();

      // Spawn the Ollama process
      this.ollamaProcess = spawn(command, ['serve'], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle process events
      this.setupProcessHandlers();

      // Wait for Ollama to be ready (with timeout)
      const isReady = await this.waitForOllamaReady(30000); // 30 second timeout
      
      if (isReady) {
        this.status.isRunning = true;
        this.status.isStarting = false;
        console.log('Ollama started successfully');
        return true;
      } else {
        throw new Error('Ollama failed to start within timeout period');
      }

    } catch (error) {
      this.status.isStarting = false;
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to start Ollama:', this.status.error);
      return false;
    } finally {
      this.startupPromise = null;
    }
  }

  private getOllamaCommand(): string {
    const os = platform();
    
    // Try to find Ollama in common locations
    switch (os) {
      case 'darwin': // macOS
        // Try common installation paths for macOS
        const macPaths = ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama'];
        for (const path of macPaths) {
          if (existsSync(path)) {
            return path;
          }
        }
        return 'ollama'; // Fallback to PATH
      case 'linux':
        const linuxPaths = ['/usr/local/bin/ollama', '/usr/bin/ollama'];
        for (const path of linuxPaths) {
          if (existsSync(path)) {
            return path;
          }
        }
        return 'ollama'; // Fallback to PATH
      case 'win32': // Windows
        return 'ollama.exe';
      default:
        return 'ollama';
    }
  }

  private setupProcessHandlers(): void {
    if (!this.ollamaProcess) return;

    this.ollamaProcess.stdout?.on('data', (data) => {
      console.log(`Ollama stdout: ${data}`);
    });

    this.ollamaProcess.stderr?.on('data', (data) => {
      console.error(`Ollama stderr: ${data}`);
    });

    this.ollamaProcess.on('error', (error) => {
      console.error('Ollama process error:', error);
      this.status.isRunning = false;
      this.status.isStarting = false;
      this.status.error = error.message;
    });

    this.ollamaProcess.on('exit', (code, signal) => {
      console.log(`Ollama process exited with code ${code} and signal ${signal}`);
      this.status.isRunning = false;
      this.status.isStarting = false;
      this.ollamaProcess = null;
    });
  }

  private async waitForOllamaReady(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Ollama not ready yet, continue waiting
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false;
  }

  getStatus(): OllamaProcessStatus {
    return { ...this.status };
  }

  async stopOllama(): Promise<void> {
    if (this.ollamaProcess) {
      console.log('Stopping Ollama process...');
      this.ollamaProcess.kill('SIGTERM');
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      if (this.ollamaProcess && !this.ollamaProcess.killed) {
        this.ollamaProcess.kill('SIGKILL');
      }
      
      this.ollamaProcess = null;
    }
    
    this.status.isRunning = false;
    this.status.isStarting = false;
  }

  async ensureModelAvailable(modelName: string = 'mistral:latest'): Promise<boolean> {
    try {
      // Check if model is already available
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models || [];
      const modelExists = models.some((model: any) => model.name === modelName);
      
      if (modelExists) {
        console.log(`Model ${modelName} is already available`);
        return true;
      }

      // Pull the model if not available
      console.log(`Pulling model ${modelName}...`);
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName
      }, { timeout: 300000 }); // 5 minutes for model download

      console.log(`Model ${modelName} pulled successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to ensure model ${modelName} is available:`, error);
      return false;
    }
  }
}
