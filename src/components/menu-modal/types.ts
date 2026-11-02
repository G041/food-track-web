export type MenuFrameProps = {
  src: string;
  /** Aislar el sitio embebido (no puede navegar la app ni abrir diálogos en ella). */
  sandboxed: boolean;
  onLoad: () => void;
  /** Posición vertical del scroll del menú. Solo nativo: en web el iframe de otro sitio no la informa. */
  onScrollY?: (y: number) => void;
};
