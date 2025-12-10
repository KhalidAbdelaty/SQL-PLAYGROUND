"""
Query caching service with TTL support
"""
import time
import hashlib
from typing import Optional, Dict, Any, Tuple
from collections import OrderedDict
import logging

logger = logging.getLogger(__name__)


class QueryCache:
    """In-memory cache for query results with TTL and LRU eviction"""
    
    def __init__(self, max_size: int = 100, default_ttl: int = 300):
        """
        Initialize cache
        
        Args:
            max_size: Maximum number of cached queries
            default_ttl: Default time-to-live in seconds (5 minutes)
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._hits = 0
        self._misses = 0
    
    def _generate_key(self, query: str, database: Optional[str] = None) -> str:
        """Generate cache key from query and database"""
        normalized = query.strip().lower()
        key_string = f"{database or 'default'}:{normalized}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _is_cacheable(self, query: str) -> bool:
        """Check if query result should be cached (SELECT only)"""
        query_upper = query.strip().upper()
        # Only cache SELECT queries that don't modify data
        if not query_upper.startswith('SELECT'):
            return False
        # Don't cache queries with functions that return different results
        non_cacheable = ['GETDATE()', 'NEWID()', 'RAND()', 'SYSDATETIME()', '@@']
        for func in non_cacheable:
            if func in query_upper:
                return False
        return True
    
    def get(self, query: str, database: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get cached result if exists and not expired
        
        Returns:
            Cached result dict or None
        """
        if not self._is_cacheable(query):
            return None
        
        key = self._generate_key(query, database)
        
        if key not in self._cache:
            self._misses += 1
            return None
        
        entry = self._cache[key]
        
        # Check TTL
        if time.time() > entry['expires_at']:
            del self._cache[key]
            self._misses += 1
            return None
        
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        self._hits += 1
        
        logger.debug(f"Cache hit for query: {query[:50]}...")
        return entry['result']
    
    def set(
        self, 
        query: str, 
        result: Dict[str, Any], 
        database: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache query result
        
        Args:
            query: SQL query
            result: Query result to cache
            database: Target database
            ttl: Time-to-live in seconds (uses default if not specified)
            
        Returns:
            True if cached, False if not cacheable
        """
        if not self._is_cacheable(query):
            return False
        
        # Don't cache errors or empty results
        if not result.get('success') or not result.get('data'):
            return False
        
        key = self._generate_key(query, database)
        
        # Evict oldest if at capacity
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        
        self._cache[key] = {
            'result': result,
            'expires_at': time.time() + (ttl or self.default_ttl),
            'query': query[:100],  # Store truncated query for debugging
            'database': database
        }
        
        logger.debug(f"Cached query result: {query[:50]}...")
        return True
    
    def invalidate(self, database: Optional[str] = None) -> int:
        """
        Invalidate cache entries
        
        Args:
            database: If specified, only invalidate entries for this database
            
        Returns:
            Number of entries invalidated
        """
        if database is None:
            count = len(self._cache)
            self._cache.clear()
            return count
        
        keys_to_remove = [
            key for key, entry in self._cache.items()
            if entry.get('database') == database
        ]
        
        for key in keys_to_remove:
            del self._cache[key]
        
        return len(keys_to_remove)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': round(hit_rate, 2),
            'default_ttl': self.default_ttl
        }
    
    def clear_expired(self) -> int:
        """Remove expired entries"""
        now = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if now > entry['expires_at']
        ]
        
        for key in expired_keys:
            del self._cache[key]
        
        return len(expired_keys)


# Global cache instance
query_cache = QueryCache(max_size=100, default_ttl=300)

