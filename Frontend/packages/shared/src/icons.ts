/**
 * Names of the app's icons. Each platform draws them its own way: the web
 * with small inline SVG paths, the mobile app with vector icons.
 */
export type IconName =
  | 'github'
  | 'home'
  | 'linkedin'
  | 'mail'
  | 'chat'
  | 'pin'
  | 'users'
  | 'book'
  | 'spark'
  | 'lock'
  | 'arrowRight'
  | 'arrowLeft'
  | 'globe'
  | 'phone'
  | 'clock'
  | 'menu'
  | 'close'
  | 'send'
  | 'search'
  | 'check'
  | 'alert'
  | 'info'
  | 'heart'
  | 'play'
  | 'headphones'
  | 'navigation'
  | 'shield'
  | 'refresh'
  | 'user'
  | 'flag'
  | 'eyeOff'
  | 'trash'
  | 'wifiOff'
  | 'thumbUp'
  | 'sun'
  | 'moon'
  | 'mic'
  | 'plus'
  | 'volume'
  | 'cookie'
  | 'help'
  | 'chevronRight'

/** Stroke icon paths on a 24×24 grid (round caps and joins, 1.9 stroke), used by both apps. */
export const ICON_PATHS: Record<IconName, string> = {
  home: 'M3 11l9-8 9 8 M5 9.500V21h14V9.500 M10 21v-6h4v6',
  github:
    'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.75c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
  linkedin:
    'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M6 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z M12 12.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  users:
    'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20 M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35 M15.5 4.6a3.5 3.5 0 0 1 0 6.8',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5',
  spark:
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  lock: 'M6 11h12v10H6z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5 M11 6l-6 6 6 6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  phone:
    'M21 16.5v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.5 5.2 2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.5 10.8a16 16 0 0 0 4.7 4.7l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6L6 18',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 3l10 18H2z M12 10v4.5 M12 17.5v.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.5',
  heart: 'M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9C20 15.3 12 20 12 20z',
  play: 'M7 4.5v15l12-7.5z',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 15h3v5H5a1 1 0 0 1-1-1z M20 15h-3v5h2a1 1 0 0 0 1-1z',
  navigation: 'M3 11l18-8-8 18-2-8z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  refresh: 'M20 11a8 8 0 0 0-14.8-3.5L3 10 M3 4v6h6 M4 13a8 8 0 0 0 14.8 3.5L21 14 M21 20v-6h-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  flag: 'M5 21V4 M5 4h12l-2 4 2 4H5',
  eyeOff: 'M3 3l18 18 M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.4 3 M6.6 6.6C4.2 8.2 3 12 3 12s4 6 9 6a9 9 0 0 0 4.4-1.1 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  wifiOff: 'M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 4-2.3 M19 12.5a10 10 0 0 0-2.4-1.7 M2 8.8A15 15 0 0 1 6.2 6.2 M22 8.8A15 15 0 0 0 11 5 M12 20h.01',
  thumbUp: 'M7 10v11H4V10z M7 10l4-7a2 2 0 0 1 2.5 2.5L12.5 10H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 21H7',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z M19 11a7 7 0 0 1-14 0 M12 18v3',
  plus: 'M12 5v14 M5 12h14',
  volume: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  cookie:
    'M12 3a9 9 0 1 0 9 9 3.5 3.5 0 0 1-3.5-3.5A3.5 3.5 0 0 1 14 5a2 2 0 0 1-2-2z M8.5 10h.01 M9.5 15h.01 M14.5 14.5h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.4-2.5 3.9 M12 17h.01',
  chevronRight: 'M9 6l6 6-6 6',
}
