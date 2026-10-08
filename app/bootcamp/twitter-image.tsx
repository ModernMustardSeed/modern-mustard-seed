import OpengraphImage, { alt as ogAlt, size as ogSize, contentType as ogType } from './opengraph-image';

/** The same card for X. Next needs these three exports named here, not re-exported. */
export const runtime = 'nodejs';
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogType;

export default function TwitterImage() {
  return OpengraphImage();
}
