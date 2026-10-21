export function artBlockReport({ data, width }, region, artPx) {
  const pixel = (x, y) => {
    const offset = (y * width + x) * 4;
    return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
  };
  const background = pixel(region.x, region.y);
  const columns = [];
  for (let x = region.x; x < region.x + region.width; x += 1) {
    let top = -1;
    let bottom = -1;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      if (pixel(x, y) !== background) {
        top = top < 0 ? y : top;
        bottom = y;
      }
    }
    columns.push({ x, top, bottom });
  }
  const sprites = [];
  for (const column of columns) {
    if (column.top < 0) {
      continue;
    }
    const last = sprites[sprites.length - 1];
    if (last !== undefined && last.right === column.x - 1) {
      last.right = column.x;
      last.top = Math.min(last.top, column.top);
      last.bottom = Math.max(last.bottom, column.bottom);
    } else {
      sprites.push({ left: column.x, right: column.x, top: column.top, bottom: column.bottom });
    }
  }
  return sprites.map((sprite) => {
    const w = sprite.right - sprite.left + 1;
    const h = sprite.bottom - sprite.top + 1;
    const perArtPx = w / artPx;
    if (!Number.isInteger(perArtPx) || h !== w) {
      return { width: w, height: h, perArtPx, badBlocks: artPx * artPx };
    }
    let badBlocks = 0;
    for (let by = 0; by < artPx; by += 1) {
      for (let bx = 0; bx < artPx; bx += 1) {
        const x0 = sprite.left + bx * perArtPx;
        const y0 = sprite.top + by * perArtPx;
        const color = pixel(x0, y0);
        let solid = true;
        for (let y = y0; y < y0 + perArtPx && solid; y += 1) {
          for (let x = x0; x < x0 + perArtPx && solid; x += 1) {
            solid = pixel(x, y) === color;
          }
        }
        badBlocks += solid ? 0 : 1;
      }
    }
    return { width: w, height: h, perArtPx, badBlocks };
  });
}
