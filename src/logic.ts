// Propositional logic: parsing a formula into an AST, evaluating it against a
// variable assignment, and generating truth tables / plain-English readouts.

export type ASTNode =
  | { type: 'VAR'; name: string }
  | { type: 'NOT'; child: ASTNode }
  | { type: 'AND'; left: ASTNode; right: ASTNode }
  | { type: 'OR'; left: ASTNode; right: ASTNode }
  | { type: 'IMPLIES'; left: ASTNode; right: ASTNode }
  | { type: 'IFF'; left: ASTNode; right: ASTNode };

// Recursive-descent parser over a small token stream. Operator precedence
// (loosest to tightest): <-> , -> , v (or), ^ (and), ~ (not), then atoms/parens.
export class Parser {
  private tokens: string[];
  private pos = 0;

  constructor(input: string) {
    // Accept LaTeX-style and common alternative notations for each operator.
    const normalized = input
      .replace(/\\land/g, '^')
      .replace(/\\lor/g, 'v')
      .replace(/\\neg/g, '~')
      .replace(/\\to/g, '->')
      .replace(/\\leftrightarrow/g, '<->')
      .replace(/&/g, '^')
      .replace(/\|/g, 'v')
      .replace(/!/g, '~')
      .replace(/=>/g, '->')
      .replace(/<=>/g, '<->');

    const tokenPattern = /<->|->|[A-Z]|[~^v()]/g;
    this.tokens = normalized.replace(/\s+/g, '').match(tokenPattern) || [];
  }

  parse(): ASTNode | null {
    if (this.tokens.length === 0) return null;
    try {
      const ast = this.parseIff();
      if (this.pos < this.tokens.length) throw new Error('Unexpected trailing token');
      return ast;
    } catch {
      return null;
    }
  }

  private match(expected: string): boolean {
    if (this.tokens[this.pos] === expected) {
      this.pos++;
      return true;
    }
    return false;
  }

  private parseIff(): ASTNode {
    let node = this.parseImplies();
    while (this.match('<->')) {
      node = { type: 'IFF', left: node, right: this.parseImplies() };
    }
    return node;
  }

  private parseImplies(): ASTNode {
    const node = this.parseOr();
    if (this.match('->')) {
      return { type: 'IMPLIES', left: node, right: this.parseImplies() };
    }
    return node;
  }

  private parseOr(): ASTNode {
    let node = this.parseAnd();
    while (this.match('v')) {
      node = { type: 'OR', left: node, right: this.parseAnd() };
    }
    return node;
  }

  private parseAnd(): ASTNode {
    let node = this.parseNot();
    while (this.match('^')) {
      node = { type: 'AND', left: node, right: this.parseNot() };
    }
    return node;
  }

  private parseNot(): ASTNode {
    if (this.match('~')) {
      return { type: 'NOT', child: this.parseNot() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.match('(')) {
      const node = this.parseIff();
      if (!this.match(')')) throw new Error('Missing closing parenthesis');
      return node;
    }
    const token = this.tokens[this.pos];
    if (token && /^[A-Z]$/.test(token)) {
      this.pos++;
      return { type: 'VAR', name: token };
    }
    throw new Error(`Unexpected token: ${token}`);
  }
}

export function evaluate(node: ASTNode, env: Record<string, boolean>): boolean {
  switch (node.type) {
    case 'VAR': return env[node.name] ?? false;
    case 'NOT': return !evaluate(node.child, env);
    case 'AND': return evaluate(node.left, env) && evaluate(node.right, env);
    case 'OR': return evaluate(node.left, env) || evaluate(node.right, env);
    case 'IMPLIES': return !evaluate(node.left, env) || evaluate(node.right, env);
    case 'IFF': return evaluate(node.left, env) === evaluate(node.right, env);
  }
}

export function getVars(node: ASTNode): string[] {
  const vars = new Set<string>();
  function traverse(n: ASTNode) {
    if (n.type === 'VAR') vars.add(n.name);
    else if (n.type === 'NOT') traverse(n.child);
    else {
      traverse(n.left);
      traverse(n.right);
    }
  }
  traverse(node);
  return Array.from(vars).sort();
}

export type TruthTableRow = { env: Record<string, boolean>; result: boolean };

export function generateTruthTable(ast: ASTNode, vars: string[]): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  const numVars = Math.min(vars.length, 8); // cap to avoid freezing on large formulas
  const numRows = 1 << numVars;
  for (let i = 0; i < numRows; i++) {
    const env: Record<string, boolean> = {};
    for (let j = 0; j < numVars; j++) {
      env[vars[j]] = Boolean((i >> (numVars - 1 - j)) & 1);
    }
    rows.push({ env, result: evaluate(ast, env) });
  }
  return rows;
}

export function astToString(node: ASTNode): string {
  switch (node.type) {
    case 'VAR': return node.name;
    case 'NOT': return `~${astToString(node.child)}`;
    case 'AND': return `(${astToString(node.left)} ^ ${astToString(node.right)})`;
    case 'OR': return `(${astToString(node.left)} v ${astToString(node.right)})`;
    case 'IMPLIES': return `(${astToString(node.left)} -> ${astToString(node.right)})`;
    case 'IFF': return `(${astToString(node.left)} <-> ${astToString(node.right)})`;
  }
}

// Sample cover story used by the "real-world translation" panel. Variables
// beyond these five just read as "condition X holds".
const SAMPLE_TRANSLATIONS: Record<string, string> = {
  P: 'it is raining',
  Q: 'I have an umbrella',
  R: 'I get wet',
  S: 'I stay home',
  T: 'I drink tea',
};

export function translateAST(node: ASTNode): string {
  switch (node.type) {
    case 'VAR': return SAMPLE_TRANSLATIONS[node.name] || `condition ${node.name} holds`;
    case 'NOT': return `NOT (${translateAST(node.child)})`;
    case 'AND': return `(${translateAST(node.left)} AND ${translateAST(node.right)})`;
    case 'OR': return `(${translateAST(node.left)} OR ${translateAST(node.right)})`;
    case 'IMPLIES': return `IF ${translateAST(node.left)}, THEN ${translateAST(node.right)}`;
    case 'IFF': return `${translateAST(node.left)} IF AND ONLY IF ${translateAST(node.right)}`;
  }
}
