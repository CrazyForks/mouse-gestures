import { useState } from "react"

import { useStorage } from "@plasmohq/storage/dist/hook"

import { Config } from "~config/config"
import type { ConfigGesture } from "~config/config-interface"
import type { Group } from "~enum/command"
import CommandDrawer from "~options/components/command-drawer"
import GestureDrawing from "~options/components/gesture-drawing"
import { i18n } from "~utils/common"

export interface GestureManagementProps {
  title: string
  commandGroup: Group
  createBtnText: string
  createTitle: string
  editTitle: string
}

const modalId: string = "drawing-modal"
const drawerId: string = "command-drawer"

export default (props: GestureManagementProps) => {
  const [configGesture, setConfigGesture] = useState<ConfigGesture | null>(null)
  const [config] = useStorage(Config.key, Config.default)
  return (
    <div>
      <div className="navbar bg-base-100">
        <span className="text-2xl">{i18n(props.title)}</span>
      </div>
      <div className="divider mt-0"></div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,_minmax(150px,_1fr))]">
        <label
          htmlFor={modalId}
          className="aspect-w-3 aspect-h-4 border-2 border-dashed hover:border-success text-base-300 hover:text-success cursor-pointer">
          <div className="flex items-center justify-center h-full text-xl select-none">
            {i18n(props.createTitle)}
          </div>
        </label>
        {config?.gesture?.map((gesture: ConfigGesture) => {
          return (
            <div
              key={gesture.uniqueKey}
              className="aspect-w-3 aspect-h-4 border">
              02
            </div>
          )
        })}
      </div>
      <GestureDrawing
        modalId={modalId}
        drawerId={drawerId}
        title={props.createTitle}
        configGesture={configGesture}
        setConfigGesture={setConfigGesture}
      />
      <CommandDrawer
        drawerId={drawerId}
        commandGroup={props.commandGroup}
        configGesture={configGesture}
        setConfigGesture={setConfigGesture}
      />
    </div>
  )
}