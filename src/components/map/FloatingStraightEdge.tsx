"use client";

import { useMemo } from "react";
import {
  BaseEdge,
  getStraightPath,
  useStore,
  type EdgeProps,
} from "reactflow";
import {
  getNodeBounds,
  getDotCenter,
  getSegmentRectExit,
  getSegmentRectEntry,
} from "./floatingEdgeUtils";

/**
 * ノード外周の「相手に最も近い点」同士を直線で結ぶ Floating Straight Edge。
 * Layer2（ドット）はドット中心を起点とし、親ノードの最も近い境界へ直線で接続する。
 */
export function FloatingStraightEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
}: EdgeProps) {
  const nodes = useStore((s) => s.getNodes());
  const { path, labelX, labelY } = useMemo(() => {
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);

    let startX = sourceX;
    let startY = sourceY;
    let endX = targetX;
    let endY = targetY;

    if (sourceNode && targetNode) {
      const srcBounds = getNodeBounds(sourceNode);
      const tgtBounds = getNodeBounds(targetNode);

      const srcCenter = srcBounds.isDot
        ? getDotCenter(sourceNode)
        : {
            x: sourceNode.position.x + srcBounds.rect.width / 2,
            y: sourceNode.position.y + srcBounds.rect.height / 2,
          };
      const tgtCenter = tgtBounds.isDot
        ? getDotCenter(targetNode)
        : {
            x: targetNode.position.x + tgtBounds.rect.width / 2,
            y: targetNode.position.y + tgtBounds.rect.height / 2,
          };

      if (srcBounds.isDot && !tgtBounds.isDot) {
        startX = srcCenter.x;
        startY = srcCenter.y;
        const entry = getSegmentRectEntry(
          srcCenter.x,
          srcCenter.y,
          tgtCenter.x,
          tgtCenter.y,
          tgtBounds.rect
        );
        if (entry) {
          endX = entry.x;
          endY = entry.y;
        }
      } else if (!srcBounds.isDot && tgtBounds.isDot) {
        endX = tgtCenter.x;
        endY = tgtCenter.y;
        const exit = getSegmentRectExit(
          srcCenter.x,
          srcCenter.y,
          tgtCenter.x,
          tgtCenter.y,
          srcBounds.rect
        );
        if (exit) {
          startX = exit.x;
          startY = exit.y;
        }
      } else if (!srcBounds.isDot && !tgtBounds.isDot) {
        const exit = getSegmentRectExit(
          srcCenter.x,
          srcCenter.y,
          tgtCenter.x,
          tgtCenter.y,
          srcBounds.rect
        );
        const entry = getSegmentRectEntry(
          srcCenter.x,
          srcCenter.y,
          tgtCenter.x,
          tgtCenter.y,
          tgtBounds.rect
        );
        if (exit) {
          startX = exit.x;
          startY = exit.y;
        }
        if (entry) {
          endX = entry.x;
          endY = entry.y;
        }
      } else {
        startX = srcCenter.x;
        startY = srcCenter.y;
        endX = tgtCenter.x;
        endY = tgtCenter.y;
      }
    }

    const [pathStr, lx, ly] = getStraightPath({
      sourceX: startX,
      sourceY: startY,
      targetX: endX,
      targetY: endY,
    });
    return { path: pathStr, labelX: lx, labelY: ly };
  }, [nodes, source, target, sourceX, sourceY, targetX, targetY]);

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  );
}
