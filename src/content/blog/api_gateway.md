---
layout: ../../layouts/BlogPost.astro
title: "API Gateway Design Patterns"
date: "2024-03-14"
author: "System Architect"
description: "Best practices for designing API Gateways"
image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa"
---

Let's explore API Gateway design patterns.

## Gateway Routing

```mermaid
graph LR
    Client --> Gateway[API Gateway]
    Gateway --> Auth[Auth Service]
    Gateway --> Users[Users Service]
    Gateway --> Orders[Orders Service]
```

## Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const requests = this.requests.get(clientId) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    return validRequests.length < this.config.maxRequests;
  }
}
```