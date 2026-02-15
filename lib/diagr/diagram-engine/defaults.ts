import { NodeTypes } from 'reactflow';
import { DiagramTitleNode, DiagrNode, GroupCaptionNode, GroupNode } from '@/lib/diagr/diagram-engine/components';
import { edgeTypes } from '@/lib/diagr/diagram-engine/edges';

export const nodeTypes: NodeTypes = {
  diagrNode: DiagrNode,
  groupCard: GroupNode,
  groupCaption: GroupCaptionNode,
  diagramTitle: DiagramTitleNode,
};

export { edgeTypes };
