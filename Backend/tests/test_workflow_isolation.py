"""Layer test: a workflow touches only its own tables and none of another
workflow's code (clause_a_common.mandatory_rules; 06-self-check Step 6.1;
R42-4).

The tables a workflow owns are not typed here: they are read from the
workflow's own `_STORAGE_UPGRADES` (the CREATE TABLE and CREATE INDEX
statements) plus its version table. Then, by reading the source of the
layer (no running code):

1. every table named by an SQL statement of a workflow's adapters.py is a
   table that workflow owns;
2. no services.py, routers.py or entities.py holds an SQL statement or
   imports sqlite3 (SQL is a technical act: the Adapters', 04 Step 4.3);
3. no workflow imports code of another workflow, nor of the Main.

Workflows talk through the in_process entries the Main hands them
(api_contract.yaml, endpoint_forms.in_process), never through an import.
"""

import ast
import importlib
import re
from pathlib import Path

import pytest

LAYER_ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS_DIR = LAYER_ROOT / "workflows"
WORKFLOWS = sorted(p.name for p in WORKFLOWS_DIR.iterdir() if (p / "adapters.py").is_file())
# Files of a workflow that must hold no SQL.
NO_SQL_FILES = ("services.py", "routers.py", "entities.py")
# Tables of SQLite itself.
SYSTEM_TABLES = {"sqlite_master", "sqlite_schema", "sqlite_sequence", "sqlite_temp_master"}

_IDENT = r"[A-Za-z_][A-Za-z0-9_]*"
# Where a table name stands in a statement. "ON" and "UPDATE" also open the
# clauses ON DELETE / ON UPDATE / ON CONFLICT, which name no table.
_TABLE_REFERENCES = [
    re.compile(rf"\bFROM\s+({_IDENT})", re.I),
    re.compile(rf"\bJOIN\s+({_IDENT})", re.I),
    re.compile(rf"\bINTO\s+({_IDENT})", re.I),
    re.compile(rf"(?<!\bON\s)\bUPDATE\s+(?!SET\b)({_IDENT})", re.I),
    re.compile(rf"\b(?:CREATE|DROP|ALTER)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?({_IDENT})", re.I),
    re.compile(rf"\bON\s+(?!DELETE\b|UPDATE\b|CONFLICT\b)({_IDENT})\s*\(", re.I),  # CREATE INDEX ... ON t (
    re.compile(rf"\bREFERENCES\s+({_IDENT})", re.I),
]
_INDEX_NAME = re.compile(rf"\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?({_IDENT})", re.I)
_LOOKS_LIKE_SQL = re.compile(
    r"^\s*(SELECT\s.+\sFROM\s|INSERT\s+(OR\s+\w+\s+)?INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s|"
    r"CREATE\s+(UNIQUE\s+)?(TABLE|INDEX|VIEW|TRIGGER)\s|DROP\s+(TABLE|INDEX|VIEW|TRIGGER)\s|ALTER\s+TABLE\s|"
    r"PRAGMA\s|WITH\s+\w+\s+AS\s|ATTACH\s|VACUUM\b|BEGIN\b|COMMIT\b|ROLLBACK\b)",
    re.I | re.S,
)


def tables_in(sql: str) -> set[str]:
    """Names of the tables an SQL statement refers to."""
    found: set[str] = set()
    for pattern in _TABLE_REFERENCES:
        found.update(m.group(1) for m in pattern.finditer(sql))
    return {name for name in found if name.lower() not in {"select", "values", "set"}}


def _string_value(node: ast.AST, module_constants: dict) -> str | None:
    """The text of a string literal or f-string; a replacement field that names
    a module-level string constant is replaced by its value, any other by
    '?' (so it can never be mistaken for a table)."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        parts = []
        for part in node.values:
            if isinstance(part, ast.Constant):
                parts.append(str(part.value))
            elif isinstance(part, ast.FormattedValue) and isinstance(part.value, ast.Name):
                value = module_constants.get(part.value.id)
                parts.append(value if isinstance(value, str) else "?")
            else:
                parts.append("?")
        return "".join(parts)
    return None


def _sql_strings(path: Path, module_constants: dict) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    docstrings = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                docstrings.add(id(body[0].value))
    found = []
    nested = set()  # the constants inside an f-string are not statements of their own
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            nested.update(id(v) for v in node.values)
    for node in ast.walk(tree):
        if id(node) in docstrings or id(node) in nested:
            continue
        text = _string_value(node, module_constants)
        if text is not None and _LOOKS_LIKE_SQL.match(text):
            found.append(text)
    return found


def _module_constants(name: str) -> dict:
    module = importlib.import_module(f"workflows.{name}.adapters")
    return {k: v for k, v in vars(module).items() if isinstance(v, str)}


def owned_tables(name: str) -> set[str]:
    """The tables and indexes a workflow creates, from its _STORAGE_UPGRADES,
    plus its version table (and the legacy name of it, when it has one)."""
    module = importlib.import_module(f"workflows.{name}.adapters")
    owned = {f"{name}_schema_version"}
    legacy = getattr(module, "_LEGACY_VERSION_TABLE", None)
    if legacy:
        owned.add(legacy)
    for _version, statements in getattr(module, "_STORAGE_UPGRADES", []):
        for statement in statements:
            owned.update(m for m in tables_in(statement) if re.search(rf"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?{m}\b", statement, re.I))
            owned.update(_INDEX_NAME.findall(statement))
    return owned


# --- the scanner itself ---------------------------------------------------------

@pytest.mark.parametrize(
    "sql,expected",
    [
        ("SELECT a FROM commission WHERE id = ?", {"commission"}),
        ("SELECT a FROM payment p JOIN commission c ON c.id = p.commission_id", {"payment", "commission"}),
        ("INSERT INTO payment (a) VALUES (?)", {"payment"}),
        ("UPDATE payment SET a = ? WHERE id = ?", {"payment"}),
        ("DELETE FROM client_contact WHERE client_id = ?", {"client_contact"}),
        ("CREATE TABLE IF NOT EXISTS t (x INTEGER REFERENCES client (client_id) ON DELETE CASCADE)", {"t", "client"}),
        ("CREATE INDEX i ON payment (commission_id)", {"payment"}),
        ("SELECT version FROM manage_client_schema_version", {"manage_client_schema_version"}),
        ("SELECT 1 FROM sqlite_master WHERE type = 'table'", {"sqlite_master"}),
        ("PRAGMA foreign_keys = ON", set()),
    ],
)
def test_the_scanner_reads_table_names_out_of_statements(sql, expected):
    assert tables_in(sql) == expected


def test_the_scanner_finds_the_statements_and_the_tables_of_the_layer():
    # A scanner that finds nothing would pass every check below.
    for name, expected in (("manage_client", {"client", "client_contact"}), ("record_payment", {"payment"})):
        constants = _module_constants(name)
        statements = _sql_strings(WORKFLOWS_DIR / name / "adapters.py", constants)
        referenced = set().union(*(tables_in(s) for s in statements))
        assert len(statements) >= 5, (name, statements)
        assert expected <= referenced, (name, referenced)
        assert expected <= owned_tables(name), (name, owned_tables(name))


def test_a_statement_that_reads_another_workflows_table_is_seen(tmp_path):
    source = tmp_path / "adapters.py"
    source.write_text(
        'def f(conn):\n    return conn.execute("SELECT amount_minor FROM commission WHERE commission_id = ?")\n',
        encoding="utf-8",
    )
    statements = _sql_strings(source, {})
    assert tables_in(statements[0]) == {"commission"}
    assert tables_in(statements[0]) - owned_tables("record_payment") == {"commission"}


# --- 1. adapters.py touches only the workflow's own tables ----------------------

def test_the_tables_of_two_workflows_are_never_the_same_table():
    seen: dict[str, str] = {}
    for name in WORKFLOWS:
        for table in owned_tables(name):
            assert table not in seen, f"{table} is owned by both {seen[table]} and {name}"
            seen[table] = name


@pytest.mark.parametrize("name", WORKFLOWS)
def test_adapters_touch_only_tables_of_their_own_workflow(name):
    own = owned_tables(name) | SYSTEM_TABLES
    statements = _sql_strings(WORKFLOWS_DIR / name / "adapters.py", _module_constants(name))
    foreign = {}
    for statement in statements:
        for table in tables_in(statement) - own:
            foreign.setdefault(table, statement.strip().split("\n")[0][:80])
    assert foreign == {}, f"{name} touches tables it does not own: {foreign}"


# --- 2. no SQL outside the Adapters ---------------------------------------------

NO_SQL_CASES = [
    (name, filename) for name in WORKFLOWS for filename in NO_SQL_FILES if (WORKFLOWS_DIR / name / filename).is_file()
]


def test_the_layers_files_without_sql_are_the_ones_the_workflows_have():
    # scaffold_backend (a foundation workflow) has Configs and Adapters only.
    assert len(NO_SQL_CASES) == 3 * (len(WORKFLOWS) - 1)
    assert not [c for c in NO_SQL_CASES if c[0] == "scaffold_backend"]


@pytest.mark.parametrize(("name", "filename"), NO_SQL_CASES)
def test_services_routers_and_entities_hold_no_sql(name, filename):
    path = WORKFLOWS_DIR / name / filename
    assert _sql_strings(path, {}) == []
    tree = ast.parse(path.read_text(encoding="utf-8"))
    imported = {
        alias.name.split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names
    } | {
        (node.module or "").split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.ImportFrom) and node.level == 0
    }
    assert "sqlite3" not in imported, f"{name}/{filename} imports sqlite3"


# --- 3. no import of another workflow's code or of the Main ----------------------

def _imports_of(path: Path) -> list[tuple[str, int]]:
    """(dotted module path, line) of every import, relative ones resolved to
    their package of the layer."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    relative_to = path.relative_to(LAYER_ROOT).with_suffix("").parts[:-1]  # package of the file
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.extend((alias.name, node.lineno) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level == 0:
                found.append((node.module or "", node.lineno))
            else:
                base = relative_to[: len(relative_to) - (node.level - 1)]
                found.append((".".join(base + ((node.module,) if node.module else ())), node.lineno))
    return found


def _production_files(name: str):
    for path in sorted((WORKFLOWS_DIR / name).rglob("*.py")):
        if "tests" not in path.relative_to(WORKFLOWS_DIR / name).parts and "__pycache__" not in path.parts:
            yield path


# Imports of code of another workflow that are allowed. None: the calls
# between workflows are the in_process entries handed over by the Main.
ALLOWED_CROSS_WORKFLOW_IMPORTS: dict[str, set[str]] = {}


@pytest.mark.parametrize("name", WORKFLOWS)
def test_no_workflow_imports_another_workflows_code_or_the_main(name):
    allowed = ALLOWED_CROSS_WORKFLOW_IMPORTS.get(name, set())
    offending = []
    for path in _production_files(name):
        for module, line in _imports_of(path):
            parts = module.split(".")
            other_workflow = parts[0] == "workflows" and len(parts) > 1 and parts[1] != name
            main = parts[0] == "Backend"
            if (other_workflow or main) and module not in allowed:
                offending.append(f"{path.relative_to(LAYER_ROOT).as_posix()}:{line} imports {module}")
    assert offending == []
