"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "duration-200 motion-reduce:!animate-none motion-reduce:!transition-none",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { largura?: "curta" | "media" | "larga" }
>(({ className, children, largura = "media", ...props }, ref) => (
  <DialogPortal>
    {/* Backdrop */}
    <DialogOverlay />
    {/* Centering wrapper: fixed inset-0 flex — sem translate no content, robusto no mobile */}
    <div className="fixed inset-0 z-50 flex h-[100dvh] items-end sm:items-center justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "relative pointer-events-auto",
          // Largura por conteudo, nao uma so para tudo: confirmacao curta
          // continua estreita (`largura="curta"`), formulario longo ganha
          // espaco no desktop para os campos irem em duas colunas em vez de
          // virar uma tira vertical com rolagem.
          "w-full",
          largura === "larga"
            ? "max-w-[min(calc(100vw-32px),760px)]"
            : largura === "curta"
              ? "max-w-[min(calc(100vw-32px),420px)]"
              : "max-w-[min(calc(100vw-32px),560px)]",
          // 20px: raio de cartao grande. 28px lia como bolha.
          "border border-pauta bg-[var(--papel-solido)] rounded-[20px] shadow-alta",
          "max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "duration-200 motion-reduce:!animate-none motion-reduce:!transition-none",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-2.5 top-2.5 z-10 grid place-items-center size-11 sm:size-8 rounded-full bg-foreground/[0.08] text-muted-fg opacity-80 hover:opacity-100 hover:bg-foreground/[0.14] transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acao">
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-pauta", className, "pr-16 sm:pr-16")} {...props} />
)

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-4 py-4 sm:px-6", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-4 py-3 sm:px-6 sm:py-4 border-t border-pauta mt-auto", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-[17px] font-semibold tracking-tight text-foreground leading-snug", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[13px] text-muted-fg leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogTitle, DialogDescription, DialogClose,
}