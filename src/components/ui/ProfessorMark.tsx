import {
  Image,
  Platform,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native'

const MASCOT = require('../../../assets/brand/profu/professor-pythagoras.png')
const AVATAR = require('../../../assets/brand/profu/professor-avatar.png')

// Android release bundles compile Metro assets into drawable resources. On the
// current native baseline, resolving these two generated images through the
// numeric `require()` id produces an empty Image even though the resources are
// present in the APK. Address the compiled drawables directly in standalone
// Android builds; development builds still load them from Metro, and iOS keeps
// the standard static-resource path.
const ANDROID_MASCOT: ImageSourcePropType = {
  uri: 'assets_brand_profu_professorpythagoras',
}
const ANDROID_AVATAR: ImageSourcePropType = {
  uri: 'assets_brand_profu_professoravatar',
}

export default function ProfessorMark({
  avatar = false,
  style,
}: {
  avatar?: boolean
  style?: StyleProp<ImageStyle>
}) {
  const source =
    Platform.OS === 'android' && !__DEV__
      ? avatar
        ? ANDROID_AVATAR
        : ANDROID_MASCOT
      : avatar
        ? AVATAR
        : MASCOT

  return (
    <Image
      accessibilityIgnoresInvertColors
      source={source}
      resizeMode="contain"
      style={style}
    />
  )
}
