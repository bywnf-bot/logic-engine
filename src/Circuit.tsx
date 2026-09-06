// 3D circuit visualization: lays the AST out as a tree of gates and wires,
// then renders it with react-three-fiber.

import { useEffect, type CSSProperties } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import type { ASTNode } from './logic';
import { evaluate } from './logic';

type LayoutNode = {
  ast: ASTNode;
  x: number;
  y: number;
  id: string;
  value: boolean;
  children: LayoutNode[];
};

// Positions each node: x by depth from the root, y so that a parent sits
// vertically centered between its children (a simple tidy-tree layout).
export function layoutAST(ast: ASTNode, env: Record<string, boolean>): LayoutNode {
  let idCounter = 0;

  function buildLayout(node: ASTNode, depth: number): LayoutNode {
    const id = `node_${idCounter++}`;
    const value = evaluate(node, env);
    if (node.type === 'VAR') {
      return { ast: node, x: -depth * 4, y: 0, id, value, children: [] };
    }
    if (node.type === 'NOT') {
      return { ast: node, x: -depth * 4, y: 0, id, value, children: [buildLayout(node.child, depth + 1)] };
    }
    return {
      ast: node,
      x: -depth * 4,
      y: 0,
      id,
      value,
      children: [buildLayout(node.left, depth + 1), buildLayout(node.right, depth + 1)],
    };
  }

  const root = buildLayout(ast, 0);

  let currentY = 0;
  function assignY(node: LayoutNode) {
    if (node.children.length === 0) {
      node.y = currentY;
      currentY += 2;
      return;
    }
    node.children.forEach(assignY);
    node.y = node.children.length === 1
      ? node.children[0].y
      : (node.children[0].y + node.children[node.children.length - 1].y) / 2;
  }
  assignY(root);

  // Center the whole tree on the origin so FitCamera can frame it symmetrically.
  const nodes = getAllNodes(root);
  const offsetY = -(Math.min(...nodes.map(n => n.y)) + Math.max(...nodes.map(n => n.y))) / 2;
  const offsetX = -(Math.min(...nodes.map(n => n.x)) + Math.max(...nodes.map(n => n.x))) / 2;

  function applyOffset(node: LayoutNode) {
    node.y += offsetY;
    node.x += offsetX;
    node.children.forEach(applyOffset);
  }
  applyOffset(root);

  return root;
}

export function getAllNodes(root: LayoutNode): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  function traverse(n: LayoutNode) {
    nodes.push(n);
    n.children.forEach(traverse);
  }
  traverse(root);
  return nodes;
}

const GATE_LABELS: Record<ASTNode['type'], string> = {
  VAR: '',
  NOT: 'NOT',
  AND: 'AND',
  OR: 'OR',
  IMPLIES: 'IF',
  IFF: 'IFF',
};

// Plain-DOM gate label, rendered via drei's <Html> rather than drei's <Text>.
// <Text> (troika-three-text) does a network fetch for Unicode font-fallback
// resolution; when that fetch fails (blocked/unreachable network), the
// failure breaks React's ability to commit state updates for the whole app,
// not just the 3D scene. <Html> renders ordinary DOM text with no such
// dependency.
const GATE_LABEL_STYLE: CSSProperties = {
  color: 'white',
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

function Gate({ node }: { node: LayoutNode }) {
  const color = node.value ? '#A855F7' : '#111111';
  const emissive = node.value ? '#A855F7' : '#000000';
  const emissiveIntensity = node.value ? 0.8 : 0;
  const label = node.ast.type === 'VAR' ? node.ast.name : GATE_LABELS[node.ast.type];

  return (
    <group position={[node.x, node.y, 0]}>
      <mesh>
        <boxGeometry args={[2, 1.2, 0.5]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.2} metalness={0.8} />
      </mesh>
      <Html position={[0, 0, 0.26]} center distanceFactor={10} style={GATE_LABEL_STYLE}>
        {label}
      </Html>
    </group>
  );
}

function Wire({ start, end, value }: { start: [number, number, number]; end: [number, number, number]; value: boolean }) {
  const color = value ? '#A855F7' : '#333333';
  const midX = (start[0] + end[0]) / 2;
  const points: [number, number, number][] = [start, [midX, start[1], 0], [midX, end[1], 0], end];
  return <Line points={points} color={color} lineWidth={4} />;
}

// Frames the camera on the whole tree whenever its bounds change, so the
// circuit stays fully in view (and readable) no matter how large the formula.
function FitCamera({ nodes }: { nodes: LayoutNode[] }) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (nodes.length === 0) return;

    const minX = Math.min(...nodes.map(n => n.x)) - 2;
    const maxX = Math.max(...nodes.map(n => n.x)) + 2;
    const minY = Math.min(...nodes.map(n => n.y)) - 1.5;
    const maxY = Math.max(...nodes.map(n => n.y)) + 1.5;

    const width = maxX - minX;
    const height = maxY - minY;
    const aspect = size.width / size.height;
    const fov = (camera as THREE_PerspectiveCamera).fov * (Math.PI / 180);

    const zForHeight = (height / 2) / Math.tan(fov / 2);
    const zForWidth = (width / 2) / Math.tan(fov / 2) / aspect;

    const targetZ = Math.max(zForHeight, zForWidth, 12 / 1.2) * 1.2;

    camera.position.set(0, 0, targetZ);
    camera.lookAt(0, 0, 0);
    (camera as THREE_PerspectiveCamera).updateProjectionMatrix();
  }, [nodes, size, camera]);

  return null;
}

// Minimal structural type for the one perspective-camera field/method we use,
// so this file doesn't need to import three's PerspectiveCamera just for that.
type THREE_PerspectiveCamera = { fov: number; updateProjectionMatrix: () => void };

export function Circuit({ layoutRoot }: { layoutRoot: LayoutNode | null }) {
  if (!layoutRoot) return null;
  const nodes = getAllNodes(layoutRoot);

  return (
    <Canvas camera={{ position: [0, 0, 15] }}>
      <FitCamera nodes={nodes} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <OrbitControls enableZoom enablePan />
      {nodes.map(node => <Gate key={node.id} node={node} />)}
      {nodes.map(node =>
        node.children.map(child => (
          <Wire key={`${node.id}-${child.id}`} start={[child.x + 1, child.y, 0]} end={[node.x - 1, node.y, 0]} value={child.value} />
        ))
      )}
    </Canvas>
  );
}
