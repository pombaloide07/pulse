interface IconProps {
  size?: number;
  stroke?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IconPulse({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M2.5 12h4l2.2-5.5 3.6 11 2.7-7.5 1.8 2h4.7" />
    </svg>
  );
}

export function IconGroup({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M16.5 14.6c2.2.3 3.6 1.8 4 4" />
    </svg>
  );
}

export function IconCheck({ size = 22, stroke = 2.4 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function IconPlus({ size = 22, stroke = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, stroke = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M9 5.5l6.5 6.5L9 18.5" />
    </svg>
  );
}

export function IconBack({ size = 22, stroke = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M15 5.5L8.5 12l6.5 6.5" />
    </svg>
  );
}

export function IconUp({ size = 16, stroke = 2.4 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" />
    </svg>
  );
}

export function IconMinus({ size = 20, stroke = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M6 12h12" />
    </svg>
  );
}

export function IconX({ size = 20, stroke = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconTrash({ size = 20, stroke = 1.9 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5l.8 13h9.4l.8-13M10 10v6M14 10v6" />
    </svg>
  );
}

export function IconDiet({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M4 12.5h16a8 8 0 0 1-16 0z" />
      <path d="M9 8.5c0-1.4 1-1.6 1-3M14 8.5c0-1.4 1-1.6 1-3" />
    </svg>
  );
}

export function IconBody({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M5.5 20c.7-4.5 3.2-7 6.5-7s5.8 2.5 6.5 7" />
    </svg>
  );
}

export function IconBarbell({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M2.5 12h3M18.5 12h3M8.5 12h7" />
      <rect x="5.5" y="7.5" width="3" height="9" rx="1.2" />
      <rect x="15.5" y="7.5" width="3" height="9" rx="1.2" />
    </svg>
  );
}

export function IconBell({ size = 22, stroke = 2 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconGear({ size = 22, stroke = 1.9 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}

export function IconMedal({ size = 20, stroke = 1.9 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={stroke}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.6 13.5L7 20l5-2.4L17 20l-1.6-6.5" />
    </svg>
  );
}
