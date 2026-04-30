import Dagre from '@dagrejs/dagre';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2, Pencil, Plus, Trash2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalysisIssue, IssueType } from '../../lib/types';
import { Button } from '../ui/button';
import { ConfirmModal } from '../ui/confirm-modal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

// ─── Types ───────────────────────────────────────────────────────────────────

type Entry = { path: string; value: string };

type TreeNode =
  | { kind: 'leaf'; key: string; path: string; value: string }
  | { kind: 'group'; key: string; path: string; children: TreeNode[] };

type EditingState = {
  path: string;
  value: string;
  referenceValue: string | undefined;
  issue: AnalysisIssue | undefined;
};
type AddingState = { parentPath: string };
type DeletingState = { path: string };

// ─── Tree building ────────────────────────────────────────────────────────────

function buildTree(entries: Entry[]): TreeNode[] {
  const root: Record<string, unknown> = {};
  for (const { path, value } of entries) {
    const parts = path.split('.');
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
  function toNodes(obj: Record<string, unknown>, parent: string): TreeNode[] {
    return Object.entries(obj).map(([key, val]) => {
      const path = parent ? `${parent}.${key}` : key;
      if (typeof val === 'string') return { kind: 'leaf' as const, key, path, value: val };
      return { kind: 'group' as const, key, path, children: toNodes(val as Record<string, unknown>, path) };
    });
  }
  return toNodes(root, '');
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAF_W = 228;
const LEAF_H = 74;
const LEAF_H_REF = 94;
const GROUP_W = 210;
const GROUP_H = 48;
const ROOT_W = 160;
const ROOT_H = 44;

const ISSUE_BORDER: Record<IssueType, string> = {
  MISSING_KEY: 'border-red-300 bg-red-50/60',
  UNUSED_KEY: 'border-yellow-300 bg-yellow-50/60',
  INTERPOLATION_MISMATCH: 'border-orange-300 bg-orange-50/60',
  INCORRECT_NESTING: 'border-amber-300 bg-amber-50/60',
};
const ISSUE_BADGE: Record<IssueType, string> = {
  MISSING_KEY: 'bg-red-100 text-red-700',
  UNUSED_KEY: 'bg-yellow-100 text-yellow-700',
  INTERPOLATION_MISMATCH: 'bg-orange-100 text-orange-700',
  INCORRECT_NESTING: 'bg-amber-100 text-amber-700',
};
const ISSUE_LABEL: Record<IssueType, string> = {
  MISSING_KEY: 'Falta',
  UNUSED_KEY: 'Extra',
  INTERPOLATION_MISMATCH: 'Interpolación',
  INCORRECT_NESTING: 'Anidado',
};

// ─── Custom nodes ─────────────────────────────────────────────────────────────

const JsonRootNode = memo(({ data }: NodeProps) => {
  const { count, onAdd } = data as { count: number; onAdd: () => void };
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-zinc-500 bg-zinc-900 px-3 py-2.5 text-white shadow-md">
      <Handle type="source" position={Position.Right} style={{ background: '#71717a', width: 8, height: 8 }} />
      <span className="font-mono text-sm font-semibold">{'{ }'}</span>
      <span className="text-xs text-zinc-400">{count}</span>
      <button
        type="button"
        className="ml-auto rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        title="Añadir clave"
      >
        <Plus size={12} />
      </button>
    </div>
  );
});
JsonRootNode.displayName = 'JsonRootNode';

const JsonGroupNode = memo(({ data }: NodeProps) => {
  const { label, childCount, issueCount, onAdd, onDelete, hasIncorrectNesting } = data as {
    label: string;
    childCount: number;
    issueCount: number;
    hasIncorrectNesting?: boolean;
    onAdd: () => void;
    onDelete: () => void;
  };
  let borderClass = 'border-zinc-200';
  if (hasIncorrectNesting) borderClass = 'border-amber-300';
  else if (issueCount > 0) borderClass = 'border-red-200';
  return (
    <div className={`flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm ${borderClass}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#d4d4d8', width: 8, height: 8 }} />
      <span className="font-mono text-sm font-semibold text-zinc-700">{label}</span>
      <span className="text-xs text-zinc-400">{childCount}</span>
      {issueCount > 0 && (
        <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700">
          {issueCount}
        </span>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          className="rounded p-0.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          title="Añadir clave hija"
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-zinc-300 hover:bg-red-50 hover:text-red-500"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar grupo"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#d4d4d8', width: 8, height: 8 }} />
    </div>
  );
});
JsonGroupNode.displayName = 'JsonGroupNode';

const JsonLeafNode = memo(({ data }: NodeProps) => {
  const { label, path, value, refValue, refDiffers, issue, isResolved, onEdit, onDelete } = data as {
    label: string;
    path: string;
    value: string;
    refValue: string | undefined;
    refDiffers: boolean;
    issue: AnalysisIssue | undefined;
    isResolved: boolean;
    onEdit: (path: string, value: string) => void;
    onDelete: (path: string) => void;
  };

  const keepIssueVisible = issue?.type === 'INCORRECT_NESTING';

  const borderClass = keepIssueVisible
    ? ISSUE_BORDER[issue.type]
    : isResolved
      ? 'border-emerald-300 bg-emerald-50/40'
      : issue
        ? ISSUE_BORDER[issue.type]
        : 'border-zinc-200 bg-white';

  return (
    <div className={`rounded-lg border-2 px-2.5 py-2 shadow-sm ${borderClass}`} style={{ width: LEAF_W }}>
      <Handle type="target" position={Position.Left} style={{ background: '#d4d4d8', width: 8, height: 8 }} />
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[11px] font-medium text-zinc-500">{label}</span>
            {issue && (!isResolved || keepIssueVisible) && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${ISSUE_BADGE[issue.type]}`}>
                {ISSUE_LABEL[issue.type]}
              </span>
            )}
            {isResolved && !keepIssueVisible && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                Resuelto
              </span>
            )}
          </div>
          <p
            className={`mt-0.5 truncate font-mono text-[11px] ${value ? 'text-zinc-800' : 'italic text-zinc-400'}`}
            title={value}
          >
            {value || '∅ vacío'}
          </p>
          {refValue !== undefined && (
            <p
              className={`mt-0.5 truncate font-mono text-[10px] ${refDiffers ? 'text-amber-700' : 'text-zinc-400'}`}
              title={refValue}
            >
              ref: {refValue || <span className="italic">∅ vacío</span>}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(path, value);
            }}
            title="Editar valor"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(path);
            }}
            title="Eliminar clave"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
});
JsonLeafNode.displayName = 'JsonLeafNode';

const NODE_TYPES = {
  jsonRoot: JsonRootNode,
  jsonGroup: JsonGroupNode,
  jsonLeaf: JsonLeafNode,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

function applyDagreLayout(rawNodes: Node[], rawEdges: Edge[], showRef: boolean) {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 100, marginx: 24, marginy: 24 });

  for (const n of rawNodes) {
    let w = GROUP_W;
    let h = GROUP_H;
    if (n.type === 'jsonRoot') {
      w = ROOT_W;
      h = ROOT_H;
    } else if (n.type === 'jsonLeaf') {
      w = LEAF_W;
      h = showRef ? LEAF_H_REF : LEAF_H;
    }
    g.setNode(n.id, { width: w, height: h });
  }
  for (const e of rawEdges) g.setEdge(e.source, e.target);
  Dagre.layout(g);

  return rawNodes.map((n) => {
    const pos = g.node(n.id);
    let w = GROUP_W;
    let h = GROUP_H;
    if (n.type === 'jsonRoot') {
      w = ROOT_W;
      h = ROOT_H;
    } else if (n.type === 'jsonLeaf') {
      w = LEAF_W;
      h = showRef ? LEAF_H_REF : LEAF_H;
    }
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

// ─── Graph builder ────────────────────────────────────────────────────────────

function buildFlowGraph(
  entries: Entry[],
  refMap: Map<string, string> | null,
  showReference: boolean,
  issueByPath: Map<string, AnalysisIssue>,
  resolvedIssueIds: Set<string>,
  onEdit: (path: string, value: string) => void,
  onDelete: (path: string) => void,
  onAdd: (parentPath: string) => void,
): { rawNodes: Node[]; rawEdges: Edge[] } {
  const tree = buildTree(entries);
  const rawNodes: Node[] = [];
  const rawEdges: Edge[] = [];
  const ROOT_ID = '__root__';

  rawNodes.push({
    id: ROOT_ID,
    type: 'jsonRoot',
    data: { count: tree.length, onAdd: () => onAdd('') },
    position: { x: 0, y: 0 },
  });

  function subtreeIssueCount(path: string) {
    const issueIds = new Set<string>();
    for (const [key, issue] of issueByPath) {
      if (key === path || key.startsWith(`${path}.`)) issueIds.add(issue.id);
    }
    return issueIds.size;
  }

  function hasIncorrectNestingInSubtree(path: string) {
    for (const [key, issue] of issueByPath) {
      if ((key === path || key.startsWith(`${path}.`)) && issue.type === 'INCORRECT_NESTING') {
        return true;
      }
    }
    return false;
  }

  function traverse(nodes: TreeNode[], parentId: string) {
    for (const node of nodes) {
      const nodeId = `n::${node.path}`;
      if (node.kind === 'group') {
        rawNodes.push({
          id: nodeId,
          type: 'jsonGroup',
          data: {
            label: node.key,
            childCount: node.children.length,
            issueCount: subtreeIssueCount(node.path),
            hasIncorrectNesting: hasIncorrectNestingInSubtree(node.path),
            onAdd: () => onAdd(node.path),
            onDelete: () => onDelete(node.path),
          },
          position: { x: 0, y: 0 },
        });
        rawEdges.push({
          id: `e::${parentId}::${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#d4d4d8', strokeWidth: 1.5 },
          animated: false,
          markerEnd: { type: 'arrowclosed', color: '#d4d4d8' },
        });
        traverse(node.children, nodeId);
      } else {
        const issue = issueByPath.get(node.path);
        const isResolved = issue ? resolvedIssueIds.has(issue.id) : false;
        const refValue = showReference ? refMap?.get(node.path) : undefined;
        const refDiffers = refValue !== undefined && refValue !== node.value;
        rawNodes.push({
          id: nodeId,
          type: 'jsonLeaf',
          data: {
            label: node.key,
            path: node.path,
            value: node.value,
            refValue,
            refDiffers,
            issue,
            isResolved,
            onEdit,
            onDelete,
          },
          position: { x: 0, y: 0 },
        });
        rawEdges.push({
          id: `e::${parentId}::${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#d4d4d8', strokeWidth: 1.5 },
          animated: false,
          markerEnd: { type: 'arrowclosed', color: '#d4d4d8' },
        });
      }
    }
  }

  traverse(tree, ROOT_ID);
  return { rawNodes, rawEdges };
}

// ─── Props ────────────────────────────────────────────────────────────────────

type JsonTreeEditorProps = {
  entries: Entry[];
  referenceEntries: Entry[] | null;
  showReference: boolean;
  issues: AnalysisIssue[];
  resolvedIssueIds: Set<string>;
  onUpdateEntry: (path: string, value: string) => void;
  onAddEntry: (path: string, value: string) => void;
  onDeleteEntry: (path: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function JsonTreeEditor({
  entries,
  referenceEntries,
  showReference,
  issues,
  resolvedIssueIds,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
}: JsonTreeEditorProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [adding, setAdding] = useState<AddingState | null>(null);
  const [addKeyName, setAddKeyName] = useState('');
  const [addKeyValue, setAddKeyValue] = useState('');
  const [deleting, setDeleting] = useState<DeletingState | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Close fullscreen with Escape only when no dialog is open
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const refMap = useMemo(
    () => (referenceEntries ? new Map(referenceEntries.map((e) => [e.path, e.value])) : null),
    [referenceEntries],
  );
  const issueByPath = useMemo(() => {
    const map = new Map<string, AnalysisIssue>();

    for (const issue of issues) {
      map.set(issue.key, issue);

      if (issue.type === 'INCORRECT_NESTING' && typeof issue.details?.foundPath === 'string') {
        map.set(issue.details.foundPath, issue);
      }
    }

    return map;
  }, [issues]);

  const onEditCallback = useCallback(
    (path: string, value: string) => {
      setEditing({ path, value, referenceValue: refMap?.get(path), issue: issueByPath.get(path) });
      setDraftValue(value);
    },
    [refMap, issueByPath],
  );

  const onAddCallback = useCallback((parentPath: string) => {
    setAdding({ parentPath });
    setAddKeyName('');
    setAddKeyValue('');
  }, []);

  const onDeleteCallback = useCallback((path: string) => {
    setDeleting({ path });
  }, []);

  // Compute graph during render — no setState, no effects for layout
  const { nodes, edges } = useMemo(() => {
    const { rawNodes, rawEdges } = buildFlowGraph(
      entries,
      refMap,
      showReference,
      issueByPath,
      resolvedIssueIds,
      onEditCallback,
      onDeleteCallback,
      onAddCallback,
    );
    return { nodes: applyDagreLayout(rawNodes, rawEdges, showReference), edges: rawEdges };
  }, [entries, refMap, showReference, issueByPath, resolvedIssueIds, onEditCallback, onDeleteCallback, onAddCallback]);

  const saveEdit = () => {
    if (!editing) return;
    onUpdateEntry(editing.path, draftValue);
    setEditing(null);
  };

  const confirmAdd = () => {
    if (!adding || !addKeyName.trim()) return;
    const fullPath = adding.parentPath ? `${adding.parentPath}.${addKeyName.trim()}` : addKeyName.trim();
    onAddEntry(fullPath, addKeyValue);
    setAdding(null);
  };

  if (entries.length === 0) {
    return (
      <div className="flex h-[580px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
        <p className="text-sm text-zinc-400">Sin entradas para mostrar.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={
          expanded
            ? 'fixed inset-0 z-50 bg-white'
            : 'h-[580px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm'
        }
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e4e4e7" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'jsonRoot') return '#18181b';
              const d = n.data as {
                issue?: AnalysisIssue;
                isResolved?: boolean;
                issueCount?: number;
                hasIncorrectNesting?: boolean;
              };
              if (d.hasIncorrectNesting) return '#fbbf24';
              if (d.issue && d.issue.type === 'INCORRECT_NESTING') return '#fbbf24';
              if (d.isResolved) return '#6ee7b7';
              if (d.issue) return '#fca5a5';
              if (d.issueCount && d.issueCount > 0) return '#fca5a5';
              return '#e4e4e7';
            }}
            maskColor="rgba(244,244,245,0.7)"
          />
          <Panel position="top-left">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
              onClick={() => onAddCallback('')}
              title="Añadir clave en la raíz"
            >
              <Plus size={13} />
              Añadir clave
            </button>
          </Panel>
          <Panel position="top-right">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {expanded ? 'Salir' : 'Ampliar'}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Edit value dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar clave</DialogTitle>
            <DialogDescription asChild>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">{editing?.path}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {editing?.issue && (
              <div className={`rounded-lg px-3 py-2 text-sm font-medium ${ISSUE_BADGE[editing.issue.type]}`}>
                {ISSUE_LABEL[editing.issue.type]}
                {editing.issue.details &&
                  ` — ${Object.entries(editing.issue.details)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                    .join(' | ')}`}
              </div>
            )}
            {editing?.referenceValue !== undefined && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor de referencia</p>
                <p className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-600">
                  {editing.referenceValue || <span className="italic text-zinc-400">∅ vacío</span>}
                </p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor actual</p>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveEdit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar clave"
        description={`Vas a eliminar "${deleting?.path ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          onDeleteEntry(deleting!.path);
          setDeleting(null);
        }}
      />

      {/* Add key dialog */}
      <Dialog open={Boolean(adding)} onOpenChange={(open) => !open && setAdding(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir clave</DialogTitle>
            <DialogDescription>
              {adding?.parentPath ? `Se creará dentro de "${adding.parentPath}"` : 'Se creará en la raíz del archivo'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {adding?.parentPath ? 'Nombre de la clave (relativo)' : 'Ruta de la clave (ej: auth.login)'}
              </p>
              <Input
                value={addKeyName}
                onChange={(e) => setAddKeyName(e.target.value)}
                placeholder={adding?.parentPath ? 'nuevaClave' : 'seccion.nuevaClave'}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAdd();
                }}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor (cadena)</p>
              <Input
                value={addKeyValue}
                onChange={(e) => setAddKeyValue(e.target.value)}
                placeholder="Texto de traducción"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAdd();
                }}
              />
            </div>
            {adding && addKeyName.trim() && (
              <p className="rounded bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-500">
                Ruta: {adding.parentPath ? `${adding.parentPath}.${addKeyName.trim()}` : addKeyName.trim()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmAdd} disabled={!addKeyName.trim()}>
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
