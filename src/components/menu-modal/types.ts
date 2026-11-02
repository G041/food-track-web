export type MenuFrameProps = {
  src: string;
  /** Aislar el sitio embebido (no puede navegar la app ni abrir diálogos en ella). */
  sandboxed: boolean;
  onLoad: () => void;
  /** Scroll vertical y escala de zoom del menú. Solo nativo: en web el iframe de otro sitio no los informa. */
  onScrollY?: (y: number, zoomScale?: number) => void;
};
