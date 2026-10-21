/**
 * Hananeh Beauty offline compositor quality helpers.
 * These operate only on in-memory pixel arrays. No network, no inference.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** The first two BlazeFace keypoints are the left and right eye centers. */
export function eyeRotation(face, imageWidth, imageHeight) {
  if (!face || !Number.isFinite(face.eyeSlope) || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)
      || imageWidth <= 0 || imageHeight <= 0) return 0;
  return Math.atan(face.eyeSlope * imageHeight / imageWidth);
}

/**
 * Returns soft face-preservation alpha (0..255) on an image-sized raster.
 * Conservatively protects central eyes/nose/mouth, not the upper crown.
 * This is NOT semantic face segmentation; sideburns/ears remain imperfect.
 */
export function faceProtectionAlpha(width, height, face) {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width * height > 3000000) {
    throw new TypeError('Invalid canvas dimensions');
  }
  const result = new Uint8ClampedArray(width * height);
  if (!face || ![face.eyeX, face.eyeY, face.eyeDistance].every(Number.isFinite) ||
      face.eyeDistance < 0.045 || face.eyeDistance > .5 ||
      face.eyeX < 0 || face.eyeX > 1 || face.eyeY < 0 || face.eyeY > 1) return result;
  const eyes = face.eyeDistance * width;
  const cx = face.eyeX * width;
  const ey = face.eyeY * height;
  const cy = ey + eyes * .94;
  const rx = eyes * 1.14;
  const ry = eyes * 1.66;
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(width - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(height - 1, Math.ceil(cy + ry));
  const angle = eyeRotation(face, width, height);
  const sin = Math.sin(angle), cos = Math.cos(angle);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy;
      const u = (cos * dx + sin * dy) / rx;
      const v = (-sin * dx + cos * dy) / ry;
      const radius = Math.hypot(u, v);
      if (radius >= 1) continue;
      // Softness only affects the edge; interior face pixels stay identical.
      const a = clamp((1 - radius) / .15, 0, 1);
      result[y * width + x] = Math.round(a * 255);
    }
  }
  return result;
}

/**
 * Measure original hair likely to remain visible after a reference mask is
 * positioned on the customer. Arrays are RGBA byte buffers of equal shape.
 * Value is advisory, never a proof of hairstyle fidelity.
 */
export function exposedHairFraction(original, projected, width, height) {
  const expected = width * height * 4;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 ||
      height < 1 || width * height > 3000000 ||
      original?.length !== expected || projected?.length !== expected) {
    throw new TypeError('Invalid hair-mask arrays');
  }
  let total = 0, exposed = 0;
  // Do not interpret dark clothes below the hair as "original hair".
  for (let y = 0; y < Math.min(height, Math.ceil(height * .78)); y += 2) {
    for (let x = 0; x < width; x += 2) {
      const offset = (y * width + x) * 4;
      if (original[offset] < 170) continue;
      total++;
      if (projected[offset] < 85) exposed++;
    }
  }
  return { fraction: total ? exposed / total : 0, total, exposed,
    reliable: total >= 30 };
}


/**
 * Conservative photo/view mismatch guard, not 3D pose estimation.
 * MediaPipe detects eye centers and a nose tip; significant differences in
 * their ratios predict visually poor 2D hairstyle overlap.
 * Unknown nose landmarks => unknown, never a false precision claim.
 */
export function poseCompatibility(customer,reference) {
 const a=customer?.yaw,b=reference?.yaw;
 if(!Number.isFinite(a)||!Number.isFinite(b))return {known:false,mismatch:false,difference:null};
 const difference=Math.abs(a-b);
 return {known:true,mismatch:difference>=0.34,difference};
}
