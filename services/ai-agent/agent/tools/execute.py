import os
import subprocess
import tempfile
import json
from typing import Optional
from langchain.tools import tool
from pydantic import BaseModel, Field

class ExecuteCodeInput(BaseModel):
    code: str = Field(description="The code to execute")
    language: str = Field(
        default="javascript",
        description="Programming language: javascript, typescript, or python"
    )
    timeout: int = Field(default=5, description="Execution timeout in seconds (max 30)")

# Restricted Python imports/operations
PYTHON_FORBIDDEN = [
    "import os", "import sys", "import subprocess", "import socket",
    "__import__", "exec(", "eval(", "open(", "file(",
    "import shutil", "import pathlib", "import pickle",
]

@tool("execute_code", args_schema=ExecuteCodeInput)
def execute_code(code: str, language: str = "javascript", timeout: int = 5) -> str:
    """
    Executes code in a sandboxed environment.
    - JavaScript/TypeScript runs in Deno with restricted permissions (no network, no filesystem)
    - Python runs in a restricted subprocess with limited imports
    Returns the output or error message.
    """
    timeout = min(timeout, 30)  # Cap at 30 seconds
    
    if language in ["javascript", "typescript", "js", "ts"]:
        return _execute_deno(code, timeout, language in ["typescript", "ts"])
    elif language == "python":
        return _execute_python(code, timeout)
    else:
        return f"Unsupported language: {language}. Supported: javascript, typescript, python"


def _execute_deno(code: str, timeout: int, is_typescript: bool) -> str:
    """Execute JS/TS in Deno sandbox with no permissions."""
    ext = ".ts" if is_typescript else ".js"
    
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix=ext, delete=False) as f:
            f.write(code)
            temp_path = f.name
        
        # Run with no permissions (--allow-none is implicit when no flags)
        result = subprocess.run(
            [
                "deno", "run",
                "--no-prompt",  # Don't prompt for permissions
                temp_path
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "NO_COLOR": "1"},
        )
        
        output = result.stdout
        if result.returncode != 0:
            output += f"\nError: {result.stderr}"
        
        # Clean up
        try:
            os.unlink(temp_path)
        except:
            pass
            
        return output[:2000]  # Limit output length
        
    except subprocess.TimeoutExpired:
        return f"Execution timed out after {timeout} seconds"
    except FileNotFoundError:
        return "Deno is not installed. Please install Deno to run JavaScript/TypeScript code."
    except Exception as e:
        return f"Execution failed: {str(e)}"


def _execute_python(code: str, timeout: int) -> str:
    """Execute Python in a restricted subprocess."""
    
    # Check for forbidden imports/operations
    for forbidden in PYTHON_FORBIDDEN:
        if forbidden in code:
            return f"Security error: '{forbidden}' is not allowed in sandboxed Python execution."
    
    # Wrap code to capture output
    wrapper = f'''
import sys
from io import StringIO

# Redirect stdout
_old_stdout = sys.stdout
sys.stdout = _buffer = StringIO()

try:
{chr(10).join("    " + line for line in code.split(chr(10)))}
except Exception as e:
    print(f"Error: {{type(e).__name__}}: {{e}}")

# Get output
sys.stdout = _old_stdout
print(_buffer.getvalue())
'''
    
    try:
        result = subprocess.run(
            ["python", "-c", wrapper],
            capture_output=True,
            text=True,
            timeout=timeout,
            env={
                "PATH": os.environ.get("PATH", ""),
                "PYTHONDONTWRITEBYTECODE": "1",
            },
        )
        
        output = result.stdout
        if result.returncode != 0:
            output += f"\nError: {result.stderr}"
        
        return output[:2000]  # Limit output length
        
    except subprocess.TimeoutExpired:
        return f"Execution timed out after {timeout} seconds"
    except Exception as e:
        return f"Execution failed: {str(e)}"


class CalculateInput(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")

@tool("calculate", args_schema=CalculateInput)
def calculate(expression: str) -> str:
    """
    Safely evaluates a mathematical expression.
    Supports basic arithmetic, exponents, and common math functions.
    """
    import math
    
    # Allowed functions and constants
    allowed_names = {
        'abs': abs, 'round': round, 'min': min, 'max': max,
        'sum': sum, 'pow': pow, 'int': int, 'float': float,
        'sqrt': math.sqrt, 'sin': math.sin, 'cos': math.cos,
        'tan': math.tan, 'log': math.log, 'log10': math.log10,
        'exp': math.exp, 'pi': math.pi, 'e': math.e,
        'ceil': math.ceil, 'floor': math.floor,
    }
    
    # Remove potentially dangerous characters
    for char in ['_', 'import', 'exec', 'eval', 'open', 'file', '__']:
        if char in expression:
            return f"Invalid expression: '{char}' is not allowed"
    
    try:
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"{expression} = {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"
