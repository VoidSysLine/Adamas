import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { MAX_BASE64_LENGTH } from '@/lib/attachments';

export type ImageSource = 'camera' | 'library';

export interface PickedImage {
  base64: string;
  mime: string;
}

/**
 * Picks an image (camera or gallery), downscales it to `maxSize` px and
 * recompresses to JPEG — which also strips EXIF/GPS metadata. Returns null on
 * cancel, denied permission, or when the result exceeds the size ceiling.
 * `maxSize` defaults to 1600 (documents); pass a smaller value for avatars.
 */
export async function pickAndCompressImage(
  source: ImageSource,
  maxSize = 1600,
): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: 1,
    allowsEditing: maxSize <= 512, // square-crop avatars
    aspect: maxSize <= 512 ? [1, 1] : undefined,
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const needsResize = asset.width > maxSize || asset.height > maxSize;
  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    needsResize ? [{ resize: { width: maxSize } }] : [],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!processed.base64 || processed.base64.length > MAX_BASE64_LENGTH) return null;
  return { base64: processed.base64, mime: 'image/jpeg' };
}
