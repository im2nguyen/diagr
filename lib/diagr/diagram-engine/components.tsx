'use client';

import { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { getNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import { ensureBuiltinsRegistered, MissingRenderer } from '@/lib/diagr/diagram-engine/renderers';

type DiagrNodeData = {
  label: string;
  subtitle?: string;
  renderer?: string;
  payload?: Record<string, unknown>;
};

type NodeData = {
  label: string;
};

const sideDefs = [
  { short: 'l', name: 'left', position: Position.Left },
  { short: 'r', name: 'right', position: Position.Right },
  { short: 't', name: 'top', position: Position.Top },
  { short: 'b', name: 'bottom', position: Position.Bottom },
] as const;
const laneIds = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
const handleTypes = ['target', 'source'] as const;

const handleDefs = sideDefs.flatMap((side) =>
  laneIds.flatMap((lane) =>
    handleTypes.map((type) => ({
      id: `${side.short}-${lane}-${type}`,
      type,
      position: side.position,
      className: `diagr-handle diagr-handle-${side.name}-${lane}`,
    })),
  ),
);

export const DiagrNode = memo(({ data }: NodeProps<DiagrNodeData>) => {
  ensureBuiltinsRegistered();

  const requested = typeof data.renderer === 'string' ? data.renderer : 'default';
  const Renderer = getNodeRenderer(requested) ?? MissingRenderer;
  const rendererData = getNodeRenderer(requested)
    ? data.payload
    : {
        ...(data.payload ?? {}),
        requestedRenderer: requested,
      };

  return (
    <>
      {handleDefs.map((handle) => (
        <Handle key={handle.id} id={handle.id} type={handle.type} position={handle.position} className={handle.className} />
      ))}
      <Renderer label={data.label} subtitle={data.subtitle} data={rendererData} />
    </>
  );
});

export const GroupNode = memo(({ data }: NodeProps<NodeData>) => {
  const displayLabel = typeof data.label === 'string' ? data.label : '';
  return (
    <div className="diagr-group-node">
      {handleDefs.map((handle) => (
        <Handle key={handle.id} id={handle.id} type={handle.type} position={handle.position} className={handle.className} />
      ))}
      <div className="diagr-group-header">{displayLabel}</div>
    </div>
  );
});

export const GroupCaptionNode = memo(({ data }: NodeProps<NodeData>) => {
  return <div className="diagr-group-caption">{data.label}</div>;
});

export const DiagramTitleNode = memo(({ data }: NodeProps<NodeData>) => {
  return <div className="diagr-diagram-title">{data.label}</div>;
});

DiagrNode.displayName = 'DiagrNode';
GroupNode.displayName = 'GroupNode';
GroupCaptionNode.displayName = 'GroupCaptionNode';
DiagramTitleNode.displayName = 'DiagramTitleNode';
