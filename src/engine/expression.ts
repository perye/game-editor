/**
 * Safe expression evaluator for game behavior parameters.
 * Supports: +, -, *, /, %, (, ), numbers, and variable references.
 * Variables are referenced by name: e.g. "score * 10 + 50", "health / maxHp * 100"
 */

type Token = { type: 'number'; value: number }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: string }
  | { type: 'ident'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    if (expr[i] === ' ') { i++; continue; }
    if ('+-*/%'.includes(expr[i])) {
      tokens.push({ type: 'op', value: expr[i] });
      i++;
    } else if ('()'.includes(expr[i])) {
      tokens.push({ type: 'paren', value: expr[i] });
      i++;
    } else if (/[0-9.]/.test(expr[i])) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ type: 'number', value: parseFloat(num) });
    } else if (/[a-zA-Z_]/.test(expr[i])) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { id += expr[i]; i++; }
      tokens.push({ type: 'ident', value: id });
    } else {
      i++;
    }
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };

function parseExpr(tokens: Token[], vars: Record<string, number>): number {
  const output: number[] = [];
  const ops: string[] = [];

  const apply = (op: string) => {
    const b = output.pop() ?? 0;
    const a = output.pop() ?? 0;
    switch (op) {
      case '+': output.push(a + b); break;
      case '-': output.push(a - b); break;
      case '*': output.push(a * b); break;
      case '/': output.push(b !== 0 ? a / b : 0); break;
      case '%': output.push(b !== 0 ? a % b : 0); break;
    }
  };

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token.value);
    } else if (token.type === 'ident') {
      output.push(vars[token.value] ?? 0);
    } else if (token.type === 'op') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(' &&
        (PRECEDENCE[ops[ops.length - 1]] ?? 0) >= (PRECEDENCE[token.value] ?? 0)) {
        apply(ops.pop()!);
      }
      ops.push(token.value);
    } else if (token.type === 'paren') {
      if (token.value === '(') {
        ops.push('(');
      } else {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') apply(ops.pop()!);
        ops.pop();
      }
    }
  }

  while (ops.length > 0) apply(ops.pop()!);
  return output[0] ?? 0;
}

/**
 * Evaluate an expression string with the given variable context.
 * Returns the numeric result, or the original value if not a valid expression.
 */
export function evaluateExpression(expr: string, vars: Record<string, number>): number {
  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) return 0;
    if (tokens.length === 1 && tokens[0].type === 'number') return tokens[0].value;
    return parseExpr(tokens, vars);
  } catch {
    return 0;
  }
}

/**
 * Check if a string contains expression syntax (operators, variables).
 */
export function isExpression(value: string): boolean {
  return /[+\-*/%()]/.test(value) || /[a-zA-Z_]/.test(value);
}
