export const isMobileDevice =
  typeof navigator !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((navigator as any).userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent))
