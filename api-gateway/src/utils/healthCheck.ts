import axios from "axios";
import { logger } from "./logger.js";

interface ServiceHealth {
  name: string;
  url: string;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
  error?: string;
  lastCheck?: Date;
}

export class HealthChecker {
  private services: Map<string, string>;
  private healthStatus: Map<string, ServiceHealth>;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(services: { [key: string]: string }) {
    this.services = new Map(Object.entries(services));
    this.healthStatus = new Map();

    this.services.forEach((url, name) => {
      this.healthStatus.set(name, {
        name,
        url,
        status: "unknown",
      });
    });
  }

  async checkService(name: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          name,
          url,
          status: "healthy",
          responseTime,
          lastCheck: new Date(),
        };
      } else {
        return {
          name,
          url,
          status: "unhealthy",
          responseTime,
          error: `HTTP ${response.status}`,
          lastCheck: new Date(),
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        name,
        url,
        status: "unhealthy",
        responseTime,
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  async checkAllServices(): Promise<Map<string, ServiceHealth>> {
    const checks: Promise<ServiceHealth>[] = [];

    this.services.forEach((url, name) => {
      checks.push(this.checkService(name, url));
    });

    const results = await Promise.all(checks);

    results.forEach((result) => {
      this.healthStatus.set(result.name, result);

      if (result.status === "unhealthy") {
        logger.warn(`Service ${result.name} is unhealthy`, {
          url: result.url,
          error: result.error,
        });
      }
    });

    return this.healthStatus;
  }

  getHealthStatus(): Map<string, ServiceHealth> {
    return this.healthStatus;
  }

  getOverallHealth(): "healthy" | "degraded" | "unhealthy" {
    const statuses = Array.from(this.healthStatus.values());

    const unhealthyCount = statuses.filter((s) => s.status === "unhealthy").length;

    // const healthyCount = statuses.filter((s) => s.status === "healthy").length;

    if (unhealthyCount === statuses.length) {
      return "unhealthy";
    } else if (unhealthyCount > 0) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkAllServices();

    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);

    logger.info(`Health checks iniciados cada ${intervalMs}ms`);
  }

  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info("Health checks detenidos");
    }
  }
}
