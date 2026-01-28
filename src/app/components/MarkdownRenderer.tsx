'use client'

import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ReactNode } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Composants personnalisés pour le rendu markdown
const components: Components = {
  // Titres
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2 flex items-center gap-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2 flex items-center gap-2">
      {children}
    </h3>
  ),

  // Paragraphes
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),

  // Listes
  ul: ({ children }) => (
    <ul className="space-y-2 my-3 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 my-3 ml-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-700 flex items-start gap-2">
      <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),

  // Texte en gras et italique
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-700">{children}</em>
  ),

  // Code inline
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto my-3 font-mono">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },

  // Bloc de code
  pre: ({ children }) => (
    <pre className="my-3">{children}</pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-3 text-gray-700 italic rounded-r-lg">
      {children}
    </blockquote>
  ),

  // Tableau
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50 transition">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{children}</td>
  ),

  // Ligne horizontale
  hr: () => <hr className="my-6 border-gray-200" />,

  // Liens
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}
