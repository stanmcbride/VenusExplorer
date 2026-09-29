# Lint scope and documented exceptions

Routine lint covers the active application, shared components, hooks and current rule tests. It does not disable accessibility or React checks globally.

## Frozen research

The explicit historical script directories and `scripts/test-card-deck.mjs` in `.oxlintrc.json` belong to completed experiments. They retain fingerprinted source and source-adapter assumptions from those runs. `playtests/**` contains captured source, raw data, reports and local staging copies. Editing these to satisfy current lint could invalidate reproducibility. They are excluded from routine application lint; they are not certified as current-app tests. New maintained tests in `scripts/rules` remain checked.

This accounts for the old unused imports, unnecessary array spread and deliberate Function-based execution of trusted local source. The original files remain unchanged.

## Component-specific exceptions

| Exact scope | Rule | Reason and responsibility |
|---|---|---|
| button-group, input-group, item, field, carousel | prefer-tag-over-role | These reusable components deliberately expose div props/refs with group, list or region semantics. Replacing them with fieldset/list/section elements can alter browser styling, ref contracts or permitted children. Roles remain present; consuming interfaces must provide appropriate names and child semantics. |
| input-otp | prefer-tag-over-role | The visual separator uses a div and icon with separator semantics; replacing it with an hr changes layout/default styling. |
| spinner | prefer-tag-over-role | The loading icon is an SVG component with status semantics and a Loading label. An output element cannot replace its SVG interface without changing the component structure. |
| input-group | click-events-have-key-events; no-noninteractive-element-interactions | Clicking the decorative addon focuses the already keyboard-accessible input. It is a pointer convenience, not an additional action; Tab reaches the real input. Adding a button role/tab stop to a container that can hold buttons would misrepresent it. |
| label | label-has-associated-control | This is a generic label wrapper forwarding htmlFor and children from its caller. The checker cannot establish associations at the wrapper declaration; callers still must associate their labels. |
| pagination | anchor-has-content | Base UI Button composes its children into the render anchor. The isolated anchor declaration is not the final empty link. Callers must supply visible text or an accessible label. |
| card-action-view | nextjs/no-img-element | Local static card PNGs use existing CSS-controlled artwork dimensions and decorative empty alt text; action rules remain visible text. Retain the existing image element/appearance rather than introduce an image-optimization dependency during lint cleanup. |

All exceptions are exact-file, exact-rule overrides. They are not evidence of a complete accessibility audit. Revisit the relevant exception when changing a component's interface or interaction.

## Fixes made

- Mobile width uses a media-query external-store subscription with a stable server snapshot.
- Carousel navigation subscribes to select and reInit, and removes both listeners on cleanup. Availability comes from a stable primitive snapshot rather than synchronous state changes in an effect.
- Chart keys use explicit String conversion, preserving existing coercion behavior.
- The current breadcrumb remains marked aria-current=page without pretending to be a disabled interactive link.

Verification: full-project lint, TypeScript, current game regression tests and production build. Game rules and CSS are unchanged by this cleanup.
