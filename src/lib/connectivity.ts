import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

/**
 * Real connectivity, straight from the OS (NetInfo) — not guessed from failed
 * requests after the user already waited. `useOnline` is optimistic: unknown
 * states count as online (never a false "offline" alarm on flaky captive-
 * portal detection); a definite `isConnected: false` or `isInternetReachable:
 * false` flips it. The solver combines this with its request-failure signal —
 * NetInfo catches "airplane mode" instantly, the failure signal still catches
 * "internet fine but our server unreachable".
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        setOnline(!(s.isConnected === false || s.isInternetReachable === false))
      }),
    [],
  )
  return online
}
