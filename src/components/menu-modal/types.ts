export type MenuFrameProps = {
  src: string;
  /** Aislar el sitio embebido (no puede navegar la app ni abrir diálogos en ella). */
  sandboxed: boolean;
  onLoad: () => void;
};
