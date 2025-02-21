// src/lib/executors/registry.ts

import { BaseExecutor } from './types';


export class ExecutorRegistry {
    private static executors = new Map<string, new () => BaseExecutor>();
    private static instances = new Map<string, BaseExecutor>();
  
    static register(service: string, executor: new () => BaseExecutor) {
      console.log(`Registering executor for service: ${service}`);
      this.executors.set(service, executor);
    }
  
    static getExecutor(service: string): BaseExecutor {
      console.log(`Getting executor for service: ${service}`);
      console.log('Available executors:', Array.from(this.executors.keys()));
      
      // Return existing instance if we have one
      if (this.instances.has(service)) {
        return this.instances.get(service)!;
      }
  
      // Create new instance if we have the executor class
      const ExecutorClass = this.executors.get(service);
      if (!ExecutorClass) {
        throw new Error(`No executor found for service: ${service}`);
      }
  
      // Create instance, cache it, and return it
      const instance = new ExecutorClass();
      this.instances.set(service, instance);
      return instance;
    }
  
    static clearExecutors() {
      this.executors.clear();
      this.instances.clear();
    }
  }