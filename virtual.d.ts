declare module "virtual:streamline-icons/loader" {
  export interface StreamlineIconPayload {
    name: string
    style: "light" | "regular" | "bold"
    svg: string
  }

  export const selectedStyle: "light" | "regular" | "bold"
  export function listIcons(): string[]
  export function hasIcon(name: string): boolean
  export function loadIcon(name: string): Promise<StreamlineIconPayload | null>
}
