import functools
import hashlib
import json
import sys
import time
from typing import Any, Callable, Dict, Optional
from functools import wraps
import gc

class PostsCacheManager:
    """Simple cache manager for posts endpoints with memory limits"""
    
    def __init__(self, max_memory_mb: int = 10, max_size: int = 64):
        self.max_memory_mb = max_memory_mb
        self.max_size = max_size
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'memory_usage': 0
        }
        self._cache = {}
        self._cache_times = {}
    
    def get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0
    
    def estimate_object_size(self, obj: Any) -> int:
        """Estimate the size of an object in bytes"""
        try:
            return sys.getsizeof(obj)
        except:
            return 0
    
    def should_evict_cache(self) -> bool:
        """Check if cache should be evicted due to memory usage"""
        current_memory = self.get_memory_usage()
        return current_memory > self.max_memory_mb
    
    def clear_cache_if_needed(self):
        """Clear cache if memory usage exceeds limit"""
        if self.should_evict_cache():
            # Clear oldest entries
            if self._cache:
                oldest_key = min(self._cache_times.keys(), key=lambda k: self._cache_times[k])
                del self._cache[oldest_key]
                del self._cache_times[oldest_key]
                self.cache_stats['evictions'] += 1
            
            # Force garbage collection
            gc.collect()
            return True
        return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self._cache:
            self.cache_stats['hits'] += 1
            return self._cache[key]
        self.cache_stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, max_age_seconds: int = 300):
        """Set value in cache with expiration"""
        current_time = time.time()
        
        # Check if cache is full
        if len(self._cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self._cache_times.keys(), key=lambda k: self._cache_times[k])
            del self._cache[oldest_key]
            del self._cache_times[oldest_key]
            self.cache_stats['evictions'] += 1
        
        # Check memory usage
        if self.should_evict_cache():
            self.clear_cache_if_needed()
        
        # Estimate size and check if it exceeds limit
        value_size = self.estimate_object_size(value)
        if value_size > self.max_memory_mb * 1024 * 1024:
            # Value too large, don't cache
            return
        
        self._cache[key] = value
        self._cache_times[key] = current_time
        self.cache_stats['memory_usage'] += value_size
    
    def cleanup_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self._cache_times.items()
            if current_time - timestamp > 300  # 5 minutes default
        ]
        for key in expired_keys:
            del self._cache[key]
            del self._cache_times[key]

# Global posts cache manager instance
posts_cache_manager = PostsCacheManager(max_memory_mb=10, max_size=64)

def create_cache_key(*args, **kwargs) -> str:
    """Create a unique cache key from function arguments"""
    # Convert arguments to a stable string representation
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items()) if kwargs else []
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()

def cached_posts_endpoint(max_age_seconds: int = 300, max_memory_mb: int = 10):
    """
    Decorator for caching posts API endpoints with memory management
    
    Args:
        max_age_seconds: Maximum age of cached data in seconds
        max_memory_mb: Maximum memory usage per request in MB
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Cleanup expired entries
            posts_cache_manager.cleanup_expired()
            
            # Check memory usage before processing
            if posts_cache_manager.should_evict_cache():
                posts_cache_manager.clear_cache_if_needed()
            
            # Create cache key
            cache_key = create_cache_key(*args, **kwargs)
            
            # Try to get from cache
            cached_result = posts_cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Cache miss, call original function
            try:
                result = await func(*args, **kwargs)
                
                # Cache the result
                posts_cache_manager.set(cache_key, result, max_age_seconds)
                
                return result
                
            except Exception as e:
                # Don't cache errors
                raise e
        
        return wrapper
    
    return decorator

def posts_cache_stats() -> Dict[str, Any]:
    """Get posts cache statistics"""
    return {
        **posts_cache_manager.cache_stats,
        'current_memory_mb': posts_cache_manager.get_memory_usage(),
        'max_memory_mb': posts_cache_manager.max_memory_mb,
        'cache_size': len(posts_cache_manager._cache),
        'max_cache_size': posts_cache_manager.max_size
    }

def clear_posts_cache():
    """Clear all posts cached data"""
    posts_cache_manager._cache.clear()
    posts_cache_manager._cache_times.clear()
    
    # Force garbage collection
    gc.collect()
    
    # Reset stats
    posts_cache_manager.cache_stats = {
        'hits': 0,
        'misses': 0,
        'evictions': 0,
        'memory_usage': 0
    } 