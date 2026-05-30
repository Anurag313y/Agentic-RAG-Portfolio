import { useEffect, useState } from "react";

const DEFAULT_OFFSET = 120;

export function useActiveSection(sectionIds: string[], offset = DEFAULT_OFFSET) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "home");

  useEffect(() => {
    const sections = sectionIds
      .map((id) => {
        const el = document.getElementById(id);
        return el ? { id, el } : null;
      })
      .filter(Boolean) as { id: string; el: HTMLElement }[];

    if (sections.length === 0) return;

    const update = () => {
      const position = window.scrollY + offset;
      let current = sections[0]!.id;

      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48;

      if (nearBottom) {
        current = sections[sections.length - 1]!.id;
      } else {
        for (const { id, el } of sections) {
          if (el.offsetTop <= position) current = id;
        }
      }

      setActiveId(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionIds, offset]);

  return activeId;
}
