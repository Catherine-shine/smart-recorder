import type { TrajectoryPoint } from '../types/mousePoint';

/**
 * Ramer-Douglas-Peucker 路径简化算法
 * 用于减少轨迹点数量，同时保持轨迹形状
 * @param points 原始轨迹点数组
 * @param epsilon 容差值（像素），越大压缩率越高
 * @returns 简化后的轨迹点数组
 */
export function rdpSimplify(points: TrajectoryPoint[], epsilon: number = 2): TrajectoryPoint[] {
  if (points.length <= 2) return points;

  // 找到垂直距离最大的点
  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // 如果最大距离大于阈值，递归简化
  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  } else {
    return [points[0], points[end]];
  }
}

/**
 * 计算点到线段的垂直距离
 * @param point 要计算距离的点
 * @param lineStart 线段起点
 * @param lineEnd 线段终点
 * @returns 垂直距离
 */
function perpendicularDistance(
  point: TrajectoryPoint,
  lineStart: TrajectoryPoint,
  lineEnd: TrajectoryPoint
): number {
  const { x: px, y: py } = point;
  const { x: x1, y: y1 } = lineStart;
  const { x: x2, y: y2 } = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const norm = Math.sqrt(dx * dx + dy * dy);

  // 避免除以0
  if (norm === 0) {
    return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  }

  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm;
}

/**
 * 计算两点之间的欧氏距离
 * @param p1 点1
 * @param p2 点2
 * @returns 距离
 */
export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * 获取路径简化的统计信息
 * @param original 原始点数组
 * @param simplified 简化后的点数组
 * @returns 统计信息
 */
export function getSimplifyStats(original: TrajectoryPoint[], simplified: TrajectoryPoint[]) {
  const originalCount = original.length;
  const simplifiedCount = simplified.length;
  const reduction = originalCount - simplifiedCount;
  const reductionRate = ((reduction / originalCount) * 100).toFixed(2);

  return {
    originalCount,
    simplifiedCount,
    reduction,
    reductionRate: `${reductionRate}%`,
  };
}
