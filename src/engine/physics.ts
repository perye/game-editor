import type { RuntimeEntity, RuntimeState } from './runtime';

export interface CollisionPair {
  a: RuntimeEntity;
  b: RuntimeEntity;
  overlapX: number;
  overlapY: number;
  normalX: number;
  normalY: number;
}

export function physicsStep(state: RuntimeState, dt: number): CollisionPair[] {
  const gravity = state.gravity;
  const entities = Array.from(state.entities.values()).filter(e => e.alive && e.visible);
  const collisions: CollisionPair[] = [];

  for (const e of entities) {
    const rb = e.rigidBody;
    if (!rb || rb.isStatic) continue;

    if (!rb.isKinematic) {
      // Apply gravity
      if (rb.gravityScale > 0) {
        rb.velocityY += gravity * rb.gravityScale * dt * 60;
      }

      // Apply friction
      if (e.onGround && rb.friction > 0) {
        rb.velocityX *= (1 - rb.friction * dt * 10);
        if (Math.abs(rb.velocityX) < 0.01) rb.velocityX = 0;
      }
    }

    e.x += rb.velocityX * dt * 60;
    e.y += rb.velocityY * dt * 60;
  }

  // Collision detection
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (!a.rigidBody && !b.rigidBody) continue;

      const layerA = a.rigidBody?.collisionLayer ?? 1;
      const maskA = a.rigidBody?.collisionMask ?? 0xFFFF;
      const layerB = b.rigidBody?.collisionLayer ?? 1;
      const maskB = b.rigidBody?.collisionMask ?? 0xFFFF;

      if (!(layerA & maskB) && !(layerB & maskA)) continue;

      const collision = detectCollision(a, b);
      if (!collision) continue;

      collisions.push(collision);

      const triggerA = a.rigidBody?.isTrigger ?? false;
      const triggerB = b.rigidBody?.isTrigger ?? false;

      if (!triggerA && !triggerB) {
        resolvePhysicsCollision(collision);
      }
    }
  }

  return collisions;
}

function detectCollision(a: RuntimeEntity, b: RuntimeEntity): CollisionPair | null {
  const shapeA = a.shape;
  const shapeB = b.shape;

  if (shapeA === 'circle' && shapeB === 'circle') {
    return circleCircle(a, b);
  }
  return aabbCollision(a, b);
}

function aabbCollision(a: RuntimeEntity, b: RuntimeEntity): CollisionPair | null {
  const aLeft = a.x - a.width / 2;
  const aRight = a.x + a.width / 2;
  const aTop = a.y - a.height / 2;
  const aBottom = a.y + a.height / 2;
  const bLeft = b.x - b.width / 2;
  const bRight = b.x + b.width / 2;
  const bTop = b.y - b.height / 2;
  const bBottom = b.y + b.height / 2;

  if (aLeft >= bRight || aRight <= bLeft || aTop >= bBottom || aBottom <= bTop) {
    return null;
  }

  const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
  const overlapY = Math.min(aBottom - bTop, bBottom - aTop);

  let normalX = 0, normalY = 0;
  let ox = overlapX, oy = overlapY;
  if (overlapX < overlapY) {
    normalX = a.x < b.x ? -1 : 1;
    oy = 0;
  } else {
    normalY = a.y < b.y ? -1 : 1;
    ox = 0;
  }

  return { a, b, overlapX: ox || overlapX, overlapY: oy || overlapY, normalX, normalY };
}

function circleCircle(a: RuntimeEntity, b: RuntimeEntity): CollisionPair | null {
  const rA = Math.min(a.width, a.height) / 2;
  const rB = Math.min(b.width, b.height) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = rA + rB;

  if (dist >= minDist) return null;

  const overlap = minDist - dist;
  const nx = dist > 0 ? dx / dist : 1;
  const ny = dist > 0 ? dy / dist : 0;

  return { a, b, overlapX: overlap, overlapY: overlap, normalX: -nx, normalY: -ny };
}

function resolvePhysicsCollision(col: CollisionPair) {
  const { a, b, normalX, normalY } = col;
  const rbA = a.rigidBody;
  const rbB = b.rigidBody;

  const staticA = rbA?.isStatic || rbA?.isKinematic || false;
  const staticB = rbB?.isStatic || rbB?.isKinematic || false;

  const overlap = normalX !== 0 ? col.overlapX : col.overlapY;

  if (staticA && !staticB) {
    b.x -= normalX * overlap;
    b.y -= normalY * overlap;
    if (rbB) {
      if (normalX !== 0) rbB.velocityX *= -(rbB.restitution);
      if (normalY !== 0) {
        rbB.velocityY *= -(rbB.restitution);
        if (normalY < 0) b.onGround = true;
      }
    }
  } else if (!staticA && staticB) {
    a.x += normalX * overlap;
    a.y += normalY * overlap;
    if (rbA) {
      if (normalX !== 0) rbA.velocityX *= -(rbA.restitution);
      if (normalY !== 0) {
        rbA.velocityY *= -(rbA.restitution);
        if (normalY > 0) a.onGround = true;
      }
    }
  } else if (!staticA && !staticB) {
    const totalMass = (rbA?.mass || 1) + (rbB?.mass || 1);
    const ratioA = (rbB?.mass || 1) / totalMass;
    const ratioB = (rbA?.mass || 1) / totalMass;
    a.x += normalX * overlap * ratioA;
    a.y += normalY * overlap * ratioA;
    b.x -= normalX * overlap * ratioB;
    b.y -= normalY * overlap * ratioB;

    const restitution = Math.min(rbA?.restitution || 0, rbB?.restitution || 0);
    if (normalX !== 0) {
      const relVel = (rbA?.velocityX || 0) - (rbB?.velocityX || 0);
      const impulse = -(1 + restitution) * relVel / totalMass;
      if (rbA) rbA.velocityX += impulse * (rbB?.mass || 1);
      if (rbB) rbB.velocityX -= impulse * (rbA?.mass || 1);
    }
    if (normalY !== 0) {
      const relVel = (rbA?.velocityY || 0) - (rbB?.velocityY || 0);
      const impulse = -(1 + restitution) * relVel / totalMass;
      if (rbA) rbA.velocityY += impulse * (rbB?.mass || 1);
      if (rbB) rbB.velocityY -= impulse * (rbA?.mass || 1);
    }
  }
}

export function checkAABB(a: RuntimeEntity, b: RuntimeEntity): boolean {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

// ─── Raycast System ───

export interface RaycastHit {
  entity: RuntimeEntity;
  point: { x: number; y: number };
  distance: number;
  normal: { x: number; y: number };
}

export function raycast(
  state: RuntimeState,
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxDistance: number = 1000,
  excludeId?: string,
  layerMask: number = 0xFFFF,
): RaycastHit | null {
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len === 0) return null;
  const ndx = dirX / len;
  const ndy = dirY / len;

  let closest: RaycastHit | null = null;

  for (const entity of state.entities.values()) {
    if (!entity.alive || !entity.visible) continue;
    if (entity.id === excludeId) continue;
    const layer = entity.rigidBody?.collisionLayer ?? 1;
    if (!(layer & layerMask)) continue;

    const hit = entity.shape === 'circle'
      ? rayCircle(originX, originY, ndx, ndy, entity)
      : rayAABB(originX, originY, ndx, ndy, entity);

    if (hit && hit.distance <= maxDistance) {
      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }
  }

  return closest;
}

function rayAABB(ox: number, oy: number, dx: number, dy: number, e: RuntimeEntity): RaycastHit | null {
  const minX = e.x - e.width / 2;
  const maxX = e.x + e.width / 2;
  const minY = e.y - e.height / 2;
  const maxY = e.y + e.height / 2;

  let tmin = -Infinity;
  let tmax = Infinity;
  let nx = 0, ny = 0;

  if (dx !== 0) {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) { tmin = t1; nx = dx > 0 ? -1 : 1; ny = 0; }
    tmax = Math.min(tmax, t2);
  } else if (ox < minX || ox > maxX) return null;

  if (dy !== 0) {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = dy > 0 ? -1 : 1; }
    tmax = Math.min(tmax, t2);
  } else if (oy < minY || oy > maxY) return null;

  if (tmin > tmax || tmax < 0) return null;
  const t = tmin >= 0 ? tmin : tmax;
  if (t < 0) return null;

  return {
    entity: e,
    point: { x: ox + dx * t, y: oy + dy * t },
    distance: t,
    normal: { x: nx, y: ny },
  };
}

function rayCircle(ox: number, oy: number, dx: number, dy: number, e: RuntimeEntity): RaycastHit | null {
  const r = Math.min(e.width, e.height) / 2;
  const fx = ox - e.x;
  const fy = oy - e.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  discriminant = Math.sqrt(discriminant);
  let t = (-b - discriminant) / (2 * a);
  if (t < 0) t = (-b + discriminant) / (2 * a);
  if (t < 0) return null;

  const px = ox + dx * t;
  const py = oy + dy * t;
  const nnx = (px - e.x) / r;
  const nny = (py - e.y) / r;

  return {
    entity: e,
    point: { x: px, y: py },
    distance: t,
    normal: { x: nnx, y: nny },
  };
}
