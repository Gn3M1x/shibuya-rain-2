import { Atmosphere } from './Atmosphere'
import { Buildings } from './Buildings'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { Performance } from './Performance'
import { Rain } from './Rain'
import { Store } from './Store'
import { StreetProps } from './StreetProps'
import { WetGround } from './WetGround'

/** Assembly order matters: opaque city first, rain and reflection planes later. */
export function Scene() {
  return (
    <>
      <Atmosphere />
      <Lighting />
      <Buildings />
      <Store />
      <StreetProps />
      <WetGround />
      <Rain />
      <CameraRig />
      <Performance />
      <Effects />
    </>
  )
}
