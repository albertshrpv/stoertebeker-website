import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input and output SVG paths
const svgPath = path.join(__dirname, 'public', 'seats_base_final.svg');
const outputPath = path.join(__dirname, 'public', 'seats.svg');

const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract bounding box from SVG path data (handles both absolute and relative commands)
function extractBoundsFromPath(pathData) {
  const commands = pathData.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];

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
      case 'm': // Move to (relative)
        if (coords.length >= 2) {
          currentX += coords[0];
          currentY += coords[1];
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
      case 'l': // Line to (relative)
        if (coords.length >= 2) {
          currentX += coords[0];
          currentY += coords[1];
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
      case 'h': // Horizontal line (relative)
        if (coords.length >= 1) {
          currentX += coords[0];
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
      case 'v': // Vertical line (relative)
        if (coords.length >= 1) {
          currentY += coords[0];
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
      case 'c': // Cubic Bezier curve (relative)
        if (coords.length >= 6) {
          for (let i = 0; i < coords.length; i += 6) {
            if (i + 5 < coords.length) {
              // Add relative coordinates to current position to get absolute positions
              const x1 = currentX + coords[i];
              const y1 = currentY + coords[i + 1];
              const x2 = currentX + coords[i + 2];
              const y2 = currentY + coords[i + 3];
              const x3 = currentX + coords[i + 4];
              const y3 = currentY + coords[i + 5];
              
              minX = Math.min(minX, x1, x2, x3);
              maxX = Math.max(maxX, x1, x2, x3);
              minY = Math.min(minY, y1, y2, y3);
              maxY = Math.max(maxY, y1, y2, y3);
              
              currentX = x3;
              currentY = y3;
            }
          }
        }
        break;
      case 'Z':
      case 'z':
        break;
      default:
        // Handle other commands as best effort
        const isRelative = type === type.toLowerCase();
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            let x = coords[i];
            let y = coords[i + 1];
            
            if (isRelative) {
              x += currentX;
              y += currentY;
            }
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        if (coords.length >= 2) {
          if (isRelative) {
            currentX += coords[coords.length - 2];
            currentY += coords[coords.length - 1];
          } else {
            currentX = coords[coords.length - 2];
            currentY = coords[coords.length - 1];
          }
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

function getFillColor(attrsStr) {
  // Check for style="fill:#color" format
  const styleAttr = getAttribute(attrsStr, 'style');
  if (styleAttr) {
    const fillMatch = styleAttr.match(/fill:\s*#([0-9a-fA-F]{6})/);
    if (fillMatch) {
      return fillMatch[1].toLowerCase();
    }
  }
  
  // Check for direct fill="#color" attribute
  const fillAttr = getAttribute(attrsStr, 'fill');
  if (fillAttr && fillAttr.startsWith('#')) {
    return fillAttr.slice(1).toLowerCase();
  }
  
  return null;
}

function removeAttribute(attrsStr, name) {
  const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'gi');
  return attrsStr.replace(re, '');
}

function removeFillFromStyle(attrsStr) {
  const styleAttr = getAttribute(attrsStr, 'style');
  if (styleAttr) {
    const newStyle = styleAttr.replace(/fill:\s*#[0-9a-fA-F]{6};?/g, '').replace(/;+/g, ';').replace(/^;|;$/g, '');
    if (newStyle) {
      return attrsStr.replace(/style\s*=\s*("[^"]*"|'[^']*')/gi, `style="${newStyle}"`);
    } else {
      return removeAttribute(attrsStr, 'style');
    }
  }
  return attrsStr;
}

function pad4(n) {
  const s = String(n);
  return s.length >= 4 ? s : s.padStart(4, '0');
}

// Function to determine which row a wheelchair seat belongs to based on normal seat rows
function findRowForWheelchairSeat(wheelchairSeat, normalSeatMeta, rowTolerance = 10) {
  if (normalSeatMeta.length === 0) return 1;
  
  // Find the closest normal seat row by Y position
  let closestRow = 1;
  let minDistance = Infinity;
  
  // Get unique rows and their Y positions
  const rowYPositions = new Map();
  normalSeatMeta.forEach(seat => {
    if (!rowYPositions.has(seat.seatRow)) {
      rowYPositions.set(seat.seatRow, seat.ref.cy);
    }
  });
  
  rowYPositions.forEach((rowY, rowNumber) => {
    const distance = Math.abs(wheelchairSeat.cy - rowY);
    if (distance < minDistance) {
      minDistance = distance;
      closestRow = rowNumber;
    }
  });
  
  return closestRow;
}

// Function to find the closest normal seat to a wheelchair seat
function findClosestNormalSeat(wheelchairSeat, normalSeatMeta) {
  if (normalSeatMeta.length === 0) return null;
  
  let closestSeat = null;
  let minDistance = Infinity;
  
  normalSeatMeta.forEach(normalSeat => {
    const distance = Math.sqrt(
      Math.pow(wheelchairSeat.cx - normalSeat.ref.cx, 2) + 
      Math.pow(wheelchairSeat.cy - normalSeat.ref.cy, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestSeat = normalSeat;
    }
  });
  
  return closestSeat;
}

// Collect all <path ...> and <rect ...> elements with their geometry
const pathRegex = /<(path|rect)\b[^>]*?>/g;
const allElements = [];
let m;
while ((m = pathRegex.exec(svgContent)) !== null) {
  const elementType = m[1];
  const fullTag = m[0];
  const index = m.index;
  const endIndex = index + fullTag.length;
  const selfClosing = fullTag.endsWith('/>');
  const attrsStr = fullTag
    .replace(new RegExp(`^<${elementType}\\b`, 'i'), '')
    .replace(/\/?>(\s*)$/, '')
    .trim();

  const fillColor = getFillColor(attrsStr);
  let bounds, cx, cy;
  
  if (elementType === 'path') {
    const d = getAttribute(attrsStr, 'd');
    bounds = extractBoundsFromPath(d || '');
  } else if (elementType === 'rect') {
    const x = parseFloat(getAttribute(attrsStr, 'x') || '0');
    const y = parseFloat(getAttribute(attrsStr, 'y') || '0');
    const width = parseFloat(getAttribute(attrsStr, 'width') || '10');
    const height = parseFloat(getAttribute(attrsStr, 'height') || '10');
    bounds = { minX: x, minY: y, maxX: x + width, maxY: y + height };
  }
  
  cx = (bounds.minX + bounds.maxX) / 2;
  cy = (bounds.minY + bounds.maxY) / 2;

  allElements.push({ 
    index, 
    endIndex, 
    fullTag, 
    attrsStr, 
    selfClosing, 
    elementType,
    fillColor, 
    bounds, 
    cx, 
    cy 
  });
}

if (allElements.length === 0) {
  console.warn('No elements found.');
  process.exit(0);
}

// Separate elements by type based on fill color
const normalSeats = [];
const wheelchairSeats = [];
const wheelchairSideSeats = [];
const wheelchairAccompanimentSeats = [];
const legendElements = [];

allElements.forEach(element => {
  const fillColor = element.fillColor;
  
  // Check if it's a legend element
  if (fillColor === 'ffff00' || fillColor === '00ffff') {
    legendElements.push(element);
  }
  // Check seat types based on fill color
  else if (fillColor === 'aa0000') {
    wheelchairSeats.push(element);
  } else if (fillColor === '00ff00') {
    wheelchairSideSeats.push(element);
  } else if (fillColor === '0000ff') {
    wheelchairAccompanimentSeats.push(element);
  } else {
    // Normal seats (no specific fill color or different color)
    normalSeats.push(element);
  }
});

// Sort normal seats: Y ascending (top to bottom), then X descending (right to left)
const normalSeatsSorted = normalSeats.sort((a, b) => {
  if (Math.abs(a.cy - b.cy) > 5) {
    return a.cy - b.cy; // top to bottom
  }
  return b.cx - a.cx; // right to left within row
});

// Process normal seats with row logic (exactly like original)
const rowTolerance = 5;
let globalSeatCounter = 1;

const normalSeatMeta = [];
if (normalSeatsSorted.length > 0) {
  let currentRow = 1;
  let currentRowY = normalSeatsSorted[0].cy;
  let seatInRow = 0;

  normalSeatsSorted.forEach((seat) => {
    if (Math.abs(seat.cy - currentRowY) > rowTolerance) {
      currentRow += 1;
      currentRowY = seat.cy;
      seatInRow = 0;
    }
    seatInRow += 1;
    const seatNumber = pad4(globalSeatCounter++);
    normalSeatMeta.push({ seatNumber, seatRow: currentRow, seatRowNumber: seatInRow, ref: seat });
  });
}

// Sort wheelchair_side and wheelchair_accompaniment seats by Y position for pairing
const wheelchairSideSorted = wheelchairSideSeats.sort((a, b) => a.cy - b.cy);
const wheelchairAccompanimentSorted = wheelchairAccompanimentSeats.sort((a, b) => a.cy - b.cy);

// Process wheelchair_side and wheelchair_accompaniment seats (paired)
const wheelchairSideMeta = wheelchairSideSorted.map((seat, index) => {
  const seatNumber = pad4(globalSeatCounter++);
  return { seatNumber, seatRow: 'wheelchair_side', seatRowNumber: index + 1, ref: seat };
});

const wheelchairAccompanimentMeta = wheelchairAccompanimentSorted.map((seat, index) => {
  const seatNumber = pad4(globalSeatCounter++);
  
  // Find the corresponding wheelchair_side seat (same seat_row_number)
  const correspondingWheelchairSide = wheelchairSideMeta.find(sideSeat => 
    sideSeat.seatRowNumber === index + 1
  );
  const linkedSeatNumber = correspondingWheelchairSide ? correspondingWheelchairSide.seatNumber : null;
  
  return { seatNumber, seatRow: 'wheelchair_accompaniment', seatRowNumber: index + 1, linkedSeatNumber, ref: seat };
});

// Process regular wheelchair seats (positioned next to normal seat rows)
const wheelchairSeatsSorted = wheelchairSeats.sort((a, b) => {
  // First sort by the row they belong to, then by position within that row
  const rowA = findRowForWheelchairSeat(a, normalSeatMeta);
  const rowB = findRowForWheelchairSeat(b, normalSeatMeta);
  
  if (rowA !== rowB) {
    return rowA - rowB;
  }
  
  // Within the same row, sort by X position (right to left, like normal seats)
  return b.cx - a.cx;
});

// Group wheelchair seats by their associated row and assign seat_row_number
const wheelchairSeatMeta = [];
const wheelchairSeatsPerRow = new Map();

wheelchairSeatsSorted.forEach(seat => {
  const associatedRow = findRowForWheelchairSeat(seat, normalSeatMeta);
  
  if (!wheelchairSeatsPerRow.has(associatedRow)) {
    wheelchairSeatsPerRow.set(associatedRow, []);
  }
  wheelchairSeatsPerRow.get(associatedRow).push(seat);
});

// Process wheelchair seats with proper row numbering and linked normal seats
wheelchairSeatsPerRow.forEach((seatsInRow, rowNumber) => {
  seatsInRow.forEach((seat, indexInRow) => {
    const seatNumber = pad4(globalSeatCounter++);
    
    // Find the closest normal seat for linking
    const closestNormalSeat = findClosestNormalSeat(seat, normalSeatMeta);
    const linkedSeatNumber = closestNormalSeat ? closestNormalSeat.seatNumber : null;
    
    wheelchairSeatMeta.push({ 
      seatNumber, 
      seatRow: rowNumber, 
      seatRowNumber: indexInRow + 1, 
      linkedSeatNumber,
      ref: seat 
    });
  });
});

// Combine all seat metadata
const seatMetaBySortedIndex = [...normalSeatMeta, ...wheelchairSeatMeta, ...wheelchairSideMeta, ...wheelchairAccompanimentMeta];

// Map back to original order for deterministic replacement
const metaByOriginalIndex = new Map();
seatMetaBySortedIndex.forEach(meta => {
  metaByOriginalIndex.set(meta.ref.index, meta);
});

// Build new SVG content by replacing each element
let newSvg = '';
let cursor = 0;

// Sort by original position for reconstruction
const byOriginalPosition = [...allElements].sort((a, b) => a.index - b.index);

byOriginalPosition.forEach(node => {
  const meta = metaByOriginalIndex.get(node.index);
  
  // Handle seats
  if (meta) {
    // Remove conflicting attributes and inject new ones
    let attrs = node.attrsStr;
    attrs = removeAttribute(attrs, 'id');
    attrs = removeAttribute(attrs, 'seat_number');
    attrs = removeAttribute(attrs, 'seat_row');
    attrs = removeAttribute(attrs, 'seat_row_number');
    attrs = removeAttribute(attrs, 'type');
    
    // Remove fill from seats (both style and direct attribute)
    attrs = removeFillFromStyle(attrs);
    attrs = removeAttribute(attrs, 'fill');
    attrs = attrs.trim();

    // Determine seat type based on fill color
    let seatType;
    if (node.fillColor === 'aa0000') {
      seatType = 'wheelchair';
    } else if (node.fillColor === '00ff00') {
      seatType = 'wheelchair_side';
    } else if (node.fillColor === '0000ff') {
      seatType = 'wheelchair_accompaniment';
    } else {
      seatType = 'normal';
    }

    let injected = ` id="${meta.seatNumber}" seat_number="${meta.seatNumber}" seat_row="${meta.seatRow}" seat_row_number="${meta.seatRowNumber}" type="${seatType}"`;
    
    // Add linked_seat_number for wheelchair seats that have a linked normal seat
    if (meta.linkedSeatNumber) {
      injected += ` linked_seat_number="${meta.linkedSeatNumber}"`;
    }
    
    const newTag = `<${node.elementType}${injected}${attrs ? ' ' + attrs : ''}${node.selfClosing ? '/>' : '>'}`;

    newSvg += svgContent.slice(cursor, node.index) + newTag;
    cursor = node.endIndex;
  }
  // Handle legend elements
  else if (legendElements.includes(node)) {
    let attrs = node.attrsStr;
    attrs = removeAttribute(attrs, 'id');
    attrs = removeAttribute(attrs, 'seat_number');
    attrs = removeAttribute(attrs, 'seat_row');
    attrs = removeAttribute(attrs, 'seat_row_number');
    attrs = removeAttribute(attrs, 'type');
    
    // For legend rect elements: remove fill
    if (node.elementType === 'rect' && node.fillColor === '00ffff') {
      attrs = removeFillFromStyle(attrs);
      attrs = removeAttribute(attrs, 'fill');
    }
    // For legend path elements: convert style fill to direct fill="black"
    else if (node.elementType === 'path' && node.fillColor === 'ffff00') {
      attrs = removeFillFromStyle(attrs);
      attrs = removeAttribute(attrs, 'fill');
      attrs = 'fill="black"' + (attrs ? ' ' + attrs : '');
    }
    
    attrs = attrs.trim();
    const injected = ` type="legend"`;
    const newTag = `<${node.elementType}${injected}${attrs ? ' ' + attrs : ''}${node.selfClosing ? '/>' : '>'}`;

    newSvg += svgContent.slice(cursor, node.index) + newTag;
    cursor = node.endIndex;
  }
  // Handle other elements (keep as is)
  else {
    newSvg += svgContent.slice(cursor, node.endIndex);
    cursor = node.endIndex;
  }
});

newSvg += svgContent.slice(cursor);

fs.writeFileSync(outputPath, newSvg, 'utf8');

// Stats
const totalSeats = normalSeats.length + wheelchairSeats.length + wheelchairSideSeats.length + wheelchairAccompanimentSeats.length;
const normalRows = normalSeatMeta.length > 0 ? Math.max(...normalSeatMeta.map(m => m.seatRow)) : 0;
const wheelchairSeatsCount = wheelchairSeatMeta.length;
const wheelchairSideSeatsCount = wheelchairSideMeta.length;
const wheelchairAccompanimentSeatsCount = wheelchairAccompanimentMeta.length;
const legendElementsCount = legendElements.length;

console.log(`Processed ${totalSeats} seats total:`);
console.log(`  - ${normalSeats.length} normal seats across ${normalRows} rows`);
console.log(`  - ${wheelchairSeatsCount} wheelchair seats (positioned by rows, with linked normal seats)`);
console.log(`  - ${wheelchairSideSeatsCount} wheelchair_side seats (paired)`);
console.log(`  - ${wheelchairAccompanimentSeatsCount} wheelchair_accompaniment seats (paired)`);
console.log(`  - ${legendElementsCount} legend elements`);

// Count how many seats have linked seats
const linkedWheelchairSeats = wheelchairSeatMeta.filter(seat => seat.linkedSeatNumber).length;
const linkedAccompanimentSeats = wheelchairAccompanimentMeta.filter(seat => seat.linkedSeatNumber).length;
console.log(`  - ${linkedWheelchairSeats} wheelchair seats have linked normal seats`);
console.log(`  - ${linkedAccompanimentSeats} wheelchair_accompaniment seats have linked wheelchair_side seats`);

console.log(`Output: ${path.basename(outputPath)}`);