import fs from 'fs';
import ExifParser from 'exif-parser';

/**
 * Safely extracts EXIF GPS coordinates from an uploaded image file on disk.
 * Returns { latitude, longitude, timestamp } or null if not present/parseable.
 */
export function extractExifGps(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    // Only JPEG files have standard EXIF headers that exif-parser expects
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    if (result && result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
      return {
        latitude: result.tags.GPSLatitude,
        longitude: result.tags.GPSLongitude,
        timestamp: result.tags.DateTimeOriginal
          ? new Date(result.tags.DateTimeOriginal * 1000)
          : null,
      };
    }

    return null;
  } catch (error) {
    // If not JPEG or EXIF corrupt, return null gracefully without crashing
    return null;
  }
}
