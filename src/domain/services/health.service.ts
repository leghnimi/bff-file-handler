import os from 'os';
import pidusage from 'pidusage';
import { createCircuitBreaker } from '../../infrastructure/circuitBreaker';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    model: string;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  dependencies: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      details?: string;
    };
  };
}

export class HealthService {
  // Example external dependency health check
  private async checkDatabaseHealth(): Promise<{ status: 'up' | 'down' | 'degraded'; latency?: number }> {
    const start = Date.now();
    try {
      // Simulating a database check
      await new Promise(resolve => setTimeout(resolve, 100));
      return { 
        status: 'up', 
        latency: Date.now() - start 
      };
    } catch (error) {
      return { 
        status: 'down', 
        latency: Date.now() - start 
      };
    }
  }

  // Example external API check with circuit breaker
  private async checkExternalApiHealth(): Promise<{ status: 'up' | 'down' | 'degraded'; latency?: number; details?: string }> {
    const apiCheck = async () => {
      const start = Date.now();
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        return { 
          status: 'up' as const, 
          latency: Date.now() - start 
        };
      } catch (error) {
        return { 
          status: 'down' as const, 
          latency: Date.now() - start 
        };
      }
    };
    
    const breaker = createCircuitBreaker(apiCheck);
    
    try {
      return await breaker.fire() as { status: 'up' | 'down' | 'degraded'; latency?: number };
    } catch (error) {
      return { 
        status: 'degraded', 
        details: breaker.status.toString() === 'open' ? 'Circuit open' : 'Request failed' 
      };
    }
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    const stats = await pidusage(process.pid);
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    const [dbHealth, apiHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkExternalApiHealth()
    ]);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (stats.cpu > 80 || memoryUsagePercent > 80 || 
        dbHealth.status === 'down' || apiHealth.status === 'down') {
      overallStatus = 'unhealthy';
    } else if (stats.cpu > 60 || memoryUsagePercent > 60 || 
               dbHealth.status === 'degraded' || apiHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: Date.now(),
      cpu: {
        usage: parseFloat(stats.cpu.toFixed(2)),
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: parseFloat(memoryUsagePercent.toFixed(2)),
      },
      dependencies: {
        database: dbHealth,
        externalApi: apiHealth,
      }
    };
  }
}

export const healthService = new HealthService();