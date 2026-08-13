const { PNG } = require('pngjs');

const WHITE = '#FFFFFF';
const AXIS = '#334155';
const GRID = '#E2E8F0';
const PRIMARY = '#167B63';
const EXPENSE = '#E74C3C';
const COLORS = ['#167B63', '#2A9D8F', '#F39C12', '#E74C3C', '#3498DB', '#9B59B6', '#607D8B', '#2ECC71'];

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function createCanvas(width = 760, height = 360) {
  const png = new PNG({ width, height });
  fillRect(png, 0, 0, width, height, WHITE);
  return png;
}

function setPixel(png, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height) return;

  const idx = (png.width * py + px) << 2;
  const rgb = hexToRgb(color);
  png.data[idx] = rgb.r;
  png.data[idx + 1] = rgb.g;
  png.data[idx + 2] = rgb.b;
  png.data[idx + 3] = 255;
}

function fillRect(png, x, y, width, height, color) {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(png.height, Math.ceil(y + height)); yy += 1) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(png.width, Math.ceil(x + width)); xx += 1) {
      setPixel(png, xx, yy, color);
    }
  }
}

function drawLine(png, x0, y0, x1, y1, color, thickness = 2) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = Math.round(x0);
  let y = Math.round(y0);

  while (true) {
    fillRect(png, x - Math.floor(thickness / 2), y - Math.floor(thickness / 2), thickness, thickness, color);
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= r2) {
        setPixel(png, cx + x, cy + y, color);
      }
    }
  }
}

function toBuffer(png) {
  return PNG.sync.write(png);
}

function renderBarChart(items, options = {}) {
  const width = options.width || 760;
  const height = options.height || 360;
  const png = createCanvas(width, height);
  const margin = { left: 54, right: 28, top: 26, bottom: 44 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...items.map((item) => Number(item.value) || 0));

  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + chartHeight - (chartHeight * i) / 4;
    drawLine(png, margin.left, y, width - margin.right, y, GRID, 1);
  }
  drawLine(png, margin.left, margin.top, margin.left, height - margin.bottom, AXIS, 2);
  drawLine(png, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, AXIS, 2);

  const gap = 20;
  const barWidth = Math.max(24, (chartWidth - gap * (items.length + 1)) / Math.max(1, items.length));
  items.forEach((item, index) => {
    const value = Number(item.value) || 0;
    const barHeight = Math.round((value / maxValue) * (chartHeight - 8));
    const x = margin.left + gap + index * (barWidth + gap);
    const y = height - margin.bottom - barHeight;
    fillRect(png, x, y, barWidth, barHeight, item.color || PRIMARY);
  });

  return toBuffer(png);
}

function renderLineChart(items, options = {}) {
  const width = options.width || 760;
  const height = options.height || 360;
  const png = createCanvas(width, height);
  const margin = { left: 54, right: 32, top: 26, bottom: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...items.map((item) => Number(item.value) || 0));

  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + chartHeight - (chartHeight * i) / 4;
    drawLine(png, margin.left, y, width - margin.right, y, GRID, 1);
  }
  drawLine(png, margin.left, margin.top, margin.left, height - margin.bottom, AXIS, 2);
  drawLine(png, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, AXIS, 2);

  const points = items.map((item, index) => {
    const x = items.length <= 1
      ? margin.left + chartWidth / 2
      : margin.left + (chartWidth * index) / (items.length - 1);
    const y = height - margin.bottom - ((Number(item.value) || 0) / maxValue) * (chartHeight - 8);
    return { x, y };
  });

  for (let i = 1; i < points.length; i += 1) {
    drawLine(png, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, PRIMARY, 4);
  }
  points.forEach((point) => {
    fillCircle(png, Math.round(point.x), Math.round(point.y), 6, EXPENSE);
    fillCircle(png, Math.round(point.x), Math.round(point.y), 3, WHITE);
  });

  return toBuffer(png);
}

function renderPieChart(items, options = {}) {
  const width = options.width || 520;
  const height = options.height || 360;
  const png = createCanvas(width, height);
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const radius = Math.min(width, height) * 0.38;
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (total <= 0) {
    fillCircle(png, cx, cy, radius, GRID);
    fillCircle(png, cx, cy, radius * 0.48, WHITE);
    return toBuffer(png);
  }

  const segments = [];
  let start = -Math.PI / 2;
  items.forEach((item, index) => {
    const angle = ((Number(item.value) || 0) / total) * Math.PI * 2;
    segments.push({
      start,
      end: start + angle,
      color: item.color || COLORS[index % COLORS.length],
    });
    start += angle;
  });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius || distance < radius * 0.48) continue;
      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += Math.PI * 2;
      const segment = segments.find((item) => angle >= item.start && angle < item.end) || segments[segments.length - 1];
      setPixel(png, x, y, segment.color);
    }
  }

  return toBuffer(png);
}

module.exports = {
  COLORS,
  renderBarChart,
  renderLineChart,
  renderPieChart,
};
