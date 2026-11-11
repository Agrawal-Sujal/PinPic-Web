import exifr from 'exifr';

const EXIF_PICK_TAGS = [
  'GPSLatitude',
  'GPSLatitudeRef',
  'GPSLongitude',
  'GPSLongitudeRef',
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
];

const isValidCoordinatePair = (lat, lon) =>
  typeof lat === 'number' &&
  typeof lon === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  lat >= -90 &&
  lat <= 90 &&
  lon >= -180 &&
  lon <= 180;

const normalizeRef = (ref) => {
  if (typeof ref !== 'string') return '';
  return ref.replace(/\0/g, '').trim().toUpperCase();
};

const applyRefSign = (value, ref, negativeLetter) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const r = normalizeRef(ref);
  if (r.startsWith(negativeLetter)) {
    return -Math.abs(value);
  }
  if (r === 'N' || r === 'E' || r.startsWith('NORTH') || r.startsWith('EAST')) {
    return Math.abs(value);
  }
  return value;
};

/**
 * Parse a GPS value that may be:
 * - a number (decimal degrees)
 * - a 1/2/3-element DMS array ([deg], [deg, min], [deg, min, sec])
 * - an XMP/ExifTool string (e.g. "19,4.56N", "19,4,33.6S", "19 deg 4' 33.6\" N", "-19.076")
 */
export const parseGpsValue = (rawValue, refValue, axis) => {
  const negativeLetter = axis === 'lat' ? 'S' : 'W';
  const maxAbs = axis === 'lat' ? 90 : 180;

  if (typeof rawValue === 'number') {
    const signed = applyRefSign(rawValue, refValue, negativeLetter);
    return signed !== null && Math.abs(signed) <= maxAbs ? signed : null;
  }

  if (Array.isArray(rawValue) || ArrayBuffer.isView(rawValue)) {
    const arr = Array.from(rawValue).map(Number);
    if (arr.length === 0 || arr.some((n) => !Number.isFinite(n))) return null;
    const deg = arr[0] || 0;
    const min = arr[1] || 0;
    const sec = arr[2] || 0;
    const sign = deg < 0 ? -1 : 1;
    const dd = sign * (Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600);
    const signed = applyRefSign(dd, refValue, negativeLetter);
    return signed !== null && Math.abs(signed) <= maxAbs ? signed : null;
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.replace(/\0/g, '').trim();
    if (!trimmed) return null;

    // Extract trailing hemisphere letter if embedded (e.g. "19,4.56N" or "19 4 33.6 S")
    const dirMatch = trimmed.match(/([NSEW])\s*$/i);
    const effectiveRef = dirMatch ? dirMatch[1].toUpperCase() : refValue;
    const withoutDir = dirMatch ? trimmed.slice(0, dirMatch.index).trim() : trimmed;

    // Plain decimal number
    if (/^[+-]?\d+(\.\d+)?$/.test(withoutDir)) {
      const num = Number(withoutDir);
      const signed = applyRefSign(num, effectiveRef, negativeLetter);
      return signed !== null && Math.abs(signed) <= maxAbs ? signed : null;
    }

    // Comma or DMS separated numbers: "19,4.56" or "19,4,33.6" or "19 deg 4' 33.6\""
    const parts = withoutDir.match(/[+-]?\d+(?:\.\d+)?/g);
    if (parts && parts.length >= 1 && parts.length <= 3) {
      const nums = parts.map(Number);
      if (nums.some((n) => !Number.isFinite(n))) return null;
      const deg = nums[0] || 0;
      const min = nums[1] || 0;
      const sec = nums[2] || 0;
      const sign = deg < 0 ? -1 : 1;
      const dd = sign * (Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600);
      const signed = applyRefSign(dd, effectiveRef, negativeLetter);
      return signed !== null && Math.abs(signed) <= maxAbs ? signed : null;
    }
  }

  return null;
};

const isValidExifDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime()) && date.getFullYear() > 1900;

const parseExifDate = (rawDate) => {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    return isValidExifDate(rawDate) ? rawDate : null;
  }
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.replace(/\0/g, '').trim();
    if (!trimmed || /^0{4}[:\-]0{2}[:\-]0{2}/.test(trimmed)) return null;
    // Normalize EXIF "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
    const normalized = trimmed.replace(/^(\d{4}):(\d{2}):(\d{2})(?:\s+|T)?/, '$1-$2-$3T');
    const parsed = new Date(normalized);
    if (isValidExifDate(parsed)) return parsed;
    const fallback = new Date(trimmed);
    return isValidExifDate(fallback) ? fallback : null;
  }
  return null;
};

const extractCoordsAndDateFromParsed = (parsed) => {
  if (!parsed || typeof parsed !== 'object') {
    return { latitude: null, longitude: null, dateObject: null };
  }

  let lat = null;
  let lon = null;

  if (typeof parsed.latitude === 'number' && Number.isFinite(parsed.latitude)) {
    lat = applyRefSign(parsed.latitude, parsed.GPSLatitudeRef, 'S');
  }
  if (typeof parsed.longitude === 'number' && Number.isFinite(parsed.longitude)) {
    lon = applyRefSign(parsed.longitude, parsed.GPSLongitudeRef, 'W');
  }

  if (lat === null && parsed.GPSLatitude !== undefined) {
    lat = parseGpsValue(parsed.GPSLatitude, parsed.GPSLatitudeRef, 'lat');
  }
  if (lon === null && parsed.GPSLongitude !== undefined) {
    lon = parseGpsValue(parsed.GPSLongitude, parsed.GPSLongitudeRef, 'lon');
  }

  if (!isValidCoordinatePair(lat, lon)) {
    lat = null;
    lon = null;
  }

  const rawDate = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate;
  const dateObject = parseExifDate(rawDate);

  return { latitude: lat, longitude: lon, dateObject };
};

const extractXmpXmlTag = (xmlText, tagNames) => {
  for (const tag of tagNames) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const attrMatch = xmlText.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (attrMatch?.[1]) return attrMatch[1];
    const elemMatch = xmlText.match(new RegExp(`<${escaped}[^>]*>([^<]+)</${escaped}>`, 'i'));
    if (elemMatch?.[1]) return elemMatch[1];
  }
  return null;
};

const extractFromWebP = async (input) => {
  try {
    let buffer;
    if (input instanceof ArrayBuffer) {
      buffer = input;
    } else if (ArrayBuffer.isView(input)) {
      buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    } else if (typeof input?.arrayBuffer === 'function') {
      buffer = await input.arrayBuffer();
    } else {
      return null;
    }

    if (buffer.byteLength < 12) return null;
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webpSig = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (header !== 'RIFF' || webpSig !== 'WEBP') return null;

    let offset = 12;
    let bestResult = { latitude: null, longitude: null, dateObject: null };

    while (offset + 8 <= bytes.length) {
      const fourcc = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      const chunkSize = view.getUint32(offset + 4, true);
      const dataStart = offset + 8;
      const dataEnd = Math.min(dataStart + chunkSize, bytes.length);

      if (fourcc === 'EXIF' && dataEnd > dataStart) {
        let exifBytes = bytes.subarray(dataStart, dataEnd);
        if (
          exifBytes.length >= 6 &&
          exifBytes[0] === 0x45 &&
          exifBytes[1] === 0x78 &&
          exifBytes[2] === 0x69 &&
          exifBytes[3] === 0x66 &&
          exifBytes[4] === 0x00 &&
          exifBytes[5] === 0x00
        ) {
          exifBytes = exifBytes.subarray(6);
        }
        const parsed = await exifr.parse(exifBytes, EXIF_PICK_TAGS).catch(() => null);
        const extracted = extractCoordsAndDateFromParsed(parsed);
        if (extracted.latitude !== null && extracted.longitude !== null) {
          bestResult.latitude = extracted.latitude;
          bestResult.longitude = extracted.longitude;
        }
        if (extracted.dateObject && !bestResult.dateObject) {
          bestResult.dateObject = extracted.dateObject;
        }
      } else if (fourcc === 'XMP ' && dataEnd > dataStart) {
        const xmlText = new TextDecoder('utf-8').decode(bytes.subarray(dataStart, dataEnd));
        if (bestResult.latitude === null || bestResult.longitude === null) {
          const rawLat = extractXmpXmlTag(xmlText, ['exif:GPSLatitude', 'GPSLatitude']);
          const rawLon = extractXmpXmlTag(xmlText, ['exif:GPSLongitude', 'GPSLongitude']);
          const latRef = extractXmpXmlTag(xmlText, ['exif:GPSLatitudeRef', 'GPSLatitudeRef']);
          const lonRef = extractXmpXmlTag(xmlText, ['exif:GPSLongitudeRef', 'GPSLongitudeRef']);
          const lat = parseGpsValue(rawLat, latRef, 'lat');
          const lon = parseGpsValue(rawLon, lonRef, 'lon');
          if (isValidCoordinatePair(lat, lon)) {
            bestResult.latitude = lat;
            bestResult.longitude = lon;
          }
        }
        if (!bestResult.dateObject) {
          const rawDate = extractXmpXmlTag(xmlText, [
            'exif:DateTimeOriginal',
            'xmp:CreateDate',
            'photoshop:DateCreated',
          ]);
          bestResult.dateObject = parseExifDate(rawDate);
        }
      }

      // RIFF chunks are padded to an even byte boundary
      offset = dataStart + chunkSize + (chunkSize & 1);
    }

    return bestResult;
  } catch {
    return null;
  }
};

/**
 * Extract GPS coordinates and capture timestamp from an image File/Blob/Buffer.
 * Uses real EXIF TIFF tags ('GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef')
 * so exifr enables the GPS IFD, with fallbacks for unchunked/XMP and WebP RIFF EXIF chunks.
 */
export const extractPhotoMetadata = async (file) => {
  let latitude = null;
  let longitude = null;
  let dateObject = null;

  if (!file) {
    return { latitude, longitude, takenAt: null, dateObject };
  }

  const isLikelyWebp =
    file?.type === 'image/webp' ||
    (typeof file?.name === 'string' && /\.webp$/i.test(file.name)) ||
    file instanceof Uint8Array ||
    file instanceof ArrayBuffer;

  // Check RIFF/WEBP containers first so WebP metadata is parsed without exifr throwing on the RIFF wrapper
  if (isLikelyWebp) {
    const webpResult = await extractFromWebP(file);
    if (webpResult) {
      if (webpResult.latitude !== null && webpResult.longitude !== null) {
        latitude = webpResult.latitude;
        longitude = webpResult.longitude;
      }
      if (webpResult.dateObject) {
        dateObject = webpResult.dateObject;
      }
      return {
        latitude,
        longitude,
        takenAt: dateObject ? dateObject.toISOString() : null,
        dateObject,
      };
    }
  }

  // 1. Fast chunked parse with explicit EXIF GPS + Date tags
  try {
    const parsed = await exifr.parse(file, EXIF_PICK_TAGS);
    const extracted = extractCoordsAndDateFromParsed(parsed);
    latitude = extracted.latitude;
    longitude = extracted.longitude;
    dateObject = extracted.dateObject;
  } catch (err) {
    console.warn('[exifMetadata] Primary EXIF parse skipped:', err);
  }

  // 2. Fallback: full unchunked TIFF + XMP parse if GPS is still missing (e.g., large headers or XMP GPS)
  if (latitude === null || longitude === null) {
    try {
      const fullParsed = await exifr.parse(file, {
        chunked: false,
        tiff: true,
        xmp: true,
      });
      const extracted = extractCoordsAndDateFromParsed(fullParsed);
      if (extracted.latitude !== null && extracted.longitude !== null) {
        latitude = extracted.latitude;
        longitude = extracted.longitude;
      }
      if (!dateObject && extracted.dateObject) {
        dateObject = extracted.dateObject;
      }
    } catch {
      // Ignore fallback error for unsupported containers
    }
  }

  // 3. Fallback: direct exifr.gps() if still missing
  if (latitude === null || longitude === null) {
    try {
      const gps = await exifr.gps(file);
      if (gps && isValidCoordinatePair(gps.latitude, gps.longitude)) {
        latitude = gps.latitude;
        longitude = gps.longitude;
      }
    } catch {
      // Ignore
    }
  }

  return {
    latitude,
    longitude,
    takenAt: dateObject ? dateObject.toISOString() : null,
    dateObject,
  };
};

export default extractPhotoMetadata;
