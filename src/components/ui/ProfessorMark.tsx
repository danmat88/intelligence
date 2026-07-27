import { Image, type ImageStyle, type StyleProp } from 'react-native'

const MASCOT = require('../../../assets/brand/profu/professor-pythagoras.png')
const AVATAR = require('../../../assets/brand/profu/professor-avatar.png')

export default function ProfessorMark({
  avatar = false,
  style,
}: {
  avatar?: boolean
  style?: StyleProp<ImageStyle>
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={avatar ? AVATAR : MASCOT}
      resizeMode="contain"
      style={style}
    />
  )
}
