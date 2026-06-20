# Sistema de Diseño — Estilo Distill.pub / TED

Referencia visual para presentaciones, documentos y materiales académicos.
Inspirado en la estética de Distill.pub: limpio, tipográfico, con datos como protagonistas.

---

## Principios de diseño

1. **Fondos blancos por default.** Las diapositivas oscuras (navy) se reservan para momentos de impacto narrativo — apertura, cierre, transiciones clave — no para contenido técnico denso.
2. **Las visualizaciones de datos son el foco.** Gráficas, diagramas y ecuaciones son protagonistas; el texto las acompaña, no al revés.
3. **Máximo 3 colores por diapositiva.** Evita el ruido visual; un color dominante + un acento + texto.
4. **Layouts limpios y minimalistas.** Espacio en blanco generoso, jerarquía clara, sin elementos decorativos innecesarios.
5. **Tipografía como herramienta de jerarquía**, no solo de estilo.

---

## Paleta de colores

| Color | Hex | Uso |
|---|---|---|
| Navy oscuro (fondo) | `#1B2631` | Fondo de diapositivas de impacto narrativo |
| Teal (acento principal) | `#1A8F85` | Acentos, títulos destacados, líneas de datos primarias |
| Texto primario (sobre blanco) | `#2C3E50` | Cuerpo de texto, títulos en fondo claro |
| Texto secundario/terciario | `#7F8C8D` | Captions, notas, texto de apoyo |
| Púrpura (acento secundario) | `#8E44AD` | Acento ocasional para diferenciar series de datos |
| Blanco | `#FFFFFF` | Fondo por default |

> Regla de oro: nunca más de 3 de estos colores activos en una sola diapositiva.

---

## Tipografía

| Familia | Uso |
|---|---|
| **Georgia** (serif) | Títulos y encabezados |
| **Calibri** (sans-serif) | Cuerpo de texto y contenido general |
| **Consolas** (monospace) | Código, fórmulas y ecuaciones |

### Escala tipográfica (PPTX)

| Tamaño | Uso |
|---|---|
| 42pt | Título de portada |
| 30pt | H1 — título de diapositiva |
| 24pt | H2 — subtítulo / sección |
| 14pt | Body — texto general |
| 11pt | Caption — notas al pie, fuentes |

---

## Stack técnico

- **PptxGenJS** — generación programática de las diapositivas
- **sharp** — renderizado de SVG a PNG
- **react-icons** — iconografía vectorial
- Gráficas custom en SVG (no charts genéricos de librería) para mantener control total del estilo

---

## Notas de aplicación

- Las ecuaciones multivariadas (ej. Beer-Lambert) usan rich text runs para subíndices/superíndices correctos, nunca texto plano con números pegados.
- Las gráficas espectrales distinguen especies por color + estilo de línea (sólida gruesa vs. punteada fina), no solo por color, para que la diferencia se entienda incluso en escala de grises.
- Evitar área bajo la curva (area fills) en gráficas de espectros superpuestos; usar solo líneas + anotaciones de picos.
