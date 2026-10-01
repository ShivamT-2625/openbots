import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export const Markdown = React.memo(function Markdown({
  children,
}: {
  children: string
}) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
})
