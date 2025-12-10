import re
import sqlparse
from typing import Tuple, Optional
import config


class QueryValidator:
    """Validates SQL queries for security and safety"""
    
    def __init__(self):
        self.dangerous_keywords = config.DANGEROUS_KEYWORDS
    
    def validate(self, query: str) -> Tuple[bool, Optional[str], bool]:
        """
        Validate SQL query
        
        Args:
            query: SQL query to validate
            
        Returns:
            Tuple of (is_valid, error_message, requires_confirmation)
        """
        if not query or not query.strip():
            return False, "Query cannot be empty", False
        
        # Parse query
        parsed = sqlparse.parse(query)
        if not parsed:
            return False, "Invalid SQL syntax", False
        
        # Check for dangerous operations
        requires_confirmation, warning = self._check_dangerous_operations(query)
        
        return True, None, requires_confirmation
    
    def _check_dangerous_operations(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Check if query contains dangerous operations requiring confirmation
        
        Returns:
            Tuple of (requires_confirmation, warning_message)
        """
        query_upper = query.upper()
        
        # Check for DROP statements
        if "DROP" in query_upper:
            if re.search(r'\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW)', query_upper):
                return True, "This query will permanently delete database objects"
        
        # Check for TRUNCATE
        if "TRUNCATE" in query_upper:
            return True, "This query will delete all rows from the table"
        
        # Check for DELETE without WHERE
        if config.REQUIRE_WHERE_FOR_DELETE:
            if "DELETE" in query_upper:
                # Simple check for WHERE clause
                if not re.search(r'\bWHERE\b', query_upper):
                    return True, "DELETE without WHERE clause will delete all rows"
        
        # Check for UPDATE without WHERE
        if config.REQUIRE_WHERE_FOR_DELETE:
            if "UPDATE" in query_upper:
                if not re.search(r'\bWHERE\b', query_upper):
                    return True, "UPDATE without WHERE clause will modify all rows"
        
        # Check for ALTER statements
        if "ALTER" in query_upper:
            return True, "This query will modify database structure"
        
        # Check for stored procedure execution
        if re.search(r'\b(EXEC|EXECUTE|SP_|XP_)\b', query_upper):
            return True, "Executing stored procedures requires confirmation"
        
        return False, None
    
    def split_statements(self, query: str) -> list:
        """
        Split multiple SQL statements
        
        Args:
            query: SQL query potentially containing multiple statements
            
        Returns:
            List of individual SQL statements
        """
        # Handle GO separator (T-SQL batch separator)
        if "GO" in query.upper():
            statements = re.split(r'\bGO\b', query, flags=re.IGNORECASE)
            statements = [s.strip() for s in statements if s.strip()]
        else:
            # Use sqlparse to split statements
            statements = sqlparse.split(query)
            statements = [s.strip() for s in statements if s.strip()]
        
        return statements
    
    def is_select_only(self, query: str) -> bool:
        """Check if query is SELECT only (read-only)"""
        query_upper = query.upper().strip()
        
        # Parse to get statement type
        parsed = sqlparse.parse(query)
        if not parsed:
            return False
        
        statement = parsed[0]
        
        # Get first token that's not whitespace or comment
        for token in statement.tokens:
            if token.ttype is None and hasattr(token, 'tokens'):
                # It's a group, get first keyword
                for subtoken in token.tokens:
                    if subtoken.ttype in (sqlparse.tokens.Keyword.DML, sqlparse.tokens.Keyword):
                        return subtoken.value.upper() == 'SELECT'
            elif token.ttype in (sqlparse.tokens.Keyword.DML, sqlparse.tokens.Keyword):
                return token.value.upper() == 'SELECT'
        
        return query_upper.startswith('SELECT')
    
    def extract_affected_objects(self, query: str) -> dict:
        """
        Extract tables/objects affected by the query
        
        Returns:
            Dictionary with affected tables and operation type
        """
        query_upper = query.upper()
        result = {
            "operation": None,
            "tables": [],
            "databases": []
        }
        
        # Determine operation type
        if query_upper.strip().startswith('SELECT'):
            result["operation"] = "SELECT"
        elif query_upper.strip().startswith('INSERT'):
            result["operation"] = "INSERT"
        elif query_upper.strip().startswith('UPDATE'):
            result["operation"] = "UPDATE"
        elif query_upper.strip().startswith('DELETE'):
            result["operation"] = "DELETE"
        elif 'DROP' in query_upper:
            result["operation"] = "DROP"
        elif 'CREATE' in query_upper:
            result["operation"] = "CREATE"
        elif 'ALTER' in query_upper:
            result["operation"] = "ALTER"
        
        # Extract table names (basic regex, not perfect but functional)
        # FROM clause
        from_match = re.findall(r'\bFROM\s+(\[?\w+\]?\.?\[?\w+\]?)', query_upper)
        result["tables"].extend(from_match)
        
        # INTO clause
        into_match = re.findall(r'\bINTO\s+(\[?\w+\]?\.?\[?\w+\]?)', query_upper)
        result["tables"].extend(into_match)
        
        # UPDATE clause
        update_match = re.findall(r'\bUPDATE\s+(\[?\w+\]?\.?\[?\w+\]?)', query_upper)
        result["tables"].extend(update_match)
        
        # Remove duplicates
        result["tables"] = list(set(result["tables"]))
        
        return result


# Global validator instance
query_validator = QueryValidator()