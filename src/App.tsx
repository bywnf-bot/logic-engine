import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Parser, getVars, generateTruthTable, translateAST } from './logic';
import { Circuit, layoutAST } from './Circuit';
import { TraceNode } from './TraceNode';

const DEFAULT_FORMULA = '((P ^ Q) v ~R) -> S';
const DEFAULT_ENV = { P: true, Q: false, R: true, S: false };

export default function App() {
  const [formula, setFormula] = useState(DEFAULT_FORMULA);
  const [env, setEnv] = useState<Record<string, boolean>>(DEFAULT_ENV);

  const ast = useMemo(() => new Parser(formula).parse(), [formula]);
  const vars = useMemo(() => (ast ? getVars(ast) : []), [ast]);

  // Whenever the formula introduces a variable we haven't seen, default it to
  // false. Existing values (and extra ones no longer in the formula) are left
  // alone, so toggles you've already set don't reset as you keep typing.
  useEffect(() => {
    setEnv(prev => {
      const next = { ...prev };
      let changed = false;
      vars.forEach(v => {
        if (next[v] === undefined) {
          next[v] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [vars]);

  const truthTable = useMemo(() => (ast ? generateTruthTable(ast, vars) : []), [ast, vars]);
  const layoutRoot = useMemo(() => (ast ? layoutAST(ast, env) : null), [ast, env]);
  const translation = useMemo(() => (ast ? translateAST(ast) : ''), [ast]);

  const toggleVar = (v: string) => setEnv(prev => ({ ...prev, [v]: !prev[v] }));

  return (
    <div className="flex flex-col md:h-screen min-h-screen bg-black text-white font-mono md:overflow-hidden">
      {/* Top: 3D circuit */}
      <div className="h-[40vh] md:h-[50vh] shrink-0 border-b-4 border-purple-500 relative bg-[#050505]">
        <Circuit layoutRoot={layoutRoot} />
        {!ast && (
          <div className="absolute inset-0 flex items-center justify-center text-pink-500 text-xl font-bold tracking-widest drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
            SYNTAX ERROR: INVALID FORMULA
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1 md:h-[50vh]">
        {/* Formula input, translation, variable toggles */}
        <div className="w-full md:w-1/3 p-4 md:p-6 border-b-4 md:border-b-0 md:border-r-4 border-purple-500 flex flex-col gap-6 md:overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-pink-500 mb-2 uppercase text-sm font-bold tracking-widest drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
              Formula Input
            </label>
            <input
              type="text"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              className="w-full bg-transparent border-2 border-purple-500 p-3 text-white outline-none focus:border-pink-500 transition-colors uppercase font-bold tracking-wider"
              placeholder={DEFAULT_FORMULA}
            />
            <div className="text-xs text-gray-500 mt-2 tracking-wide leading-relaxed">
              Supports: ^, &amp;, \land (AND) | v, |, \lor (OR) | ~, !, \neg (NOT) | -&gt;, =&gt;, \to (IMPLIES) | &lt;-&gt;, &lt;=&gt;, \leftrightarrow (IFF)
            </div>
          </div>

          <div>
            <label className="block text-pink-500 mb-2 uppercase text-sm font-bold tracking-widest drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
              Real-World Translation
            </label>
            <div className="p-3 border-2 border-gray-800 text-gray-300 text-sm italic bg-[#050505] leading-relaxed">
              {translation || 'AWAITING VALID FORMULA...'}
            </div>
          </div>

          <div>
            <label className="block text-pink-500 mb-2 uppercase text-sm font-bold tracking-widest drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
              Input Toggles
            </label>
            <div className="flex flex-col gap-2">
              {vars.map(v => (
                <button
                  key={v}
                  onClick={() => toggleVar(v)}
                  className={`border-2 p-3 text-left flex justify-between uppercase font-bold transition-all duration-200 ${env[v] ? 'border-purple-500 text-purple-400 bg-purple-900/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}
                >
                  <span>{v}</span>
                  <span>{env[v] ? 'TRUE' : 'FALSE'}</span>
                </button>
              ))}
              {vars.length === 0 && <div className="text-gray-600 text-sm">NO VARIABLES DETECTED.</div>}
            </div>
          </div>
        </div>

        {/* Truth table */}
        <div className="w-full md:w-1/3 p-4 md:p-6 border-b-4 md:border-b-0 md:border-r-4 border-purple-500 md:overflow-y-auto custom-scrollbar">
          <label className="block text-pink-500 mb-4 uppercase text-sm font-bold tracking-widest drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
            Truth Table Heatmap
          </label>
          {truthTable.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-purple-500 text-purple-400 font-bold tracking-widest">
                    {vars.map(v => <th key={v} className="p-2">{v}</th>)}
                    <th className="p-2 text-pink-500">RES</th>
                  </tr>
                </thead>
                <tbody>
                  {truthTable.map((row, i) => {
                    const isCurrent = vars.every(v => row.env[v] === env[v]);
                    return (
                      <motion.tr
                        key={i}
                        initial={false}
                        animate={{
                          backgroundColor: isCurrent ? ['rgba(168,85,247,0.6)', 'rgba(88,28,135,0.4)'] : 'transparent',
                          color: isCurrent ? '#d8b4fe' : '#6b7280',
                          textShadow: isCurrent ? '0 0 8px rgba(168,85,247,0.8)' : 'none',
                        }}
                        transition={{ duration: 0.5 }}
                        className={`border-b border-gray-900 ${isCurrent ? 'font-bold' : ''}`}
                      >
                        {vars.map(v => <td key={v} className="p-2">{row.env[v] ? 'T' : 'F'}</td>)}
                        <td className={`p-2 font-bold ${row.result ? 'text-pink-500' : ''}`}>{row.result ? 'T' : 'F'}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-600 text-sm">AWAITING VALID FORMULA...</div>
          )}
        </div>

        {/* Interactive trace */}
        <div className="w-full md:w-1/3 p-4 md:p-6 md:overflow-y-auto custom-scrollbar">
          <label className="block text-pink-500 mb-4 uppercase text-sm font-bold tracking-widest drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
            Interactive Trace
          </label>
          <div className="text-xs text-gray-500 mb-4 tracking-wide">
            Hover over any expression to see why it evaluates to True or False.
          </div>
          {ast ? <TraceNode node={ast} env={env} /> : <div className="text-gray-600 text-sm">AWAITING VALID FORMULA...</div>}
        </div>
      </div>
    </div>
  );
}
