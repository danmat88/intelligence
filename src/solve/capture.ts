import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

/** A downscaled, base64-encoded photo ready to send to the vision model. */
export type CapturedImage = { base64: string; mimeType: string; uri: string }

/** A raw photo (camera shot or gallery pick) before the user trims it in-app. */
export type RawShot = { uri: string; width: number; height: number }

/** A crop rectangle in original-image pixel coordinates. */
export type CropBox = { x: number; y: number; width: number; height: number }

/**
 * Downscale + recompress before sending. Raw phone photos are multi-MB and
 * blow past the AI proxy's 1MB request cap; 1024px wide JPEG at 0.7 quality is
 * plenty for the model to read a problem and keeps us well under the limit.
 */
export async function prepareImage(uri: string): Promise<CapturedImage> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  })
  return { base64: out.base64 ?? '', mimeType: 'image/jpeg', uri: out.uri }
}

/**
 * Cut the user's trim box out of the original photo, then prepare the cut for
 * upload. The box is clamped to the image bounds so a rounding overshoot from
 * the on-screen drag math can never crash the native crop.
 */
export async function cropAndPrepare(shot: RawShot, box: CropBox): Promise<CapturedImage> {
  const x = Math.min(Math.max(0, Math.round(box.x)), shot.width - 1)
  const y = Math.min(Math.max(0, Math.round(box.y)), shot.height - 1)
  const width = Math.max(1, Math.min(Math.round(box.width), shot.width - x))
  const height = Math.max(1, Math.min(Math.round(box.height), shot.height - y))
  const cut = await manipulateAsync(shot.uri, [{ crop: { originX: x, originY: y, width, height } }], {
    format: SaveFormat.JPEG,
  })
  return prepareImage(cut.uri)
}

/** Pick a photo from the library, untouched — the in-app crop stage trims it. */
export async function pickFromLibrary(): Promise<RawShot | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: 'images' })
  if (res.canceled || !res.assets?.[0]) return null
  const a = res.assets[0]
  return { uri: a.uri, width: a.width, height: a.height }
}
