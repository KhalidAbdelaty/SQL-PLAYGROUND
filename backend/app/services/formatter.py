"""
SQL Query Formatter Service
"""
import sqlparse
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class QueryFormatter:
    """Formats and beautifies SQL queries"""
    
    def __init__(self):
        self.default_options = {
            'reindent': True,
            'keyword_case': 'upper',
            'identifier_case': None,
            'strip_comments': False,
            'indent_width': 4,
            'indent_tabs': False,
            'wrap_after': 80,
            'output_format': None
        }
    
    def format(
        self,
        query: str,
        keyword_case: str = 'upper',
        identifier_case: str = None,
        indent_width: int = 4,
        strip_comments: bool = False
    ) -> Dict[str, Any]:
        """
        Format SQL query
        
        Args:
            query: SQL query to format
            keyword_case: 'upper', 'lower', or 'capitalize'
            identifier_case: 'upper', 'lower', or None (unchanged)
            indent_width: Number of spaces for indentation
            strip_comments: Whether to remove comments
            
        Returns:
            Dict with formatted query and metadata
        """
        try:
            formatted = sqlparse.format(
                query,
                reindent=True,
                keyword_case=keyword_case,
                identifier_case=identifier_case,
                indent_width=indent_width,
                strip_comments=strip_comments,
                strip_whitespace=True
            )
            
            # Count statements
            statements = sqlparse.split(formatted)
            statement_count = len([s for s in statements if s.strip()])
            
            return {
                'success': True,
                'formatted': formatted,
                'original': query,
                'statement_count': statement_count,
                'changes_made': formatted != query
            }
            
        except Exception as e:
            logger.error(f"Query formatting failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'original': query,
                'formatted': query  # Return original on error
            }
    
    def minify(self, query: str) -> Dict[str, Any]:
        """
        Minify SQL query (remove extra whitespace)
        
        Args:
            query: SQL query to minify
            
        Returns:
            Dict with minified query
        """
        try:
            minified = sqlparse.format(
                query,
                strip_whitespace=True,
                strip_comments=True
            )
            # Further compress
            minified = ' '.join(minified.split())
            
            return {
                'success': True,
                'minified': minified,
                'original': query,
                'size_reduction': len(query) - len(minified)
            }
            
        except Exception as e:
            logger.error(f"Query minification failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'original': query
            }
    
    def analyze(self, query: str) -> Dict[str, Any]:
        """
        Analyze SQL query structure
        
        Args:
            query: SQL query to analyze
            
        Returns:
            Dict with query analysis
        """
        try:
            parsed = sqlparse.parse(query)
            
            if not parsed:
                return {
                    'success': False,
                    'error': 'Could not parse query'
                }
            
            statement = parsed[0]
            
            # Determine statement type
            stmt_type = statement.get_type()
            
            # Extract tokens info
            tokens_info = []
            for token in statement.tokens:
                if not token.is_whitespace:
                    tokens_info.append({
                        'type': str(token.ttype) if token.ttype else 'Group',
                        'value': str(token)[:50]
                    })
            
            return {
                'success': True,
                'type': stmt_type,
                'tokens': tokens_info[:20],  # Limit to first 20
                'statement_count': len(parsed),
                'is_valid': True
            }
            
        except Exception as e:
            logger.error(f"Query analysis failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Global formatter instance
query_formatter = QueryFormatter()

