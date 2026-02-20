import { e as createComponent, m as maybeRenderHead, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_DIFig9Wl.mjs';
import 'piccolore';
import { jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle } from 'lucide-react';
export { renderers } from '../renderers.mjs';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Card = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm",
      className
    ),
    ...props
  }
));
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    ),
    ...props
  }
));
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="min-h-screen w-full flex items-center justify-center bg-gray-50"> ${renderComponent($$result, "Card", Card, { "className": "w-full max-w-md mx-4" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "CardContent", CardContent, { "className": "pt-6" }, { "default": ($$result3) => renderTemplate` <div class="flex mb-4 gap-2"> ${renderComponent($$result3, "AlertCircle", AlertCircle, { "className": "h-8 w-8 text-red-500" })} <h1 class="text-2xl font-bold text-gray-900">404 Page Not Found</h1> </div> <p class="mt-4 text-sm text-gray-600">
Did you forget to add the page to the router?
</p> ` })} ` })} </div>`;
}, "/Users/faddah/Documents/code/code - projects/code-canvas-astro/src/pages/404.astro", void 0);

const $$file = "/Users/faddah/Documents/code/code - projects/code-canvas-astro/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
