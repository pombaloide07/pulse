import { type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza filhos direto no <body>, fora de qualquer `.screen`.
 * Os sheets são `position: fixed`, mas as telas têm animação com `transform`
 * — e um transform em ancestral quebra o fixed (ancora no elemento, não na
 * viewport). O portal os desacopla.
 *
 * O container é único e criado JÁ ANEXADO ao body (não via useEffect): assim os
 * filhos renderizam dentro de um nó que já está no documento, e a animação de
 * entrada (`sheet-up`) roda desde o começo em vez de travar num nó desanexado.
 */
let root: HTMLElement | null = null;

function portalRoot(): HTMLElement {
  if (!root || !root.isConnected) {
    root = document.createElement("div");
    root.className = "portal-root";
    document.body.appendChild(root);
  }
  return root;
}

export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, portalRoot());
}
