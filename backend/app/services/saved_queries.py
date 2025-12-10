"""
Saved Queries Service - Manages user's saved query templates
"""
import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "saved_queries.db"


class SavedQueriesService:
    """Manages saved query templates"""
    
    def __init__(self):
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database for saved queries"""
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS saved_queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    description TEXT,
                    query TEXT NOT NULL,
                    database_name TEXT,
                    tags TEXT,
                    is_favorite INTEGER DEFAULT 0,
                    use_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Create index for faster lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_saved_queries_user 
                ON saved_queries(user_id)
            """)
            
            conn.commit()
    
    def get_connection(self):
        """Get database connection with row factory"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    
    def save_query(
        self,
        user_id: int,
        name: str,
        query: str,
        description: Optional[str] = None,
        database_name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_favorite: bool = False
    ) -> Dict[str, Any]:
        """
        Save a query template
        
        Args:
            user_id: User ID
            name: Query name
            query: SQL query text
            description: Optional description
            database_name: Target database
            tags: Optional list of tags
            is_favorite: Whether to mark as favorite
            
        Returns:
            Saved query dict
        """
        now = datetime.utcnow().isoformat()
        tags_json = json.dumps(tags) if tags else None
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO saved_queries 
                (user_id, name, description, query, database_name, tags, is_favorite, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, name, description, query, database_name, tags_json, 
                  1 if is_favorite else 0, now, now))
            
            query_id = cursor.lastrowid
            conn.commit()
            
            return self.get_query(query_id)
    
    def get_query(self, query_id: int) -> Optional[Dict[str, Any]]:
        """Get a saved query by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM saved_queries WHERE id = ?", (query_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_dict(row)
    
    def get_user_queries(
        self,
        user_id: int,
        favorites_only: bool = False,
        search: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get all saved queries for a user
        
        Args:
            user_id: User ID
            favorites_only: Only return favorites
            search: Search term for name/description
            limit: Maximum number of results
            
        Returns:
            List of saved query dicts
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM saved_queries WHERE user_id = ?"
            params = [user_id]
            
            if favorites_only:
                query += " AND is_favorite = 1"
            
            if search:
                query += " AND (name LIKE ? OR description LIKE ? OR query LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])
            
            query += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [self._row_to_dict(row) for row in rows]
    
    def update_query(
        self,
        query_id: int,
        user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        query: Optional[str] = None,
        database_name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_favorite: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a saved query"""
        # Build update query dynamically
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if query is not None:
            updates.append("query = ?")
            params.append(query)
        if database_name is not None:
            updates.append("database_name = ?")
            params.append(database_name)
        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags))
        if is_favorite is not None:
            updates.append("is_favorite = ?")
            params.append(1 if is_favorite else 0)
        
        if not updates:
            return self.get_query(query_id)
        
        updates.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        
        params.extend([query_id, user_id])
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                UPDATE saved_queries 
                SET {', '.join(updates)}
                WHERE id = ? AND user_id = ?
            """, params)
            conn.commit()
            
            if cursor.rowcount == 0:
                return None
            
            return self.get_query(query_id)
    
    def delete_query(self, query_id: int, user_id: int) -> bool:
        """Delete a saved query"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM saved_queries WHERE id = ? AND user_id = ?",
                (query_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
    
    def increment_use_count(self, query_id: int) -> None:
        """Increment the use count for a query"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE saved_queries 
                SET use_count = use_count + 1, updated_at = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), query_id))
            conn.commit()
    
    def toggle_favorite(self, query_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Toggle favorite status"""
        query = self.get_query(query_id)
        if not query or query['user_id'] != user_id:
            return None
        
        new_status = not query['is_favorite']
        return self.update_query(query_id, user_id, is_favorite=new_status)
    
    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to dict"""
        result = dict(row)
        
        # Parse tags JSON
        if result.get('tags'):
            try:
                result['tags'] = json.loads(result['tags'])
            except json.JSONDecodeError:
                result['tags'] = []
        else:
            result['tags'] = []
        
        # Convert boolean
        result['is_favorite'] = bool(result.get('is_favorite'))
        
        return result


# Global service instance
saved_queries_service = SavedQueriesService()

