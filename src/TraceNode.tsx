// Renders a formula's AST as a nested, hoverable breakdown, explaining why
// each sub-expression evaluates to true or false given the current inputs.

import type { ASTNode } from './logic';
import { astToString, evaluate } from './logic';

function explain(node: ASTNode, env: Record<string, boolean>, value: boolean): string {
  switch (node.type) {
    case 'VAR':
      return `Variable ${node.name} is ${value ? 'True' : 'False'}`;
    case 'NOT':
      return `NOT gate inverts ${!value ? 'True' : 'False'} to ${value ? 'True' : 'False'}`;
    case 'AND':
      return value ? 'True because both inputs are True' : 'False because at least one input is False';
    case 'OR':
      return value ? 'True because at least one input is True' : 'False because both inputs are False';
    case 'IMPLIES': {
      if (!value) return 'False because the premise is True but the conclusion is False';
      const premiseTrue = evaluate(node.left, env);
      return premiseTrue
        ? 'True because both premise and conclusion are True'
        : 'True because a false antecedent always makes the implication true';
    }
    case 'IFF':
      return value ? 'True because both inputs match' : 'False because inputs differ';
  }
}

export function TraceNode({ node, env }: { node: ASTNode; env: Record<string, boolean> }) {
  const value = evaluate(node, env);
  const expr = astToString(node);
  const tooltip = explain(node, env, value);

  const children =
    node.type === 'NOT' ? [node.child]
    : node.type === 'VAR' ? []
    : [node.left, node.right];

  return (
    <div className="border border-gray-800 p-3 md:p-2 mt-2 relative group bg-[#0a0a0a] hover:border-purple-500 transition-colors">
      <div className="flex items-center justify-between cursor-help">
        <span className="font-bold text-purple-400 text-sm tracking-wider">{expr}</span>
        <span className={`font-bold text-sm ${value ? 'text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]' : 'text-gray-600'}`}>
          {value ? 'T' : 'F'}
        </span>
      </div>

      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block group-active:block bg-black text-white text-xs p-2 border border-pink-500 z-50 whitespace-normal md:whitespace-nowrap w-max max-w-[85vw] md:max-w-none shadow-[0_0_10px_rgba(236,72,153,0.5)]">
        {tooltip}
      </div>

      {children.length > 0 && (
        <div className="ml-4 border-l border-gray-800 pl-2">
          {children.map((child, i) => <TraceNode key={i} node={child} env={env} />)}
        </div>
      )}
    </div>
  );
}
