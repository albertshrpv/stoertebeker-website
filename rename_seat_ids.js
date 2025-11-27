import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input and output SVG paths
const svgPath = path.join(__dirname, 'public', 'all_seats_base.svg');
const outputPath = path.join(__dirname, 'public', 'seats.svg');

const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract bounding box from SVG path data (aligned with SeatPlanViewer.tsx)
function extractBoundsFromPath(pathData) {
  const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/g) || [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let currentX = 0, currentY = 0;

  commands.forEach(command => {
    const type = command[0];
    const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !Number.isNaN(n));

    switch (type) {
      case 'M': // Move to (absolute)
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          minX = Math.min(minX, currentX);
          minY = Math.min(minY, currentY);
          maxX = Math.max(maxX, currentX);
          maxY = Math.max(maxY, currentY);
        }
        break;
      case 'L': // Line to (absolute)
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          minX = Math.min(minX, currentX);
          minY = Math.min(minY, currentY);
          maxX = Math.max(maxX, currentX);
          maxY = Math.max(maxY, currentY);
        }
        break;
      case 'H': // Horizontal line (absolute)
        if (coords.length >= 1) {
          currentX = coords[0];
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX);
        }
        break;
      case 'V': // Vertical line (absolute)
        if (coords.length >= 1) {
          currentY = coords[0];
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY);
        }
        break;
      case 'C': // Cubic Bezier curve (absolute)
        if (coords.length >= 6) {
          for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
              minX = Math.min(minX, coords[i]);
              maxX = Math.max(maxX, coords[i]);
              minY = Math.min(minY, coords[i + 1]);
              maxY = Math.max(maxY, coords[i + 1]);
            }
          }
          currentX = coords[coords.length - 2];
          currentY = coords[coords.length - 1];
        }
        break;
      case 'Z':
        break;
      default:
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            minX = Math.min(minX, coords[i]);
            maxX = Math.max(maxX, coords[i]);
            minY = Math.min(minY, coords[i + 1]);
            maxY = Math.max(maxY, coords[i + 1]);
          }
        }
        if (coords.length >= 2) {
          currentX = coords[coords.length - 2];
          currentY = coords[coords.length - 1];
        }
        break;
    }
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  }

  return { minX, minY, maxX, maxY };
}

function getAttribute(attrsStr, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = attrsStr.match(re);
  return m ? (m[2] ?? m[3] ?? '') : '';
}

function removeAttribute(attrsStr, name) {
  const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'gi');
  return attrsStr.replace(re, '');
}

function pad4(n) {
  const s = String(n);
  return s.length >= 4 ? s : s.padStart(4, '0');
}

// Collect all <path ...> elements with their geometry
const pathRegex = /<path\b[^>]*?>/g;
const matches = [];
let m;
while ((m = pathRegex.exec(svgContent)) !== null) {
  const fullTag = m[0];
  const index = m.index;
  const endIndex = index + fullTag.length;
  const selfClosing = fullTag.endsWith('/>');
  const attrsStr = fullTag
    .replace(/^<path\b/i, '')
    .replace(/\/?>(\s*)$/, '')
    .trim();

  const d = getAttribute(attrsStr, 'd');
  const inkscapeLabel = getAttribute(attrsStr, 'inkscape:label');
  const bounds = extractBoundsFromPath(d || '');
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  matches.push({ index, endIndex, fullTag, attrsStr, selfClosing, d, inkscapeLabel, bounds, cx, cy });
}

if (matches.length === 0) {
  console.warn('No <path> elements found.');
  process.exit(0);
}

// Sort seats: Y ascending (top to bottom), then X descending (right to left)
const seatsSorted = [...matches].sort((a, b) => {
  if (Math.abs(a.cy - b.cy) > 5) {
    return a.cy - b.cy; // top to bottom
  }
  return b.cx - a.cx; // right to left within row
});

// Assign row numbers and seat numbers within rows
const rowTolerance = 5;
let currentRow = 1;
let currentRowY = seatsSorted[0].cy;
let seatInRow = 0;

const seatMetaBySortedIndex = seatsSorted.map((seat, i) => {
  if (Math.abs(seat.cy - currentRowY) > rowTolerance) {
    currentRow += 1;
    currentRowY = seat.cy;
    seatInRow = 0;
  }
  seatInRow += 1;
  const seatNumber = pad4(i + 1);
  return { seatNumber, seatRow: currentRow, seatRowNumber: seatInRow, ref: seat };
});

// Map back to original order for deterministic replacement
const metaByOriginalIndex = new Map();
seatMetaBySortedIndex.forEach(meta => {
  metaByOriginalIndex.set(meta.ref.index, meta);
});

// Build new SVG content by replacing each <path ...>
let newSvg = '';
let cursor = 0;

// Sort by original position for reconstruction
const byOriginalPosition = [...matches].sort((a, b) => a.index - b.index);

byOriginalPosition.forEach(node => {
  const meta = metaByOriginalIndex.get(node.index);
  if (!meta) return; // Should not happen

  // Remove conflicting attributes and inject new ones
  let attrs = node.attrsStr;
  attrs = removeAttribute(attrs, 'id');
  attrs = removeAttribute(attrs, 'seat_number');
  attrs = removeAttribute(attrs, 'seat_row');
  attrs = removeAttribute(attrs, 'seat_row_number');
  attrs = removeAttribute(attrs, 'type');
  attrs = attrs.trim();

  // Determine seat type based on inkscape:label
  let seatType;
  switch (node.inkscapeLabel) {
    case 'wheelchair':
      seatType = 'wheelchair';
      break;
    case 'wheelchair_accompaniment':
      seatType = 'wheelchair_accompaniment';
      break;
    default:
      seatType = 'normal';
      break;
  }

  const injected = ` id="${meta.seatNumber}" seat_number="${meta.seatNumber}" seat_row="${meta.seatRow}" seat_row_number="${meta.seatRowNumber}" type="${seatType}"`;
  const newTag = `<path${injected}${attrs ? ' ' + attrs : ''}${node.selfClosing ? '/>' : '>'}`;

  newSvg += svgContent.slice(cursor, node.index) + newTag;
  cursor = node.endIndex;
});

newSvg += svgContent.slice(cursor);

fs.writeFileSync(outputPath, newSvg, 'utf8');

// Stats
const totalSeats = matches.length;
const totalRows = seatMetaBySortedIndex.length > 0 ? seatMetaBySortedIndex[seatMetaBySortedIndex.length - 1].seatRow : 0;
console.log(`Processed ${totalSeats} seats across ${totalRows} rows → ${path.basename(outputPath)}`);