import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

/** A downscaled, base64-encoded photo ready to send to the vision model. */
export type CapturedImage = { base64: string; mimeType: string; uri: string }

/**
 * Downscale + recompress before sending. Raw phone photos are multi-MB and
 * blow past the AI proxy's 1MB request cap; 1024px wide JPEG at 0.7 quality is
 * plenty for the model to read a problem and keeps us well under the limit.
 */
async function process(uri: string): Promise<CapturedImage> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  })
  return { base64: out.base64 ?? '', mimeType: 'image/jpeg', uri: out.uri }
}

/** Take a photo with the camera. Returns null if the user cancels. */
export async function captureFromCamera(): Promise<CapturedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) throw new Error('Camera access is needed to snap a problem. Enable it in Settings.')
  const res = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: true })
  if (res.canceled || !res.assets?.[0]) return null
  return process(res.assets[0].uri)
}

/** Pick an existing photo from the library. Returns null if the user cancels. */
export async function captureFromLibrary(): Promise<CapturedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    allowsEditing: true,
    mediaTypes: 'images',
  })
  if (res.canceled || !res.assets?.[0]) return null
  return process(res.assets[0].uri)
}
