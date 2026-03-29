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
