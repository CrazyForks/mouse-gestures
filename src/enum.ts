export enum Direction {
  Up = "Up",
  Down = "Down",
  Left = "Left",
  Right = "Right",
  UpDown = Up + Down,
  UpLeft = Up + Left,
  UpRight = Up + Right,
  DownUp = Down + Up,
  DownLeft = Down + Left,
  DownRight = Down + Right,
  LeftRight = Left + Right,
  LeftUp = Left + Up,
  LeftDown = Left + Down,
  RightLeft = Right + Left,
  RightUp = Right + Up,
  RightDown = Right + Down
}

export enum Operations {
  Invalid = "invalidOperation",
  ScrollUp = "scrollUp",
  ScrollDown = "scrollDown",
  ScrollLeft = "scrollLeft",
  ScrollRight = "scrollRight",
  ScrollToTop = "scrollToTop",
  ScrollToBottom = "scrollToBottom",
  Backward = "backward",
  Forward = "forward",
  Refresh = "refresh",
  ReloadAllTabs = "reloadAllTabs",
  OpenNewTab = "openNewTab",
  CloseCurrentTab = "closeCurrentTab",
  CloseOtherTabs = "closeOtherTabs",
  CloseAllTabs = "closeAllTabs",
  CloseWindow = "closeWindow",
  ReopenLastClosedTab = "reopenLastClosedTab",
  SwitchLeftTab = "switchLeftTab",
  SwitchRightTab = "switchRightTab",
  Fullscreen = "fullscreen",
  MinimizeWindow = "minimizeWindow",
}